// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IERC721MandatoryTokenReceiver} from "../interfaces/IERC721MandatoryTokenReceiver.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {IERC721BatchOps} from "../interfaces/IERC721BatchOps.sol";
import {WithSuperOperators} from "./WithSuperOperators.sol";

/// @title ERC721BaseTokenCommon
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Basic functionalities of a NFT
/// @dev ERC721 implementation that supports meta-transactions and super operators
abstract contract ERC721BaseToken is IERC721, IERC721BatchOps, IERC721Errors, IErrors, Context, WithSuperOperators {
    using Address for address;

    uint256 internal constant NOT_ADDRESS = 0xFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;
    uint256 internal constant OPERATOR_FLAG = (2 ** 255);
    uint256 internal constant NOT_OPERATOR_FLAG = OPERATOR_FLAG - 1;
    uint256 internal constant BURNED_FLAG = (2 ** 160);

    /// @notice Get the number of tokens owned by an address.
    /// @param owner The address to look for.
    /// @return The number of tokens owned by the address.
    function balanceOf(address owner) external view virtual override returns (uint256) {
        if (owner == address(0)) {
            revert ERC721InvalidOwner(address(0));
        }
        return _readNumNFTPerAddress(owner);
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
            return _readOperator(tokenId);
        }
        return address(0);
    }

    /// @notice Return the internal owner data of a Land
    /// @param tokenId The id of the Land
    /// @return the owner data (address + burn flag + operatorEnabled)
    /// @dev for debugging purposes
    function getOwnerData(uint256 tokenId) external view virtual returns (uint256) {
        return _readOwnerData(tokenId);
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator) external view virtual override returns (bool) {
        return _isApprovedForAllOrSuperOperator(owner, operator);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param tokenId The token being transferred.
    function _transferFrom(address from, address to, uint256 tokenId) internal {
        address msgSender = _msgSender();
        _doTransfer(msgSender, from, to, tokenId);
        if (to.code.length > 0 && _checkIERC721MandatoryTokenReceiver(to)) {
            _checkOnERC721Received(msgSender, from, to, tokenId, "");
        }
    }

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param tokenId The id of the token.
    /// @param data Additional data.
    function _safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) internal {
        address msgSender = _msgSender();
        _doTransfer(msgSender, from, to, tokenId);
        if (to.code.length > 0) {
            _checkOnERC721Received(msgSender, from, to, tokenId, data);
        }
    }

    /// @param msgSender The sender of the transaction
    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param tokenId The token being transferred.
    function _doTransfer(address msgSender, address from, address to, uint256 tokenId) internal {
        if (to == address(0)) {
            revert InvalidAddress();
        }
        bool operatorEnabled = _checkFromIsOwner(from, tokenId);
        bool authorized = msgSender == from || _isApprovedForAllOrSuperOperator(from, msgSender);
        if (!authorized && !(operatorEnabled && _readOperator(tokenId) == msgSender)) {
            revert ERC721InsufficientApproval(msgSender, tokenId);
        }
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
        if (from == address(0) || to == address(0)) {
            revert InvalidAddress();
        }

        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAllOrSuperOperator(from, msgSender);
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 tokenId = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(tokenId);
            if (from != owner) {
                revert ERC721InvalidOwner(from);
            }
            if (!authorized && !(operatorEnabled && _readOperator(tokenId) == msgSender)) {
                revert ERC721InsufficientApproval(msgSender, tokenId);
            }
            _updateOwnerData(tokenId, to, false);
            emit Transfer(from, to, tokenId);
        }
        _transferNumNFTPerAddress(from, to, numTokens);

        if (to.code.length > 0) {
            if (_checkIERC721MandatoryTokenReceiver(to)) {
                _checkOnERC721BatchReceived(msgSender, from, to, ids, data);
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    _checkOnERC721Received(msgSender, from, to, ids[i], data);
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
        if (msgSender != from && !_isSuperOperator(msgSender)) {
            revert ERC721InvalidApprover(msgSender);
        }
        if (_isSuperOperator(operator)) {
            revert ERC721InvalidOperator(operator);
        }
        _writeOperatorForAll(from, operator, approved);
        emit ApprovalForAll(from, operator, approved);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param operator The address receiving the approval
    /// @param tokenId The id of the token
    function _approveFor(address from, address operator, uint256 tokenId) internal {
        _checkFromIsOwner(from, tokenId);

        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAllOrSuperOperator(from, msgSender);
        if (!authorized) {
            revert ERC721InvalidApprover(msgSender);
        }
        if (operator == address(0)) {
            _updateOwnerData(tokenId, from, false);
        } else {
            _updateOwnerData(tokenId, from, true);
            _writeOperator(tokenId, operator);
        }
        emit Approval(from, operator, tokenId);
    }

    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param tokenId token id to burn
    function _burn(address from, uint256 tokenId) internal {
        bool operatorEnabled = _checkFromIsOwner(from, tokenId);
        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAllOrSuperOperator(from, msgSender);
        if (!authorized && !(operatorEnabled && _readOperator(tokenId) == msgSender)) {
            revert ERC721InsufficientApproval(msgSender, tokenId);
        }
        _writeOwnerData(tokenId, (_readOwnerData(tokenId) & (NOT_ADDRESS & NOT_OPERATOR_FLAG)) | BURNED_FLAG);
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
        uint256 oldData = (_readOwnerData(tokenId) & (NOT_ADDRESS & NOT_OPERATOR_FLAG)) | uint256(uint160(newOwner));
        if (hasOperator) {
            oldData = oldData | OPERATOR_FLAG;
        }
        _writeOwnerData(tokenId, oldData);
    }

    /// @param tokenId token id
    /// @return owner address of the owner
    function _ownerOf(uint256 tokenId) internal view returns (address owner) {
        (owner, ) = _ownerAndOperatorEnabledOf(tokenId);
    }

    /// @notice Get the owner and operatorEnabled flag of a token.
    /// @param tokenId The token to query.
    /// @return owner The owner of the token.
    /// @return operatorEnabled Whether or not operators are enabled for this token.
    /// @dev must extract the owner, burn and operator flag from _readOwnerData(tokenId) if burned must return owner = address(0)
    function _ownerAndOperatorEnabledOf(
        uint256 tokenId
    ) internal view virtual returns (address owner, bool operatorEnabled);

    /// @notice Check if receiving contract accepts erc721 transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param tokenId The id of the token we would like to transfer.
    /// @param data Any additional data to send with the transfer.
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        /* solhint-disable no-empty-blocks */
        try IERC721Receiver(to).onERC721Received(operator, from, tokenId, data) returns (bytes4 retval) {
            if (retval == IERC721Receiver.onERC721Received.selector) {
                return;
            }
        } catch (bytes memory) {}
        /* solhint-enable no-empty-blocks */
        revert ERC721InvalidReceiver(to);
    }

    /// @notice Check if receiving contract accepts erc721 batch transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param ids The ids of the tokens we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    function _checkOnERC721BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory _data
    ) internal {
        /* solhint-disable no-empty-blocks */
        try IERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data) returns (
            bytes4 retval
        ) {
            if (retval == IERC721MandatoryTokenReceiver.onERC721BatchReceived.selector) {
                return;
            }
        } catch (bytes memory) {}
        /* solhint-enable no-empty-blocks */
        revert ERC721InvalidReceiver(to);
    }

    /// @notice Check if there was enough gas.
    /// @param to The address of the contract to check.
    /// @return Whether or not this check succeeded.
    function _checkIERC721MandatoryTokenReceiver(address to) internal view returns (bool) {
        return ERC165Checker.supportsERC165InterfaceUnchecked(to, type(IERC721MandatoryTokenReceiver).interfaceId);
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
    /// @param val how much to add to the owner's balance
    /// @dev we can use unchecked because there is a limited number of lands 408x408
    function _addNumNFTPerAddress(address who, uint256 val) internal {
        unchecked {
            _writeNumNFTPerAddress(who, _readNumNFTPerAddress(who) + val);
        }
    }

    /// @notice Subtract tokens to the owner balance
    /// @param who the owner of the token
    /// @param val how much to subtract from the owner's balance
    /// @dev we can use unchecked because there is a limited number of lands 408x408
    function _subNumNFTPerAddress(address who, uint256 val) internal {
        unchecked {
            _writeNumNFTPerAddress(who, _readNumNFTPerAddress(who) - val);
        }
    }

    /// @notice Move balance between two users
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
    function _readNumNFTPerAddress(address owner) internal view virtual returns (uint256);

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _writeNumNFTPerAddress(address owner, uint256 quantity) internal virtual;

    /// @notice Get the owner data of a token for a user
    /// @param tokenId The id of the token.
    /// @return the owner data
    /// @dev The owner data has three fields: owner address, operator flag and burn flag. See: _owners declaration.
    function _readOwnerData(uint256 tokenId) internal view virtual returns (uint256);

    /// @notice Get the owner address of a token (included in the ownerData, see: _getOwnerData)
    /// @param tokenId The id of the token.
    /// @return the owner address
    function _getOwnerAddress(uint256 tokenId) internal view virtual returns (address) {
        return address(uint160(_readOwnerData(tokenId)));
    }

    /// @notice Set the owner data of a token
    /// @param tokenId the token Id
    /// @param data the owner data
    /// @dev The owner data has three fields: owner address, operator flag and burn flag. See: _owners declaration.
    function _writeOwnerData(uint256 tokenId, uint256 data) internal virtual;

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool);

    /// @notice Provides an operator access to all the tokens of an owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled if true give access to the operator, else disable it
    function _writeOperatorForAll(address owner, address operator, bool enabled) internal virtual;

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _readOperator(uint256 tokenId) internal view virtual returns (address);

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _writeOperator(uint256 tokenId, address operator) internal virtual;
}
