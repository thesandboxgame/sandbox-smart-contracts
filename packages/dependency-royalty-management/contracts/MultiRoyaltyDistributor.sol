// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IMultiRoyaltyDistributor, IMultiRoyaltyRecipients} from "./interfaces/IMultiRoyaltyDistributor.sol";
import {
    IRoyaltySplitter,
    IERC165
} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {IEIP2981} from "@manifoldxyz/royalty-registry-solidity/contracts/specs/IEIP2981.sol";
import {IRoyaltyManager, Recipient} from "./interfaces/IRoyaltyManager.sol";

/// @title MultiRoyaltyDistributer
/// @author The Sandbox
/// @dev  The MultiRoyaltyDistributer contract implements the ERC-2981 and ERC-165 interfaces for a royalty payment system. This payment system can be used to pay royalties to multiple recipients through splitters.
/// @dev  This contract calls to the Royalties manager contract to deploy RoyaltySplitter for a creator to slip its royalty between the creator and Sandbox and use it for every token minted by that creator.
abstract contract MultiRoyaltyDistributor is IEIP2981, IMultiRoyaltyDistributor, ERC165Upgradeable {
    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    address private royaltyManager;

    mapping(uint256 => address payable) private _tokenRoyaltiesSplitter;
    uint256[] private _tokensWithRoyalties;

    // solhint-disable-next-line func-name-mixedcase
    function __MultiRoyaltyDistributor_init(address _royaltyManager) internal {
        royaltyManager = _royaltyManager;
    }

    /// @notice EIP 165 interface function
    /// @dev used to check the interface implemented
    /// @param interfaceId to be checked for implementation
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IEIP2981).interfaceId ||
            interfaceId == type(IMultiRoyaltyDistributor).interfaceId ||
            interfaceId == type(IMultiRoyaltyRecipients).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice sets token royalty
    /// @dev deploys a splitter if a creator doesn't have one
    /// @param tokenId id of token
    /// @param creator of the token
    function _setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) internal {
        address payable creatorSplitterAddress = IRoyaltyManager(royaltyManager).deploySplitter(creator, recipient);

        if (_tokenRoyaltiesSplitter[tokenId] != address(0)) {
            if (_tokenRoyaltiesSplitter[tokenId] != creatorSplitterAddress) {
                _setTokenRoyaltiesSplitter(tokenId, creatorSplitterAddress);
            }
        } else {
            _tokensWithRoyalties.push(tokenId);
            _setTokenRoyaltiesSplitter(tokenId, creatorSplitterAddress);
        }
        emit TokenRoyaltySet(tokenId, recipient);
    }

    /// @notice Returns royalty receivers and their split of royalty for each token
    /// @return royaltyConfigs receivers and their split array as long as the number of tokens.
    function getTokenRoyalties() external view override returns (TokenRoyaltyConfig[] memory royaltyConfigs) {
        royaltyConfigs = new TokenRoyaltyConfig[](_tokensWithRoyalties.length);
        for (uint256 i; i < _tokensWithRoyalties.length; ++i) {
            TokenRoyaltyConfig memory royaltyConfig;
            uint256 tokenId = _tokensWithRoyalties[i];
            address splitterAddress = _tokenRoyaltiesSplitter[tokenId];
            if (splitterAddress != address(0)) {
                royaltyConfig.recipients = IRoyaltySplitter(splitterAddress).getRecipients();
            }
            royaltyConfig.tokenId = tokenId;
            royaltyConfigs[i] = royaltyConfig;
        }
    }

    /// @notice EIP 2981 royalty info function to return the royalty receiver and royalty amount
    /// @param tokenId of the token for which the royalty is needed to be distributed
    /// @param value the amount on which the royalty is calculated
    /// @return address the royalty receiver
    /// @return value the EIP2981 royalty
    function royaltyInfo(uint256 tokenId, uint256 value) public view override returns (address, uint256) {
        (address payable _defaultRoyaltyReceiver, uint16 _defaultRoyaltyBPS) =
            IRoyaltyManager(royaltyManager).getRoyaltyInfo();
        if (_tokenRoyaltiesSplitter[tokenId] != address(0)) {
            return (_tokenRoyaltiesSplitter[tokenId], (value * _defaultRoyaltyBPS) / TOTAL_BASIS_POINTS);
        }
        if (_defaultRoyaltyReceiver != address(0) && _defaultRoyaltyBPS != 0) {
            return (_defaultRoyaltyReceiver, (value * _defaultRoyaltyBPS) / TOTAL_BASIS_POINTS);
        }
        return (address(0), 0);
    }

    /// @notice returns the EIP-2981 royalty receiver for each token (i.e. splitters) including the default royalty receiver.
    /// @return splits the royalty receiver's array
    function getAllSplits() external view override returns (address payable[] memory splits) {
        uint256 startingIndex;
        uint256 endingIndex = _tokensWithRoyalties.length;
        (address payable _defaultRoyaltyReceiver, ) = IRoyaltyManager(royaltyManager).getRoyaltyInfo();
        if (_defaultRoyaltyReceiver != address(0)) {
            splits = new address payable[](1 + _tokensWithRoyalties.length);
            splits[0] = _defaultRoyaltyReceiver;
            startingIndex = 1;
            ++endingIndex;
        } else {
            // unreachable in practice
            splits = new address payable[](_tokensWithRoyalties.length);
        }
        for (uint256 i = startingIndex; i < endingIndex; ++i) {
            splits[i] = _tokenRoyaltiesSplitter[_tokensWithRoyalties[i - startingIndex]];
        }
    }

    /// @notice returns the royalty recipients for each tokenId.
    /// @dev returns the default address for tokens with no recipients.
    /// @param tokenId is the token id for which the recipient should be returned.
    /// @return addresses of royalty recipient of the token.
    function getRecipients(uint256 tokenId) public view returns (Recipient[] memory) {
        address payable splitterAddress = _tokenRoyaltiesSplitter[tokenId];
        (address payable _defaultRoyaltyReceiver, ) = IRoyaltyManager(royaltyManager).getRoyaltyInfo();
        if (splitterAddress != address(0)) {
            return IRoyaltySplitter(splitterAddress).getRecipients();
        }
        Recipient[] memory defaultRecipient = new Recipient[](1);
        defaultRecipient[0] = Recipient({recipient: _defaultRoyaltyReceiver, bps: TOTAL_BASIS_POINTS});
        return defaultRecipient;
    }

    /// @notice internal function to set the token royalty splitter
    /// @param tokenId id of token
    /// @param splitterAddress address of the splitter contract
    function _setTokenRoyaltiesSplitter(uint256 tokenId, address payable splitterAddress) internal {
        _tokenRoyaltiesSplitter[tokenId] = splitterAddress;
        emit TokenRoyaltySplitterSet(tokenId, splitterAddress);
    }

    /// @notice returns the address of token royalty splitter.
    /// @param tokenId is the token id for which royalty splitter should be returned.
    /// @return address of royalty splitter for the token.
    function getTokenRoyaltiesSplitter(uint256 tokenId) external view returns (address payable) {
        return _tokenRoyaltiesSplitter[tokenId];
    }

    /// @notice returns the address of royalty manager.
    /// @return address of royalty manager.
    function getRoyaltyManager() external view returns (address) {
        return royaltyManager;
    }
}
