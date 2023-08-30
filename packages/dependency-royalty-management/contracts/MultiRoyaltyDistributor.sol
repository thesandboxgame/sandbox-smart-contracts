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
    function __MultiRoyaltyDistributor_init(address _royaltyManager) internal onlyInitializing {
        _setRoyaltyManager(_royaltyManager);
        __ERC165_init_unchained();
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param interfaceId the interface identifier, as specified in ERC-165.
    /// @return isSupported `true` if the contract implements `id`.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, IERC165)
        returns (bool isSupported)
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
    /// @param recipient royalty recipient
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
    }

    /// @notice EIP 2981 royalty info function to return the royalty receiver and royalty amount
    /// @param tokenId of the token for which the royalty is needed to be distributed
    /// @param value the amount on which the royalty is calculated
    /// @return receiver address the royalty receiver
    /// @return royaltyAmount value the EIP2981 royalty
    function royaltyInfo(uint256 tokenId, uint256 value)
        public
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
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
    /// @return recipients array of royalty recipients for the token
    function getRecipients(uint256 tokenId) public view returns (Recipient[] memory recipients) {
        address payable splitterAddress = _tokenRoyaltiesSplitter[tokenId];
        (address payable _defaultRoyaltyReceiver, ) = IRoyaltyManager(royaltyManager).getRoyaltyInfo();
        if (splitterAddress != address(0)) {
            return IRoyaltySplitter(splitterAddress).getRecipients();
        }
        recipients = new Recipient[](1);
        recipients[0] = Recipient({recipient: _defaultRoyaltyReceiver, bps: TOTAL_BASIS_POINTS});
        return recipients;
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
    /// @return splitterAddress address of royalty splitter for the token
    function getTokenRoyaltiesSplitter(uint256 tokenId) external view returns (address payable splitterAddress) {
        return _tokenRoyaltiesSplitter[tokenId];
    }

    /// @notice returns the address of royalty manager.
    /// @return managerAddress address of royalty manager.
    function getRoyaltyManager() external view returns (address managerAddress) {
        return royaltyManager;
    }

    /// @notice set royalty manager address
    /// @param _royaltyManager address of royalty manager to set
    function _setRoyaltyManager(address _royaltyManager) internal {
        royaltyManager = _royaltyManager;
        emit RoyaltyManagerSet(_royaltyManager);
    }

    uint256[47] private __gap;
}
