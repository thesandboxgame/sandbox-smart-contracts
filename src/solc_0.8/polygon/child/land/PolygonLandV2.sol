// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseTokenV2.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "../../../OperatorFilterer/contracts/upgradeable/OperatorFiltererUpgradeable.sol";

/// @title LAND token on L2
contract PolygonLandV2 is PolygonLandBaseTokenV2, ERC2771Handler, OperatorFiltererUpgradeable {
    using AddressUpgradeable for address;

    function initialize(address trustedForwarder) external initializer {
        _admin = _msgSender();
        __ERC2771Handler_initialize(trustedForwarder);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _trustedForwarder = trustedForwarder;
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
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
    ) external override onlyAllowedOperatorApproval(operator) {
        uint256 ownerData = _owners[_storageId(id)];
        address owner = _ownerOf(id);
        address msgSender = _msgSender();
        require(sender != address(0), "PolygonLandV2: ZERO_ADDRESS_SENDER");
        require(owner != address(0), "PolygonLandV2: NONEXISTENT_TOKEN");
        require(
            msgSender == sender || _operatorsForAll[sender][msgSender] || _superOperators[msgSender],
            "PolygonLandV2: UNAUTHORIZED_APPROVAL"
        );
        require(address(uint160(ownerData)) == sender, "PolygonLandV2: OWNER_NOT_SENDER");
        _approveFor(ownerData, operator, id);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approve(address operator, uint256 id) external override onlyAllowedOperatorApproval(operator) {
        uint256 ownerData = _owners[_storageId(id)];
        address owner = _ownerOf(id);
        address msgSender = _msgSender();
        require(owner != address(0), "PolygonLandV2: NONEXISTENT_TOKEN");
        require(
            owner == msgSender || _operatorsForAll[owner][msgSender] || _superOperators[msgSender],
            "PolygonLandV2: UNAUTHORIZED_APPROVAL"
        );
        _approveFor(ownerData, operator, id);
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function transferFrom(
        address from,
        address to,
        uint256 id
    ) external override onlyAllowedOperator(from) {
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, ""), "PolygonLandV2: ERC721_TRANSFER_REJECTED");
        }
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
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(
                _checkOnERC721Received(_msgSender(), from, to, id, data),
                "PolygonLandV2: ERC721_TRANSFER_REJECTED"
            );
        }
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external override onlyAllowedOperator(from) {
        safeTransferFrom(from, to, id, "");
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved)
        external
        override
        onlyAllowedOperatorApproval(operator)
    {
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
        require(sender != address(0), "PolygonLandV2: Invalid sender address");
        address msgSender = _msgSender();
        require(msgSender == sender || _superOperators[msgSender], "PolygonLandV2: UNAUTHORIZED_APPROVE_FOR_ALL");

        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.
    /// @dev can only be called by admin.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyAdmin {
        require(subscriptionOrRegistrantToCopy != address(0), "PolygonLandV2: subscription can't be zero address");
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external virtual onlyAdmin {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }
}
