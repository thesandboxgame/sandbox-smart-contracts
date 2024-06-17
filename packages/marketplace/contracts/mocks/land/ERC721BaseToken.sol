// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC721MandatoryTokenReceiver} from "@sandbox-smart-contracts/land/contracts/interfaces/IERC721MandatoryTokenReceiver.sol";
import {IERC721Errors} from "./draft-IERC6093.sol";
import {WithSuperOperators} from "@sandbox-smart-contracts/land/contracts/common/WithSuperOperators.sol";

/// @title ERC721BaseTokenCommon
/// @author The Sandbox
/// @notice Basic functionalities of a NFT
/// @dev ERC721 implementation that supports meta-transactions and super operators
abstract contract ERC721BaseToken is Context, IERC721, IERC721Errors, WithSuperOperators {
    using Address for address;

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    uint256 internal constant NOT_ADDRESS = 0xFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;
    uint256 internal constant OPERATOR_FLAG = (2 ** 255);
    uint256 internal constant NOT_OPERATOR_FLAG = OPERATOR_FLAG - 1;
    uint256 internal constant BURNED_FLAG = (2 ** 160);

    /// @notice Approve an operator to spend tokens on the senders behalf.
    /// @param operator The address receiving the approval.
    /// @param tokenId The id of the token.
    function approve(address operator, uint256 tokenId) external virtual override {
        _approveFor(_msgSender(), operator, tokenId);
    }

    /// @notice Approve an operator to spend tokens on the sender behalf.
    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param operator The address receiving the approval.
    /// @param tokenId The id of the token.
    /// @dev We keep this one for backward compatibility, owner == sender aka this is the same as approve
    function approveFor(address from, address operator, uint256 tokenId) external virtual {
        _approveFor(from, operator, tokenId);
    }

    /// @notice Transfer a token between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param tokenId The id of the token.
    function transferFrom(address from, address to, uint256 tokenId) external virtual override {
        _transferFrom(from, to, tokenId);
    }

    ///  @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
    ///  @param from The sender of the token
    /// @param to The recipient of the token
    /// @param id The id of the token
    /// @param data Additional data
    function safeTransferFrom(address from, address to, uint256 id, bytes calldata data) external virtual {
        _safeTransferFrom(from, to, id, data);
    }

    /// @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
    /// @param from The send of the token
    /// @param to The recipient of the token
    /// @param id The id of the token
    function safeTransferFrom(address from, address to, uint256 id) external virtual {
        _safeTransferFrom(from, to, id, "");
    }

    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external virtual {
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
    function setApprovalForAllFor(address sender, address operator, bool approved) external virtual {
        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAll(address operator, bool approved) external virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Get the number of tokens owned by an address.
    /// @param owner The address to look for.
    /// @return The number of tokens owned by the address.
    function balanceOf(address owner) external view virtual override returns (uint256) {
        if (owner == address(0)) {
            revert ERC721InvalidOwner(address(0));
        }
        return _getNumNFTPerAddress(owner);
    }

    /// @notice Get the owner of a token.
    /// @param tokenId The id of the token.
    /// @return owner The address of the token owner.
    function ownerOf(uint256 tokenId) external view virtual override returns (address owner) {
        owner = _ownerOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        return owner;
    }

    /// @notice Get the approved operator for a specific token.
    /// @param tokenId The id of the token.
    /// @return The address of the operator.
    function getApproved(uint256 tokenId) external view virtual override returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        if (operatorEnabled) {
            return _getOperator(tokenId);
        }
        return address(0);
    }

    /// @notice Return the internal owner data of a Land
    /// @param tokenId The id of the Land
    /// @dev for debugging purposes
    function getOwnerData(uint256 tokenId) external view virtual returns (uint256) {
        return _getOwnerData(tokenId);
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator) external view virtual override returns (bool) {
        return _isApprovedForAllOrSuperOperator(owner, operator);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC-165.
    /// 0x80ac58cd is ERC-721
    /// @param id The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 id) public pure virtual override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param tokenId The token being transferred.
    function _transferFrom(address from, address to, uint256 tokenId) internal {
        address msgSender = _msgSender();
        _doTransfer(msgSender, from, to, tokenId);
        if (to.code.length > 0 && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(msgSender, from, to, tokenId, ""), "ERC721_TRANSFER_REJECTED");
        }
    }

    /// @notice Transfer a token between 2 addresses letting the receiver knows of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    /// @param data Additional data.
    function _safeTransferFrom(address from, address to, uint256 id, bytes memory data) internal {
        address msgSender = _msgSender();
        _doTransfer(msgSender, from, to, id);
        if (to.code.length > 0) {
            require(_checkOnERC721Received(msgSender, from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    /// @param msgSender The sender of the transaction
    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param tokenId The token being transferred.
    function _doTransfer(address msgSender, address from, address to, uint256 tokenId) internal {
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        bool operatorEnabled = _checkFromIsOwner(from, tokenId);
        require(
            msgSender == from ||
                _isApprovedForAllOrSuperOperator(from, msgSender) ||
                (operatorEnabled && _getOperator(tokenId) == msgSender),
            "UNAUTHORIZED_TRANSFER"
        );
        _transferNumNFTPerAddress(from, to, 1);
        _updateOwnerData(tokenId, to, false);
        emit Transfer(from, to, tokenId);
    }

    /// @param from The sender of the token
    /// @param to The recipient of the token
    /// @param ids The ids of the tokens
    /// @param data additional data
    /// @param safe checks the target contract
    function _batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes memory data,
        bool safe
    ) internal {
        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        require(to != address(0), "NOT_TO_ZEROADDRESS");

        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAllOrSuperOperator(from, msgSender);
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "BATCHTRANSFERFROM_NOT_OWNER");
            require(authorized || (operatorEnabled && _getOperator(id) == msgSender), "NOT_AUTHORIZED");
            _updateOwnerData(id, to, false);
            emit Transfer(from, to, id);
        }
        _transferNumNFTPerAddress(from, to, numTokens);

        if (to.code.length > 0) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(_checkOnERC721BatchReceived(msgSender, from, to, ids, data), "ERC721_BATCH_RECEIVED_REJECTED");
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(_checkOnERC721Received(msgSender, from, to, ids[i], data), "ERC721_RECEIVED_REJECTED");
                }
            }
        }
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param operator The address receiving the approval
    /// @param approved The determination of the approval
    function _setApprovalForAll(address from, address operator, bool approved) internal {
        if (from == address(0)) {
            revert ERC721InvalidSender(from);
        }
        address msgSender = _msgSender();
        require(msgSender == from || _isSuperOperator(msgSender), "UNAUTHORIZED_APPROVE_FOR_ALL");
        require(!_isSuperOperator(operator), "INVALID_APPROVAL_CHANGE");
        _setOperatorForAll(from, operator, approved);
        emit ApprovalForAll(from, operator, approved);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param operator The address receiving the approval
    /// @param tokenId The id of the token
    function _approveFor(address from, address operator, uint256 tokenId) internal {
        _checkFromIsOwner(from, tokenId);

        address msgSender = _msgSender();
        require(from == msgSender || _isApprovedForAllOrSuperOperator(from, msgSender), "UNAUTHORIZED_APPROVAL");
        if (operator == address(0)) {
            _updateOwnerData(tokenId, from, false);
        } else {
            _updateOwnerData(tokenId, from, true);
            _setOperator(tokenId, operator);
        }
        emit Approval(from, operator, tokenId);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param tokenId token id to burn
    function _burn(address from, uint256 tokenId) internal {
        bool operatorEnabled = _checkFromIsOwner(from, tokenId);

        address msgSender = _msgSender();
        require(
            from == msgSender ||
                (operatorEnabled && _getOperator(tokenId) == msgSender) ||
                _isApprovedForAllOrSuperOperator(from, msgSender),
            "UNAUTHORIZED_BURN"
        );
        _setOwnerData(tokenId, (_getOwnerData(tokenId) & (NOT_ADDRESS & NOT_OPERATOR_FLAG)) | BURNED_FLAG);
        _subNumNFTPerAddress(from, 1);
        emit Transfer(from, address(0), tokenId);
    }

    /// @notice checks that the token is taken from the owner after the call (from == owner)
    /// @param from sender address
    /// @param tokenId The id of the token
    /// @return operatorEnabled Whether or not operators are enabled for this token.
    function _checkFromIsOwner(address from, uint256 tokenId) internal view returns (bool) {
        if (from == address(0)) {
            revert ERC721InvalidSender(from);
        }
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(tokenId);
        // As from == owner, this is the same check as from == address(0) but we want a specific error for this one.
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        if (from != owner) {
            revert ERC721InvalidOwner(from);
        }
        return operatorEnabled;
    }

    /// @param tokenId The id of the token
    /// @param newOwner The new owner of the token
    /// @param hasOperator if true the operator flag is set
    function _updateOwnerData(uint256 tokenId, address newOwner, bool hasOperator) internal {
        uint256 oldData = (_getOwnerData(tokenId) & (NOT_ADDRESS & NOT_OPERATOR_FLAG)) | uint256(uint160(newOwner));
        if (hasOperator) {
            oldData = oldData | OPERATOR_FLAG;
        }
        _setOwnerData(tokenId, oldData);
    }

    /// @param id token id
    /// @return owner address of the owner
    function _ownerOf(uint256 id) internal view returns (address owner) {
        (owner, ) = _ownerAndOperatorEnabledOf(id);
    }

    /// @notice Get the owner and operatorEnabled flag of a token.
    /// @param id The token to query.
    /// @return owner The owner of the token.
    /// @return operatorEnabled Whether or not operators are enabled for this token.
    function _ownerAndOperatorEnabledOf(
        uint256 id
    ) internal view virtual returns (address owner, bool operatorEnabled) {
        uint256 data = _getOwnerData(id);
        if ((data & BURNED_FLAG) == BURNED_FLAG) {
            owner = address(0);
        } else {
            owner = address(uint160(data));
        }
        operatorEnabled = (data & OPERATOR_FLAG) == OPERATOR_FLAG;
    }

    /// @notice Check if receiving contract accepts erc721 transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param tokenId The id of the token we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x150b7a02 is returned.
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721Receiver(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    /// @notice Check if receiving contract accepts erc721 batch transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param ids The ids of the tokens we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x4b808c46 is returned.
    function _checkOnERC721BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data);
        return (retval == _ERC721_BATCH_RECEIVED);
    }

    /// @notice Check if there was enough gas.
    /// @param _contract The address of the contract to check.
    /// @param interfaceId The id of the interface we want to test.
    /// @return Whether or not this check succeeded.
    function _checkInterfaceWith10000Gas(address _contract, bytes4 interfaceId) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory callData = abi.encodeWithSelector(ERC165ID, interfaceId);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let call_ptr := add(0x20, callData)
            let call_size := mload(callData)
            let output := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(output, 0x0)
            success := staticcall(10000, _contract, call_ptr, call_size, output, 0x20) // 32 bytes
            result := mload(output)
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result;
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function _isApprovedForAllOrSuperOperator(address owner, address operator) internal view returns (bool) {
        return _isOperatorForAll(owner, operator) || _isSuperOperator(operator);
    }

    /// @notice Add tokens to the owner balance
    /// @param who the owner of the token
    /// @param val how must to add to the owner balance
    /// @dev we can use unchecked becase there is a limited number of lands 408x408
    function _addNumNFTPerAddress(address who, uint256 val) internal {
        unchecked {
            _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) + val);
        }
    }

    /// @notice Subtract tokens to the owner balance
    /// @param who the owner of the token
    /// @param val how must to subtract to the owner balance
    /// @dev we can use unchecked becase there is a limited number of lands 408x408
    function _subNumNFTPerAddress(address who, uint256 val) internal {
        unchecked {
            _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) - val);
        }
    }

    /// @notice Move balance between to users
    /// @param from address to subtract from
    /// @param to address to add from
    /// @param quantity how many tokens to move
    function _transferNumNFTPerAddress(address from, address to, uint256 quantity) internal virtual {
        if (from != to) {
            _subNumNFTPerAddress(from, quantity);
            _addNumNFTPerAddress(to, quantity);
        }
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _getNumNFTPerAddress(address owner) internal view virtual returns (uint256);

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _setNumNFTPerAddress(address owner, uint256 quantity) internal virtual;

    /// @notice Get the owner data of a token for a user
    /// @param tokenId The id of the token.
    /// @return the owner data
    /// @dev The owner data has three fields: owner address, operator flag and burn flag. See: _owners declaration.
    function _getOwnerData(uint256 tokenId) internal view virtual returns (uint256);

    /// @notice Get the owner address of a token (included in the ownerData, see: _getOwnerData)
    /// @param tokenId The id of the token.
    /// @return the owner address
    function _getOwnerAddress(uint256 tokenId) internal view virtual returns (address) {
        return address(uint160(_getOwnerData(tokenId)));
    }

    /// @notice Set the owner data of a token
    /// @param tokenId the token Id
    /// @param data the owner data
    /// @dev The owner data has three fields: owner address, operator flag and burn flag. See: _owners declaration.
    function _setOwnerData(uint256 tokenId, uint256 data) internal virtual;

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool);

    /// @notice Let an operator to access to all the tokens of a owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled if true give access to the operator, else disable it
    function _setOperatorForAll(address owner, address operator, bool enabled) internal virtual;

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _getOperator(uint256 tokenId) internal view virtual returns (address);

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _setOperator(uint256 tokenId, address operator) internal virtual;
}
