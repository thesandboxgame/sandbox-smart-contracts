// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IOperatorFilterRegistry} from "./interfaces/IOperatorFilterRegistry.sol";
import {WithMetadataRegistry} from "./common/WithMetadataRegistry.sol";
import {WithRoyalties} from "./common/WithRoyalties.sol";
import {WithOwner} from "./common/WithOwner.sol";
import {PolygonLandBase} from "./polygon/PolygonLandBase.sol";

/// @title LAND token on L2
/// @author The Sandbox
/// @notice LAND contract
/// @dev LAND contract implements ERC721, quad and marketplace filtering functionalities
/// @dev LandBase must be the first contract in the inheritance list so we keep the storage slot backward compatible
contract PolygonLand is PolygonLandBase, WithMetadataRegistry, WithRoyalties, WithOwner {
    event OperatorRegistrySet(IOperatorFilterRegistry indexed registry);

    /**
     * @notice Initializes the contract with the trustedForwarder, admin & royalty-manager
     * @param admin Admin of the contract
     */
    function initialize(address admin) external initializer {
        // We must be able to initialize the admin if this is a fresh deploy, but we want to
        // be backward compatible with the current deployment
        require(_getAdmin() == address(0), "already initialized");
        _changeAdmin(admin);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _trustedForwarder = trustedForwarder;
        emit TrustedForwarderSet(trustedForwarder);
    }

    /// @notice set royalty manager
    /// @param royaltyManager address of the manager contract for common royalty recipient
    function setRoyaltyManager(address royaltyManager) external onlyAdmin {
        _setRoyaltyManager(royaltyManager);
    }

    /// @notice sets address of the Metadata Registry
    /// @param metadataRegistry The address of the rMetadata Registry
    function setMetadataRegistry(address metadataRegistry) external onlyAdmin {
        _setMetadataRegistry(metadataRegistry);
    }

    /// @notice Set the address of the new owner of the contract
    /// @param newOwner address of new owner
    function transferOwnership(address newOwner) external onlyAdmin {
        _transferOwnership(newOwner);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.
    /// @dev can only be called by admin.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription 'true' or to copy the list 'false'.
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        require(subscriptionOrRegistrantToCopy != address(0), "subscription can't be zero");
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(IOperatorFilterRegistry registry) external virtual onlyAdmin {
        _setOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param tokenId The id of the token
     */
    function approveFor(
        address sender,
        address operator,
        uint256 tokenId
    ) external override onlyAllowedOperatorApproval(operator) {
        _approveFor(sender, operator, tokenId);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param operator The address receiving the approval
     * @param tokenId The id of the token
     */
    function approve(address operator, uint256 tokenId) external override onlyAllowedOperatorApproval(operator) {
        _approveFor(_msgSender(), operator, tokenId);
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param tokenId The id of the token
     * @dev we decided to use safeTransferFrom even for this method as a security measure
     */
    function transferFrom(address from, address to, uint256 tokenId) external override onlyAllowedOperator(from) {
        _transferFrom(from, to, tokenId);
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param tokenId The id of the token
     * @param data Additional data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) external override onlyAllowedOperator(from) {
        _safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param tokenId The id of the token
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external override onlyAllowedOperator(from) {
        _safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(
        address operator,
        bool approved
    ) external override onlyAllowedOperatorApproval(operator) {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external override onlyAllowedOperatorApproval(operator) {
        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * 0x5b5e139f is ERC-721 metadata
     * 0x7f5828d0 is ERC-173
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) public pure override returns (bool) {
        return
            id == 0x01ffc9a7 ||
            id == 0x80ac58cd ||
            id == 0x5b5e139f ||
            id == 0x7f5828d0 ||
            id == type(IERC2981).interfaceId;
    }
}
