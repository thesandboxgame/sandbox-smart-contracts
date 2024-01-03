// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {OperatorFiltererUpgradeable} from "./common/OperatorFiltererUpgradeable.sol";
import {SuperOperators} from "./common/SuperOperators.sol";
import {ERC721BaseToken} from "./common/ERC721BaseToken.sol";
import {WithAdmin} from "./common/WithAdmin.sol";
import {PolygonLandBaseTokenV2} from "./polygon/PolygonLandBaseTokenV2.sol";
import {ERC2771Handler} from "./polygon/ERC2771Handler.sol";
import {PolygonLandStorageMixin} from "./polygon/PolygonLandStorageMixin.sol";

/// @title LAND token on L2 (PolygonLandV2)
/// @dev PolygonLandStorageMixin must be the first base class, it has a gap that moves everything (just in case)
contract PolygonLand is PolygonLandStorageMixin, PolygonLandBaseTokenV2, ERC2771Handler, OperatorFiltererUpgradeable {
    using Address for address;

    event OperatorRegistrySet(address indexed registry);

    /**
     * @notice Initializes the contract with the meta-transaction contract & admin
     * @param admin Admin of the contract
     */
    function initialize(address admin) external initializer {
        // We must be able to initialize the admin if this is a fresh deploy, but we want to
        // be backward compatible with the current deployment
        require($getAdmin() == address(0), "already initialized");
        $setAdmin(admin);
        emit AdminChanged(address(0), admin);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _setTrustedForwarder(trustedForwarder);
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
    function safeTransferFrom(address from, address to, uint256 id) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id);
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

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.
    /// @dev can only be called by admin.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription 'true' or to copy the list 'false'.
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        require(subscriptionOrRegistrantToCopy != address(0), "can't be zero address");
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external virtual onlyAdmin {
        $setOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function $superOperators()
        internal
        view
        override(PolygonLandStorageMixin, SuperOperators)
        returns (mapping(address => bool) storage)
    {
        return PolygonLandStorageMixin.$superOperators();
    }

    function $numNFTPerAddress()
        internal
        view
        override(PolygonLandStorageMixin, ERC721BaseToken)
        returns (mapping(address => uint256) storage)
    {
        return PolygonLandStorageMixin.$numNFTPerAddress();
    }

    function $owners()
        internal
        view
        override(PolygonLandStorageMixin, ERC721BaseToken)
        returns (mapping(uint256 => uint256) storage)
    {
        return PolygonLandStorageMixin.$owners();
    }

    function $operators()
        internal
        view
        override(PolygonLandStorageMixin, ERC721BaseToken)
        returns (mapping(uint256 => address) storage)
    {
        return PolygonLandStorageMixin.$operators();
    }

    function $operatorsForAll()
        internal
        view
        override(PolygonLandStorageMixin, ERC721BaseToken)
        returns (mapping(address => mapping(address => bool)) storage)
    {
        return PolygonLandStorageMixin.$operatorsForAll();
    }

    function $getAdmin() internal view override(PolygonLandStorageMixin, WithAdmin) returns (address) {
        return PolygonLandStorageMixin.$getAdmin();
    }

    function $setAdmin(address a) internal override(PolygonLandStorageMixin, WithAdmin) {
        PolygonLandStorageMixin.$setAdmin(a);
    }

    function $getTrustedForwarder() internal view override(PolygonLandStorageMixin, ERC2771Handler) returns (address) {
        return PolygonLandStorageMixin.$getTrustedForwarder();
    }

    function $setTrustedForwarder(address a) internal override(PolygonLandStorageMixin, ERC2771Handler) {
        PolygonLandStorageMixin.$setTrustedForwarder(a);
    }

    function $getOperatorFilterRegistry()
        internal
        view
        override(PolygonLandStorageMixin, OperatorFiltererUpgradeable)
        returns (address a)
    {
        return PolygonLandStorageMixin.$getOperatorFilterRegistry();
    }

    function $setOperatorFilterRegistry(address a) internal override {
        PolygonLandStorageMixin.$setOperatorFilterRegistry(a);
    }

    function $minters()
        internal
        view
        override(PolygonLandStorageMixin, PolygonLandBaseTokenV2)
        returns (mapping(address => bool) storage)
    {
        return PolygonLandStorageMixin.$minters();
    }
}
