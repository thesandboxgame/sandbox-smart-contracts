//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC721BaseTokenCommon} from "../common/ERC721BaseTokenCommon.sol";

/// @title ERC721BaseToken
/// @author The Sandbox
/// @notice Basic functionalities of a NFT
/// @dev ERC721 implementation that supports meta-transactions and super operators
abstract contract ERC721BaseToken is ERC721BaseTokenCommon {
    using AddressUpgradeable for address;

    /// @notice Approve an operator to spend tokens on the senders behalf.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approve(address operator, uint256 id) public virtual override {
        address owner = _ownerOf(id);
        address msgSender = _msgSender();
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == msgSender || _isApprovedForAll(owner, msgSender), "UNAUTHORIZED_APPROVAL");
        _approveFor(owner, operator, id);
    }

    /// @notice Approve an operator to spend tokens on the sender behalf.
    /// @param sender The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approveFor(address sender, address operator, uint256 id) public virtual {
        address owner = _ownerOf(id);
        address msgSender = _msgSender();
        require(sender != address(0), "ZERO_ADDRESS_SENDER");
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(msgSender == sender || _isApprovedForAll(sender, msgSender), "UNAUTHORIZED_APPROVAL");
        require(owner == sender, "OWNER_NOT_SENDER");
        _approveFor(owner, operator, id);
    }

    /// @notice Transfer a token between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function transferFrom(address from, address to, uint256 id) public virtual override {
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, ""), "ERC721_TRANSFER_REJECTED");
        }
    }

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function safeTransferFrom(address from, address to, uint256 id) public virtual override {
        safeTransferFrom(from, to, id, "");
    }

    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) public virtual {
        _batchTransferFrom(from, to, ids, data, false);
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
    ) external virtual {
        _batchTransferFrom(from, to, ids, data, true);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param sender The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAllFor(address sender, address operator, bool approved) public virtual {
        require(sender != address(0), "Invalid sender address");
        address msgSender = _msgSender();
        require(msgSender == sender || _isSuperOperator(msgSender), "UNAUTHORIZED_APPROVE_FOR_ALL");

        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Transfer a token between 2 addresses letting the receiver knows of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    /// @param data Additional data.
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public virtual override {
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    function _updateOwnerData(uint256 id, uint256 oldData, address newOwner, bool hasOperator) internal virtual {
        if (hasOperator) {
            _setOwnerData(id, (oldData & NOT_ADDRESS) | OPERATOR_FLAG | uint256(uint160(newOwner)));
        } else {
            _setOwnerData(id, ((oldData & NOT_ADDRESS) & NOT_OPERATOR_FLAG) | uint256(uint160(newOwner)));
        }
    }

    function _transferFrom(address from, address to, uint256 id) internal {
        _transferNumNFTPerAddress(from, to, 1);
        _updateOwnerData(id, _getOwnerData(id), to, false);
        emit Transfer(from, to, id);
    }

    /// @dev See approveFor.
    function _approveFor(address owner, address operator, uint256 id) internal {
        uint256 ownerData = _getOwnerData(id);
        if (operator == address(0)) {
            _updateOwnerData(id, ownerData, owner, false);
        } else {
            _updateOwnerData(id, ownerData, owner, true);
            _setOperator(id, operator);
        }
        emit Approval(owner, operator, id);
    }

    /// @dev See batchTransferFrom.
    function _batchTransferFrom(address from, address to, uint256[] memory ids, bytes memory data, bool safe) internal {
        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAll(from, msgSender);

        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        require(to != address(0), "NOT_TO_ZEROADDRESS");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "BATCHTRANSFERFROM_NOT_OWNER");
            require(authorized || (operatorEnabled && _getOperator(id) == msgSender), "NOT_AUTHORIZED");
            _updateOwnerData(id, _getOwnerData(id), to, false);
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _transferNumNFTPerAddress(from, to, numTokens);
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(_checkOnERC721BatchReceived(msgSender, from, to, ids, data), "ERC721_BATCH_RECEIVED_REJECTED");
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(_checkOnERC721Received(msgSender, from, to, ids[i], data), "ERC721_RECEIVED_REJECTED");
                }
            }
        }
    }

    /// @dev See setApprovalForAll.
    function _setApprovalForAll(address sender, address operator, bool approved) internal {
        require(!_isSuperOperator(operator), "INVALID_APPROVAL_CHANGE");
        _setOperatorForAll(sender, operator, approved);
        emit ApprovalForAll(sender, operator, approved);
    }

    /// @dev Check whether a transfer is a meta Transaction or not.
    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param id The token being transferred.
    function _checkTransfer(address from, address to, uint256 id) internal view {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        address msgSender = _msgSender();
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == from, "CHECKTRANSFER_NOT_OWNER");
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(
            msgSender == owner ||
                _isApprovedForAll(from, msgSender) ||
                (operatorEnabled && _getOperator(id) == msgSender),
            "UNAUTHORIZED_TRANSFER"
        );
    }
}
