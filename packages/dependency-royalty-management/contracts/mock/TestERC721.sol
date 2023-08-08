// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {
    ERC721Upgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {MultiRoyaltyDistributor} from "../MultiRoyaltyDistributor.sol";
import {
    ERC2771HandlerUpgradeable,
    ERC2771HandlerAbstract
} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";

contract TestERC721 is ERC721Upgradeable, OwnableUpgradeable, MultiRoyaltyDistributor, ERC2771HandlerUpgradeable {
    /// @notice initiliaze to be called by the proxy
    /// @dev would run once.
    /// @param _manager, the address of the Manager contract for common royalty recipient
    function initialize(address _manager, address trustedForwarder) external initializer {
        __MultiRoyaltyDistributor_init(_manager);
        __Ownable_init();
        __ERC2771Handler_init(trustedForwarder);
    }

    /// @notice function to mint a single ERC721 token
    /// @param to address of the token owner
    /// @param id of the token
    /// @param royaltyRecipient the royalty recipient for the creator
    function mint(
        address to,
        uint256 id,
        address payable royaltyRecipient
    ) external {
        _mint(to, id);
        _setTokenRoyalties(id, royaltyRecipient, msg.sender);
    }

    /// @notice function to mint a batch ERC721 token
    /// @param to address of the token owner
    /// @param ids array of ids the tokens
    /// @param royaltyRecipient the royalty recipient for the creator
    function mintBatch(
        address to,
        uint256[] memory ids,
        address payable royaltyRecipient
    ) external {
        for (uint256 i; i < ids.length; i++) {
            _mint(to, ids[i]);
            _setTokenRoyalties(ids[i], royaltyRecipient, msg.sender);
        }
    }

    /// @notice EIP 165 interface funtion
    /// @dev used to check interface implemented
    /// @param interfaceId to be checked for implementation
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(MultiRoyaltyDistributor, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Not in our use case
    /// @dev Explain to a developer any extra details
    /// @param tokenId a parameter just like in doxygen (must be followed by parameter name)
    /// @param recipient the royalty recipient for the splitter of the creator.
    /// @param creator the creactor of the tokens.
    function setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) external override onlyOwner {
        _setTokenRoyalties(tokenId, recipient, creator);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (address sender)
    {
        return ERC2771HandlerAbstract._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (bytes calldata)
    {
        return ERC2771HandlerAbstract._msgData();
    }
}
