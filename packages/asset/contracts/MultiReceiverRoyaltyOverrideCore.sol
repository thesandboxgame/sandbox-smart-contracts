// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @author: manifold.xyz

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IMultiReceiverRoyaltyOverride.sol";
import "./CustomSplitter.sol";
import "./interfaces/IMultiReceiverRoyaltyOverrideCore.sol";
import "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";
import "@manifoldxyz/royalty-registry-solidity/contracts/specs/IEIP2981.sol";
import "./interfaces/IManager.sol";

/// @title MultiReceiverRoyaltyOverrideCore
/// @dev import for the Test ERC1155 Contract for Royalty distribution.
abstract contract MultiReceiverRoyaltyOverrideCore is
    IEIP2981,
    IMultiReceiverRoyaltyOverrideCore,
    ERC165
{
    uint16 internal constant Total_BASIS_POINTS = 10000;
    uint16 public _defaultRoyaltyBPS;
    address payable public _defaultRoyaltyReceiver;
    address manager;

    mapping(uint256 => address payable) public _tokenRoyaltiesSplitter;
    uint256[] private _tokensWithRoyalties;

    /// @notice EIP 165 interface funtion
    /// @dev used to check interface implemented
    /// @param interfaceId to be checked for implementation
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IEIP2981).interfaceId ||
            interfaceId ==
            type(IEIP2981MultiReceiverRoyaltyOverride).interfaceId ||
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
        require(royaltyBPS < 10000, "Invalid bps");
        address payable creatorSplitterAddress = IManager(manager)
            .deploySplitter(creator, recipient);
        _tokenRoyaltiesSplitter[tokenId] = creatorSplitterAddress;
        _tokensWithRoyalties.push(tokenId);
        emit TokenRoyaltySet(tokenId, royaltyBPS, recipient);
    }

    /**
     * @dev Sets default royalty. When you override this in the implementation contract
     * ensure that you access restrict it to the contract owner or admin
     */
    function _setDefaultRoyaltyBps(uint16 bps) internal {
        require(bps < 10000, "Invalid bps");
        _defaultRoyaltyBPS = bps;
        emit DefaultRoyaltyBpsSet(bps);
    }

    /**
     * @dev Sets default royalty. When you override this in the implementation contract
     * ensure that you access restrict it to the contract owner or admin
     */
    function _setDefaultRoyaltyReceiver(
        address payable defaultReceiver
    ) internal {
        require(
            defaultReceiver != address(0),
            "Default receiver can't be zero"
        );
        _defaultRoyaltyReceiver = defaultReceiver;
        emit DefaultRoyaltyReceiverSet(defaultReceiver);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getTokenRoyalties}.
     */
    function getTokenRoyalties()
        external
        view
        override
        returns (TokenRoyaltyConfig[] memory royaltyConfigs)
    {
        royaltyConfigs = new TokenRoyaltyConfig[](_tokensWithRoyalties.length);
        for (uint256 i; i < _tokensWithRoyalties.length; ++i) {
            TokenRoyaltyConfig memory royaltyConfig;
            uint256 tokenId = _tokensWithRoyalties[i];
            address splitterAddress = _tokenRoyaltiesSplitter[tokenId];
            if (splitterAddress != address(0)) {
                royaltyConfig.recipients = IRoyaltySplitter(splitterAddress)
                    .getRecipients();
            }
            royaltyConfig.tokenId = tokenId;
            royaltyConfigs[i] = royaltyConfig;
        }
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getDefaultRoyalty}.
     */
    function getDefaultRoyalty()
        external
        view
        override
        returns (uint16 bps, Recipient[] memory recipients)
    {
        recipients[0] = Recipient({
            recipient: _defaultRoyaltyReceiver,
            bps: _defaultRoyaltyBPS
        });
        return (_defaultRoyaltyBPS, recipients);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-royaltyInfo}.
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 value
    ) public view override returns (address, uint256) {
        if (_tokenRoyaltiesSplitter[tokenId] != address(0)) {
            return (
                _tokenRoyaltiesSplitter[tokenId],
                (value * _defaultRoyaltyBPS) / Total_BASIS_POINTS
            );
        }
        if (_defaultRoyaltyReceiver != address(0) && _defaultRoyaltyBPS != 0) {
            return (
                _defaultRoyaltyReceiver,
                (value * _defaultRoyaltyBPS) / Total_BASIS_POINTS
            );
        }
        return (address(0), 0);
    }

    /**
     * @dev See {IEIP2981MultiReceiverRoyaltyOverride-getAllSplits}.
     */
    function getAllSplits()
        external
        view
        override
        returns (address payable[] memory splits)
    {
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
            splits[i] = _tokenRoyaltiesSplitter[
                _tokensWithRoyalties[i - startingIndex]
            ];
        }
    }

    /**
     * @dev gets the royalty recipients for the given token Id
     * */
    function getRecipients(
        uint256 tokenId
    ) public view returns (Recipient[] memory) {
        address payable splitterAddress = _tokenRoyaltiesSplitter[tokenId];
        if (splitterAddress != address(0)) {
            return IRoyaltySplitter(splitterAddress).getRecipients();
        }
        Recipient[] memory defaultRecipient = new Recipient[](1);
        defaultRecipient[0] = Recipient({
            recipient: _defaultRoyaltyReceiver,
            bps: Total_BASIS_POINTS
        });
        return defaultRecipient;
    }
}
