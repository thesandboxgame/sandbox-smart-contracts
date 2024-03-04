// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.23;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IRoyaltyManager} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyManager.sol";
import {IOperatorFilterRegistry} from "./common/IOperatorFilterRegistry.sol";
import {LandBaseToken} from "./mainnet/LandBaseToken.sol";
import {ERC721BaseToken} from "./mainnet/ERC721BaseToken.sol";
import {OperatorFiltererUpgradeable} from "./mainnet/OperatorFiltererUpgradeable.sol";
import {LandStorageMixin} from "./mainnet/LandStorageMixin.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Land Contract
 * @author The Sandbox
 * @notice LAND contract
 * @dev LAND contract implements ERC721, quad and marketplace filtering functionalities
 */
contract Land is LandStorageMixin, LandBaseToken, OperatorFiltererUpgradeable, Initializable {
    uint16 internal constant TOTAL_BASIS_POINTS = 10000;

    IRoyaltyManager private _royaltyManager;
    address private _owner;
    address private _metadataRegistry;

    event OperatorRegistrySet(address indexed registry);
    event RoyaltyManagerSet(address indexed royaltyManager);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MetadataRegistrySet(address indexed metadataRegistry);

    /**
     * @notice Initializes the contract with the admin
     * @param admin Admin of the contract
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "invalid admin");
        require(_admin == address(0), "already initialized");
        _admin = admin;
        emit AdminChanged(address(0), _admin);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        require(subscriptionOrRegistrantToCopy != address(0), "subscription can't be zero");
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external onlyAdmin {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
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
    function transferOwnership(address newOwner) external onlyAdmin {
        _transferOwnership(newOwner);
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function safeTransferFrom(address from, address to, uint256 id) external override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id, "");
    }

    /// @notice Returns how much royalty is owed and to whom based on ERC2981
    /// @dev tokenId is one of the EIP2981 args for this function can't be removed
    /// @param _salePrice the price of token on which the royalty is calculated
    /// @return receiver the receiver of royalty
    /// @return royaltyAmount the amount of royalty
    function royaltyInfo(
        uint256 /*_tokenId */,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        uint16 royaltyBps;
        (receiver, royaltyBps) = _royaltyManager.getRoyaltyInfo();
        royaltyAmount = (_salePrice * royaltyBps) / TOTAL_BASIS_POINTS;
        return (receiver, royaltyAmount);
    }

    /// @notice returns the royalty manager
    /// @return royaltyManagerAddress of royalty manager contract.
    function getRoyaltyManager() external view returns (IRoyaltyManager royaltyManagerAddress) {
        return _royaltyManager;
    }

    /// @notice Get the address of the owner
    /// @return ownerAddress The address of the owner.
    function owner() external view returns (address ownerAddress) {
        return _owner;
    }

    /**
     * @notice Return the name of the token contract
     * @return The name of the token contract
     */
    function name() external pure returns (string memory) {
        return "Sandbox's LANDs";
    }

    /**
     * @notice Return the symbol of the token contract
     * @return The symbol of the token contract
     */
    function symbol() external pure returns (string memory) {
        return "LAND";
    }

    /// @notice Get the address of the Metadata Registry
    /// @return metadataRegistry The address of the Metadata Registry
    function getMetadataRegistry() external view returns (address metadataRegistry) {
        return _metadataRegistry;
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approveFor(
        address sender,
        address operator,
        uint256 id
    ) public override onlyAllowedOperatorApproval(operator) {
        super.approveFor(sender, operator, id);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
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
    ) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAllFor(sender, operator, approved);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approve(address operator, uint256 id) public override onlyAllowedOperatorApproval(operator) {
        super.approve(operator, id);
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function transferFrom(address from, address to, uint256 id) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, id);
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     * @param data Additional data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id, data);
    }

    /**
     * @notice Return the URI of a specific token
     * @param id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory) {
        require(_ownerOf(id) != address(0), "Land: Id does not exist");
        return string(abi.encodePacked("https://api.sandbox.game/lands/", uint2str(id), "/metadata.json"));
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
    function supportsInterface(bytes4 id) public pure override(ERC721BaseToken) returns (bool) {
        return
            id == 0x01ffc9a7 ||
            id == 0x80ac58cd ||
            id == 0x5b5e139f ||
            id == 0x7f5828d0 ||
            id == type(IERC2981Upgradeable).interfaceId;
    }

    function _setRoyaltyManager(address royaltyManager) internal {
        _royaltyManager = IRoyaltyManager(royaltyManager);
        emit RoyaltyManagerSet(royaltyManager);
    }

    function _setMetadataRegistry(address metadataRegistry) internal {
        require(metadataRegistry != address(0), "Invalid registry address");
        _metadataRegistry = metadataRegistry;
        emit MetadataRegistrySet(metadataRegistry);
    }

    function _transferOwnership(address newOwner) internal {
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        while (_i != 0) {
            bstr[--len] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
