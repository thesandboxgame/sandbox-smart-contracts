// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {MultiRoyaltyDistributor} from "../MultiRoyaltyDistributor.sol";

/// @title Test ERC1155 contract
/// @dev Made to test splitter deployment for each creator
/// Creator could change his royalty receiving Wallet for his splitter through setRoyaltyRecipient function
contract TestERC1155 is ERC1155Upgradeable, OwnableUpgradeable, MultiRoyaltyDistributor {
    /// @notice initiliaze to be called by the proxy
    /// @dev would run once.
    /// @param _manager, the address of the Manager contract for common royalty recipient
    function initialize(address _manager) external initializer {
        __MultiRoyaltyDistributor_init(_manager);
        __Ownable_init();
    }

    /// @notice function to mint a single ERC1155 token
    /// @param to address of the token owner
    /// @param id of the token
    /// @param amount of the token to be minted
    /// @param royaltyRecipient the royalty recipient for the creator
    /// @param data for miniting
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        address payable royaltyRecipient,
        bytes memory data
    ) external {
        _mint(to, id, amount, data);
        _setTokenRoyalties(id, royaltyRecipient, msg.sender);
    }

    /// @notice function to mint a batch ERC1155 token
    /// @param to address of the token owner
    /// @param ids array of ids the tokens
    /// @param amounts array of the amounts of tokens to be minted.
    /// @param royaltyRecipient the royalty recipient for the creator
    /// @param data for miniting
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        address payable royaltyRecipient,
        bytes memory data
    ) external {
        _mintBatch(to, ids, amounts, data);
        for (uint256 i; i < ids.length; i++) {
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
        override(MultiRoyaltyDistributor, ERC1155Upgradeable)
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
}
