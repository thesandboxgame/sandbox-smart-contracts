// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {
    IEIP2981MultiReceiverRoyaltyOverride
} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IMultiReceiverRoyaltyOverride.sol";
import {IMultiRoyaltyDistributer} from "./interfaces/IMultiRoyaltyDistributer.sol";
import {
    IRoyaltySplitter,
    IERC165
} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import {IEIP2981} from "@manifoldxyz/royalty-registry-solidity/contracts/specs/IEIP2981.sol";
import {IRoyaltyManager, Recipient} from "./interfaces/IRoyaltyManager.sol";

/// @title MultiRoyaltyDistributer
/// @author The sandbox
/// @dev import for Token contracts EIP3981 Royalty distribution and split for sandbox and the creator using splitters.
abstract contract MultiRoyaltyDistributer is IEIP2981, IMultiRoyaltyDistributer, ERC165Upgradeable {
    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    uint16 public _defaultRoyaltyBPS;
    address payable public _defaultRoyaltyReceiver;
    address public royaltyManager;

    mapping(uint256 => address payable) public _tokenRoyaltiesSplitter;
    uint256[] private _tokensWithRoyalties;

    function __MultiRoyaltyDistributer_init(
        address payable defaultRecipient,
        uint16 defaultBps,
        address _royaltyManager
    ) internal {
        _defaultRoyaltyReceiver = defaultRecipient;
        _defaultRoyaltyBPS = defaultBps;
        royaltyManager = _royaltyManager;
    }

    /// @notice EIP 165 interface funtion
    /// @dev used to check interface implemented
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
            interfaceId == type(IEIP2981MultiReceiverRoyaltyOverride).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /// @notice sets token royalty
    /// @dev deploys a splitter if creator doen't have one
    /// @param tokenId id of token
    /// @param royaltyBPS the bps of for EIP2981 royalty
    /// @param creator of the token
    function _setTokenRoyalties(
        uint256 tokenId,
        uint16 royaltyBPS,
        address payable recipient,
        address creator
    ) internal {
        require(royaltyBPS < TOTAL_BASIS_POINTS, "Invalid bps");
        address payable creatorSplitterAddress = IRoyaltyManager(royaltyManager).deploySplitter(creator, recipient);
        _tokenRoyaltiesSplitter[tokenId] = creatorSplitterAddress;
        _tokensWithRoyalties.push(tokenId);
        emit TokenRoyaltySet(tokenId, royaltyBPS, recipient);
    }

    /**
     * @dev Sets default royalty. When you override this in the implementation contract
     * ensure that you access restrict it to the contract owner or admin
     */
    function _setDefaultRoyaltyBps(uint16 bps) internal {
        require(bps < TOTAL_BASIS_POINTS, "Invalid bps");
        _defaultRoyaltyBPS = bps;
        emit DefaultRoyaltyBpsSet(bps);
    }

    /**
     * @dev Sets default royalty. When you override this in the implementation contract
     * ensure that you access restrict it to the contract owner or admin
     */
    function _setDefaultRoyaltyReceiver(address payable defaultReceiver) internal {
        require(defaultReceiver != address(0), "Default receiver can't be zero");
        _defaultRoyaltyReceiver = defaultReceiver;
        emit DefaultRoyaltyReceiverSet(defaultReceiver);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getTokenRoyalties}.
     */
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

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getDefaultRoyalty}.
     */
    function getDefaultRoyalty() external view override returns (uint16 bps, Recipient[] memory recipients) {
        recipients[0] = Recipient({recipient: _defaultRoyaltyReceiver, bps: _defaultRoyaltyBPS});
        return (_defaultRoyaltyBPS, recipients);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-royaltyInfo}.
     */
    function royaltyInfo(uint256 tokenId, uint256 value) public view override returns (address, uint256) {
        if (_tokenRoyaltiesSplitter[tokenId] != address(0)) {
            return (_tokenRoyaltiesSplitter[tokenId], (value * _defaultRoyaltyBPS) / TOTAL_BASIS_POINTS);
        }
        if (_defaultRoyaltyReceiver != address(0) && _defaultRoyaltyBPS != 0) {
            return (_defaultRoyaltyReceiver, (value * _defaultRoyaltyBPS) / TOTAL_BASIS_POINTS);
        }
        return (address(0), 0);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getAllSplits}.
     */
    function getAllSplits() external view override returns (address payable[] memory splits) {
        uint256 startingIndex;
        uint256 endingIndex = _tokensWithRoyalties.length;
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

    /**
     * @dev gets the royalty recipients for the given token Id
     * */
    function getRecipients(uint256 tokenId) public view returns (Recipient[] memory) {
        address payable splitterAddress = _tokenRoyaltiesSplitter[tokenId];
        if (splitterAddress != address(0)) {
            return IRoyaltySplitter(splitterAddress).getRecipients();
        }
        Recipient[] memory defaultRecipient = new Recipient[](1);
        defaultRecipient[0] = Recipient({recipient: _defaultRoyaltyReceiver, bps: TOTAL_BASIS_POINTS});
        return defaultRecipient;
    }
}
