// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.23;

import {LandBaseToken} from "./mainnet/LandBaseToken.sol";
import {ERC721BaseToken} from "./mainnet/ERC721BaseToken.sol";
import {OperatorFiltererUpgradeable} from "./mainnet/OperatorFiltererUpgradeable.sol";
import {RoyaltyDistributorV2} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/RoyaltyDistributorV2.sol";
import {IOperatorFilterRegistry} from "./mainnet/IOperatorFilterRegistry.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

/**
 * @title Land Contract
 * @author The Sandbox
 * @notice LAND contract
 * @dev LAND contract implements ERC721, quad and marketplace filtering functionalities
 */
contract Land is LandBaseToken, OperatorFiltererUpgradeable, RoyaltyDistributorV2 {
    bool internal _initV4;

    event OperatorRegistrySet(address indexed registry);

    modifier initializerV4() {
        require(!_initV4, "already initialized");
        _;
    }

    /**
     * @notice Initializes the upgrade to version 4
     * @param _royaltyManager address of the manager contract for common royalty recipient
     */
    function initializeV4(
        address metaTransactionContract,
        address admin,
        address _royaltyManager
    ) public initializerV4 {
        _admin = admin;
        _setMetaTransactionProcessor(metaTransactionContract, true);
        _setRoyaltyManager(_royaltyManager);
        _initV4 = true;
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
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) public pure override(ERC721BaseToken, RoyaltyDistributorV2) returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f || id == type(IERC2981Upgradeable).interfaceId;
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
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function safeTransferFrom(address from, address to, uint256 id) external override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id, "");
    }
}
