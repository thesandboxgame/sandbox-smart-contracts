// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC721MandatoryTokenReceiver} from "../common/IERC721MandatoryTokenReceiver.sol";
import {IContext} from "./IContext.sol";
import {IERC721Errors} from "./draft-IERC6093.sol";
import {WithSuperOperators} from "./WithSuperOperators.sol";

/**
 * @title ERC721BaseTokenCommon
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 * @dev TODO: use custom errors instead of revert
 */
abstract contract ERC721BaseTokenCommon is IContext, IERC721Upgradeable, IERC721Errors, WithSuperOperators {
    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    uint256 internal constant NOT_ADDRESS = 0xFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;
    uint256 internal constant OPERATOR_FLAG = (2 ** 255);
    uint256 internal constant NOT_OPERATOR_FLAG = OPERATOR_FLAG - 1;
    uint256 internal constant BURNED_FLAG = (2 ** 160);

    /// @notice Get the number of tokens owned by an address.
    /// @param owner The address to look for.
    /// @return The number of tokens owned by the address.
    function balanceOf(address owner) external view override returns (uint256) {
        if (owner == address(0)) {
            revert ERC721InvalidOwner(address(0));
        }
        return _getNumNFTPerAddress(owner);
    }

    /// @notice Get the owner of a token.
    /// @param tokenId The id of the token.
    /// @return owner The address of the token owner.
    function ownerOf(uint256 tokenId) external view override returns (address owner) {
        return _requireOwned(tokenId);
    }

    /// @notice Get the approved operator for a specific token.
    /// @param tokenId The id of the token.
    /// @return The address of the operator.
    function getApproved(uint256 tokenId) external view override returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        if (operatorEnabled) {
            return _getOperator(tokenId);
        } else {
            return address(0);
        }
    }

    /**
     * @notice Return the internal owner data of a Land
     * @param id The id of the Land
     * @dev for debugging purposes
     */
    function getOwnerData(uint256 id) external view returns (uint256) {
        return _getOwnerData(id);
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _isApprovedForAll(owner, operator);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC-165.
    /// 0x80ac58cd is ERC-721
    /// @param id The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 id) public pure virtual override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    /// @param owner The address giving the approval
    /// @param operator The address receiving the approval
    /// @param id The id of the token
    function _approveFor(address owner, address operator, uint256 id) internal {
        if (operator == address(0)) {
            _updateOwnerData(id, owner, false);
        } else {
            _updateOwnerData(id, owner, true);
            _setOperator(id, operator);
        }
        emit Approval(owner, operator, id);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param tokenId The token being transferred.
    /// @dev TODO: after merging. use custom errors
    function _transferFrom(address from, address to, uint256 tokenId) internal {
        address msgSender = _msgSender();
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(tokenId);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == from, "CHECKTRANSFER_NOT_OWNER");
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(
            msgSender == owner ||
                _isApprovedForAll(from, msgSender) ||
                (operatorEnabled && _getOperator(tokenId) == msgSender),
            "UNAUTHORIZED_TRANSFER"
        );
        _transferNumNFTPerAddress(from, to, 1);
        _updateOwnerData(tokenId, to, false);
        emit Transfer(from, to, tokenId);
    }

    /// @param sender Sender address
    /// @param operator The address receiving the approval
    /// @param approved The determination of the approval
    /// @dev TODO: after merging. use custom errors
    function _setApprovalForAll(address sender, address operator, bool approved) internal {
        address msgSender = _msgSender();
        require(sender != address(0), "Invalid sender address");
        require(msgSender == sender || _isSuperOperator(msgSender), "UNAUTHORIZED_APPROVE_FOR_ALL");
        require(!_isSuperOperator(operator), "INVALID_APPROVAL_CHANGE");
        _setOperatorForAll(sender, operator, approved);
        emit ApprovalForAll(sender, operator, approved);
    }

    /// @param tokenId The id of the token
    /// @param newOwner The new owner of the token
    /// @param hasOperator if true the operator flag is set
    /// @dev TODO: after merging. Check if using address for operator improve the code size and gas consumption
    /// @dev TODO: after merging. Use this method in burn so we only call _setOwnerData from here (less error prone)
    function _updateOwnerData(uint256 tokenId, address newOwner, bool hasOperator) internal virtual {
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

    /// @param from sender address
    /// @param id token id to burn
    function _burn(address from, uint256 id) internal {
        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        address msgSender = _msgSender();
        require(
            msgSender == from ||
                (operatorEnabled && _getOperator(id) == msgSender) ||
                _isApprovedForAll(from, msgSender),
            "UNAUTHORIZED_BURN"
        );
        if (from != owner) {
            revert ERC721InvalidOwner(owner);
        }
        _setOwnerData(id, (_getOwnerData(id) & (NOT_ADDRESS & NOT_OPERATOR_FLAG)) | BURNED_FLAG);
        _subNumNFTPerAddress(from, 1);
        emit Transfer(from, address(0), id);
    }

    /// @dev Get the owner and operatorEnabled status of a token.
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

    /**
     * @dev Reverts if the `tokenId` doesn't have a current owner (it hasn't been minted, or it has been burned).
     * Returns the owner.
     *
     * Overrides to ownership logic should be done to {_ownerOf}.
     */
    function _requireOwned(uint256 tokenId) internal view returns (address) {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        return owner;
    }

    /// @dev Check if receiving contract accepts erc721 transfers.
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
        bytes4 retval = IERC721ReceiverUpgradeable(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    /// @dev Check if receiving contract accepts erc721 batch transfers.
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

    /// @dev Check if there was enough gas.
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
    function _isApprovedForAll(address owner, address operator) internal view returns (bool) {
        return _isOperatorForAll(owner, operator) || _isSuperOperator(operator);
    }

    function _addNumNFTPerAddress(address who, uint256 val) internal {
        _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) + val);
    }

    function _subNumNFTPerAddress(address who, uint256 val) internal {
        _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) - val);
    }

    function _transferNumNFTPerAddress(address from, address to, uint256 quantity) internal virtual {
        _subNumNFTPerAddress(from, quantity);
        _addNumNFTPerAddress(to, quantity);
    }

    function _getNumNFTPerAddress(address who) internal view virtual returns (uint256);

    function _setNumNFTPerAddress(address who, uint256 val) internal virtual;

    function _getOwnerData(uint256 id) internal view virtual returns (uint256);

    function _getOwnerAddress(uint256 id) internal view virtual returns (address) {
        return address(uint160(_getOwnerData(id)));
    }

    function _setOwnerData(uint256 id, uint256 data) internal virtual;

    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool);

    function _setOperatorForAll(address owner, address operator, bool enabled) internal virtual;

    function _getOperator(uint256 id) internal view virtual returns (address);

    function _setOperator(uint256 id, address operator) internal virtual;
}
