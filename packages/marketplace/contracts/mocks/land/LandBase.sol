// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IOperatorFilterRegistry} from "@sandbox-smart-contracts/land/contracts/interfaces/IOperatorFilterRegistry.sol";
import {IERC173} from "@sandbox-smart-contracts/land/contracts/interfaces/IERC173.sol";
import {ILandToken} from "@sandbox-smart-contracts/land/contracts/interfaces/ILandToken.sol";
import {IQuad} from "@sandbox-smart-contracts/land/contracts/interfaces/IQuad.sol";
import {ILandMetadataRegistry} from "@sandbox-smart-contracts/land/contracts/interfaces/ILandMetadataRegistry.sol";
import {IERC721BatchOps} from "@sandbox-smart-contracts/land/contracts/interfaces/IERC721BatchOps.sol";
import {WithAdmin} from "./WithAdmin.sol";
import {OperatorFiltererUpgradeable} from "@sandbox-smart-contracts/land/contracts/common/OperatorFiltererUpgradeable.sol";
import {WithMetadataRegistry} from "./WithMetadataRegistry.sol";
import {WithRoyalties} from "@sandbox-smart-contracts/land/contracts/common/WithRoyalties.sol";
import {WithOwner} from "@sandbox-smart-contracts/land/contracts/common/WithOwner.sol";
import {LandBaseToken} from "./LandBaseToken.sol";

/// @title Land Contract
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice LAND contract
/// @dev LAND contract implements ERC721, quads, metadata, royalties and marketplace filtering functionalities.
/// @dev The contract also implements EIP173 because it is needed by some marketplaces. The owner() doesn't have
/// @dev any privileged roles within the contract. It can be set by the admin to any value.
abstract contract LandBase is
    LandBaseToken,
    Initializable,
    OperatorFiltererUpgradeable,
    WithAdmin,
    WithMetadataRegistry,
    WithRoyalties,
    WithOwner
{
    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract admin
    /// @param admin Admin of the contract
    function initialize(address admin) external initializer {
        _setAdmin(admin);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription 'true' or to copy the list 'false'.
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        if (subscriptionOrRegistrantToCopy == address(0)) {
            revert InvalidAddress();
        }
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice Change the admin of the contract
    /// @dev Change the administrator to be `newAdmin`.
    /// @param newAdmin The address of the new administrator.
    function changeAdmin(address newAdmin) external onlyAdmin {
        _changeAdmin(newAdmin);
    }

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        _setSuperOperator(superOperator, enabled);
    }

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external onlyAdmin {
        _setMinter(minter, enabled);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(IOperatorFilterRegistry registry) external virtual onlyAdmin {
        _setOperatorRegistry(registry);
    }

    /// @notice set royalty manager
    /// @param royaltyManager address of the manager contract for common royalty recipient
    function setRoyaltyManager(address royaltyManager) external onlyAdmin {
        _setRoyaltyManager(royaltyManager);
    }

    /// @notice sets address of the Metadata Registry
    /// @param metadataRegistry The address of the Metadata Registry
    function setMetadataRegistry(address metadataRegistry) external onlyAdmin {
        _setMetadataRegistry(metadataRegistry);
    }

    /// @notice Set the address of the new owner of the contract
    /// @param newOwner address of new owner
    /// @dev This owner doesn't have any privileged role within this contract
    /// @dev It is set by the admin to comply with EIP173 which is needed by some marketplaces
    /// @dev Even when set to address(0) ownership is never permanently renounced the admin can always set any value
    function transferOwnership(address newOwner) external onlyAdmin {
        _transferOwnership(newOwner);
    }

    /// @notice Approve an operator to spend tokens on the sender behalf
    /// @param sender The address giving the approval
    /// @param operator The address receiving the approval
    /// @param tokenId The id of the token
    function approveFor(
        address sender,
        address operator,
        uint256 tokenId
    ) external onlyAllowedOperatorApproval(operator) {
        _approveFor(sender, operator, tokenId);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the msgSender
    /// @param operator The address receiving the approval
    /// @param approved The determination of the approval
    function setApprovalForAll(
        address operator,
        bool approved
    ) external override onlyAllowedOperatorApproval(operator) {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender (may differ from msgSender)
    /// @param sender The address giving the approval
    /// @param operator The address receiving the approval
    /// @param approved The determination of the approval
    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external onlyAllowedOperatorApproval(operator) {
        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice Approve an operator to spend tokens on the sender behalf
    /// @param operator The address receiving the approval
    /// @param tokenId The id of the token
    function approve(address operator, uint256 tokenId) external override onlyAllowedOperatorApproval(operator) {
        _approveFor(_msgSender(), operator, tokenId);
    }

    /// @notice Transfer a token between 2 addresses
    /// @param from The sender of the token
    /// @param to The recipient of the token
    /// @param tokenId The id of the token
    function transferFrom(address from, address to, uint256 tokenId) external override onlyAllowedOperator(from) {
        _transferFrom(from, to, tokenId);
    }

    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual override onlyAllowedOperator(from) {
        _batchTransferFrom(from, to, ids, data, false);
    }

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer
    /// @param from The sender of the token
    /// @param to The recipient of the token
    /// @param tokenId The id of the token
    function safeTransferFrom(address from, address to, uint256 tokenId) external override onlyAllowedOperator(from) {
        _safeTransferFrom(from, to, tokenId, "");
    }

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer
    /// @param from The sender of the token
    /// @param to The recipient of the token
    /// @param tokenId The id of the token
    /// @param data Additional data
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) external override onlyAllowedOperator(from) {
        _safeTransferFrom(from, to, tokenId, data);
    }

    /// @notice Transfer many tokens between 2 addresses, while
    /// ensuring the receiving contract has a receiver method.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual onlyAllowedOperator(from) {
        _batchTransferFrom(from, to, ids, data, true);
    }

    /// @notice Check if the contract supports an interface
    /// @param interfaceId The id of the interface
    /// @return True if the interface is supported
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721BatchOps).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC173).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(ILandToken).interfaceId ||
            interfaceId == type(ILandToken).interfaceId ^ type(IQuad).interfaceId ||
            interfaceId == type(IQuad).interfaceId ||
            interfaceId == type(ILandMetadataRegistry).interfaceId;
    }
}
