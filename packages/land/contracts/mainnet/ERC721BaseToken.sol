// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {ERC721BaseTokenCommon} from "../common/ERC721BaseTokenCommon.sol";
import {IERC721MandatoryTokenReceiver} from "../common/IERC721MandatoryTokenReceiver.sol";
import {WithSuperOperators} from "../common/WithSuperOperators.sol";
import {MetaTransactionReceiver} from "./MetaTransactionReceiver.sol";

/**
 * @title ERC721BaseToken
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
abstract contract ERC721BaseToken is
    ERC721BaseTokenCommon,
    IERC721Upgradeable,
    WithSuperOperators,
    MetaTransactionReceiver
{
    using AddressUpgradeable for address;

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    /**
     * @param from Sender address
     * @param to Recipient address
     * @param id Token id to transfer
     */
    function _transferFrom(address from, address to, uint256 id) internal {
        _transferNumNFTPerAddress(from, to, 1);
        _setOwnerData(id, uint160(to));
        emit Transfer(from, to, id);
    }

    /**
     * @notice Return the number of Land owned by an address
     * @param owner The address to look for
     * @return The number of Land token owned by the address
     */
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "owner is zero address");
        return _getNumNFTPerAddress(owner);
    }

    /**
     * @param id token id
     * @return address of the owner
     */
    function _ownerOf(uint256 id) internal view virtual returns (address) {
        return _getOwnerAddress(id);
    }

    /**
     * @param id Token id
     * @return owner Address of the token's owner
     * @return operatorEnabled Is he an operator
     */
    function _ownerAndOperatorEnabledOf(
        uint256 id
    ) internal view virtual returns (address owner, bool operatorEnabled) {
        uint256 data = _getOwnerData(id);
        owner = address(uint160(data));
        operatorEnabled = (data / 2 ** 255) == 1;
    }

    /**
     * @notice Return the owner of a Land
     * @param id The id of the Land
     * @return owner The address of the owner
     */
    function ownerOf(uint256 id) external view returns (address owner) {
        owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
    }

    /**
     * @param owner The address giving the approval
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function _approveFor(address owner, address operator, uint256 id) internal {
        if (operator == address(0)) {
            _setOwnerData(id, uint160(owner));
            // no need to resset the operator, it will be overriden next time
        } else {
            _setOwnerData(id, uint160(owner) + 2 ** 255);
            _setOperator(id, operator);
        }
        emit Approval(owner, operator, id);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approveFor(address sender, address operator, uint256 id) public virtual {
        address owner = _ownerOf(id);
        require(sender != address(0), "sender is zero address");
        require(
            msg.sender == sender || _isMetaTransactionContract(msg.sender) || _isApprovedForAll(sender, msg.sender),
            "not authorized to approve"
        );
        require(owner == sender, "owner != sender");
        _approveFor(owner, operator, id);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approve(address operator, uint256 id) public virtual {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == msg.sender || _isApprovedForAll(owner, msg.sender), "not authorized to approve");
        _approveFor(owner, operator, id);
    }

    /**
     * @notice Get the approved operator for a specific token
     * @param id The id of the token
     * @return The address of the operator
     */
    function getApproved(uint256 id) external view returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        if (operatorEnabled) {
            return _getOperator(id);
        } else {
            return address(0);
        }
    }

    /**
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     * @return isMetaTx is it a meta-tx
     */
    function _checkTransfer(address from, address to, uint256 id) internal view returns (bool isMetaTx) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == from, "not owner in _checkTransfer");
        require(to != address(0), "can't send to zero address");
        if (msg.sender != from) {
            if (_isMetaTransactionContract(msg.sender)) {
                return true;
            }
            require(
                (operatorEnabled && _getOperator(id) == msg.sender) || _isApprovedForAll(from, msg.sender),
                "not approved to transfer"
            );
        }
    }

    /**
     * @dev Checks if the target contract supports the given interface & doesn't exceed 10000 gas
     * @param _contract The target contract
     * @param interfaceId The interface id
     * @return if the call is a success
     */
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

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function transferFrom(address from, address to, uint256 id) public virtual {
        bool metaTx = _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(
                _checkOnERC721Received(metaTx ? from : msg.sender, from, to, id, ""),
                "erc721 transfer rejected by to"
            );
        }
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     * @param data Additional data
     */
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public virtual {
        bool metaTx = _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(
                _checkOnERC721Received(metaTx ? from : msg.sender, from, to, id, data),
                "ERC721: transfer rejected by to"
            );
        }
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function safeTransferFrom(address from, address to, uint256 id) external virtual {
        safeTransferFrom(from, to, id, "");
    }

    /**
     * @notice Transfer many tokens between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
     * @param data additional data
     */
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external {
        _batchTransferFrom(from, to, ids, data, false);
    }

    /**
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
     * @param data additional data
     * @param safe checks the target contract
     */
    function _batchTransferFrom(address from, address to, uint256[] memory ids, bytes memory data, bool safe) internal {
        bool metaTx = msg.sender != from && _isMetaTransactionContract(msg.sender);
        bool authorized = msg.sender == from || metaTx || _isApprovedForAll(from, msg.sender);

        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "not owner in batchTransferFrom");
            require(authorized || (operatorEnabled && _getOperator(id) == msg.sender), "not authorized");
            _setOwnerData(id, uint160(to));
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _transferNumNFTPerAddress(from, to, numTokens);
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(
                    _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data),
                    "erc721 batchTransfer rejected"
                );
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(
                        _checkOnERC721Received(metaTx ? from : msg.sender, from, to, ids[i], ""),
                        "erc721 transfer rejected"
                    );
                }
            }
        }
    }

    /**
     * @notice Transfer many tokens between 2 addresses ensuring the receiving contract has a receiver method
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
     * @param data additional data
     */
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external {
        _batchTransferFrom(from, to, ids, data, true);
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) external pure virtual returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAllFor(address sender, address operator, bool approved) public virtual {
        require(sender != address(0), "Invalid sender address");
        require(
            msg.sender == sender || _isMetaTransactionContract(msg.sender) || _isSuperOperator(msg.sender),
            "not authorized"
        );

        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @param sender Sender address
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function _setApprovalForAll(address sender, address operator, bool approved) internal {
        require(!_isSuperOperator(operator), "can't change approvalForAll");
        _setOperatorForAll(sender, operator, approved);
        emit ApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Check if the sender approved the operator
     * @param owner The address of the owner
     * @param operator The address of the operator
     * @return The status of the approval
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _isApprovedForAll(owner, operator);
    }

    /**
     * @param from sender address
     * @param owner owner address of the token
     * @param id token id to burn
     */
    function _burn(address from, address owner, uint256 id) internal {
        require(from == owner, "not owner");
        _setOwnerData(id, 2 ** 160);
        // cannot mint it again
        _subNumNFTPerAddress(from, 1);
        emit Transfer(from, address(0), id);
    }

    /// @notice Burns token `id`.
    /// @param id token which will be burnt.
    function burn(uint256 id) external {
        _burn(msg.sender, _ownerOf(id), id);
    }

    /// @notice Burn token`id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id token which will be burnt.
    function burnFrom(address from, uint256 id) external {
        require(from != address(0), "Invalid sender address");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(
            msg.sender == from ||
                _isMetaTransactionContract(msg.sender) ||
                (operatorEnabled && _getOperator(id) == msg.sender) ||
                _isApprovedForAll(from, msg.sender),
            "not authorized to burn"
        );
        _burn(from, owner, id);
    }

    /**
     * @param operator Sender of the tx
     * @param from Owner of the token
     * @param to Recipient
     * @param tokenId Token id
     * @param _data extra data
     */
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721MandatoryTokenReceiver(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    /**
     * @dev Check if receiving contract accepts erc721 batch transfers.
     * @param operator Sender of the tx
     * @param from Owner of the token
     * @param to Recipient
     * @param ids Token ids
     * @param _data extra data
     * @return Whether the expected value of 0x4b808c46 is returned.
     */
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

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function _isApprovedForAll(address owner, address operator) internal view returns (bool) {
        return _isOperatorForAll(owner, operator) || _isSuperOperator(operator);
    }

    function _getNumNFTPerAddress(address who) internal view virtual returns (uint256);

    function _setNumNFTPerAddress(address who, uint256 val) internal virtual;

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

    function _getOwnerData(uint256 id) internal view virtual returns (uint256);

    function _setOwnerData(uint256 id, uint256 data) internal virtual;

    function _getOwnerAddress(uint256 id) internal view virtual returns (address) {
        return address(uint160(_getOwnerData(id)));
    }

    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool);

    function _setOperatorForAll(address owner, address operator, bool enabled) internal virtual;

    function _getOperator(uint256 id) internal view virtual returns (address);

    function _setOperator(uint256 id, address operator) internal virtual;
}
