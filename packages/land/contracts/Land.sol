// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {OperatorFiltererUpgradeable} from "./common/OperatorFiltererUpgradeable.sol";
import {SuperOperators} from "./common/SuperOperators.sol";
import {ERC721BaseToken} from "./common/ERC721BaseToken.sol";
import {WithAdmin} from "./common/WithAdmin.sol";
import {LandBaseTokenV3} from "./mainnet/LandBaseTokenV3.sol";
import {MetaTransactionReceiverV2} from "./mainnet/MetaTransactionReceiverV2.sol";
import {LandStorageMixin} from "./mainnet/LandStorageMixin.sol";

/**
 * @title LandV3
 * @author The Sandbox
 * @notice LAND contract
 * @dev LAND contract implements ERC721, quad and marketplace filtering functionalities
 * @dev LandStorageMixin must be the first base class, it has a gap that moves everything (just in case)
 */
contract Land is LandStorageMixin, LandBaseTokenV3, OperatorFiltererUpgradeable {
    event OperatorRegistrySet(address indexed registry);

    /**
     * @notice Initializes the contract with the meta-transaction contract & admin
     * @param admin Admin of the contract
     */
    function initialize(address admin) public initializer {
        // We must be able to initialize the admin if this is a fresh deploy, but we want to
        // be backward compatible with the current deployment
        require($getAdmin() == address(0), "already initialized");
        $setAdmin(admin);
        emit AdminChanged(address(0), admin);
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

    /**
     * @notice Return the URI of a specific token
     * @param id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory) {
        require(_ownerOf(id) != address(0), "LandV3: Id does not exist");
        return string(abi.encodePacked("https://api.sandbox.game/lands/", Strings.toString(id), "/metadata.json"));
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * 0x5b5e139f is ERC-721 metadata
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) external pure override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        require(subscriptionOrRegistrantToCopy != address(0), "can't be zero address");
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    /// @dev TODO: add an internal func
    function setOperatorRegistry(address registry) external virtual onlyAdmin {
        $setOperatorFilterRegistry(registry);
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

    function _msgSender() internal view override returns (address) {
        return msg.sender;
    }

    function $superOperators()
        internal
        view
        override(LandStorageMixin, SuperOperators)
        returns (mapping(address => bool) storage)
    {
        return LandStorageMixin.$superOperators();
    }

    function $metaTransactionContracts()
        internal
        view
        override(LandStorageMixin, MetaTransactionReceiverV2)
        returns (mapping(address => bool) storage)
    {
        return LandStorageMixin.$metaTransactionContracts();
    }

    function $numNFTPerAddress()
        internal
        view
        override(LandStorageMixin, ERC721BaseToken)
        returns (mapping(address => uint256) storage)
    {
        return LandStorageMixin.$numNFTPerAddress();
    }

    function $owners()
        internal
        view
        override(LandStorageMixin, ERC721BaseToken)
        returns (mapping(uint256 => uint256) storage)
    {
        return LandStorageMixin.$owners();
    }

    function $operators()
        internal
        view
        override(LandStorageMixin, ERC721BaseToken)
        returns (mapping(uint256 => address) storage)
    {
        return LandStorageMixin.$operators();
    }

    function $operatorsForAll()
        internal
        view
        override(LandStorageMixin, ERC721BaseToken)
        returns (mapping(address => mapping(address => bool)) storage)
    {
        return LandStorageMixin.$operatorsForAll();
    }

    function $getAdmin() internal view override(LandStorageMixin, WithAdmin) returns (address) {
        return LandStorageMixin.$getAdmin();
    }

    function $setAdmin(address a) internal override(LandStorageMixin, WithAdmin) {
        LandStorageMixin.$setAdmin(a);
    }

    function $getOperatorFilterRegistry()
        internal
        view
        override(LandStorageMixin, OperatorFiltererUpgradeable)
        returns (address a)
    {
        return LandStorageMixin.$getOperatorFilterRegistry();
    }

    function $setOperatorFilterRegistry(address a) internal override {
        LandStorageMixin.$setOperatorFilterRegistry(a);
    }

    function $minters()
        internal
        view
        override(LandStorageMixin, LandBaseTokenV3)
        returns (mapping(address => bool) storage)
    {
        return LandStorageMixin.$minters();
    }
}
