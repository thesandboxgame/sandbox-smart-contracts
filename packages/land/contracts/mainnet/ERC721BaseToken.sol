// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC721BaseTokenCommon} from "../common/ERC721BaseTokenCommon.sol";

/**
 * @title ERC721BaseToken
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
abstract contract ERC721BaseToken is ERC721BaseTokenCommon {
    using AddressUpgradeable for address;

    /**
     * @param from Sender address
     * @param to Recipient address
     * @param id Token id to transfer
     */
    function _transferFrom(address from, address to, uint256 id) internal {
        _checkTransfer(from, to, id);
        _transferNumNFTPerAddress(from, to, 1);
        _setOwnerData(id, uint160(to));
        emit Transfer(from, to, id);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approveFor(address sender, address operator, uint256 id) public virtual {
        address owner = _ownerOf(id);
        address msgSender = _msgSender();
        require(sender != address(0), "sender is zero address");
        require(msgSender == sender || _isApprovedForAll(sender, msgSender), "not authorized to approve");
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
        address msgSender = _msgSender();
        require(owner != address(0), "token does not exist");
        require(owner == msgSender || _isApprovedForAll(owner, msgSender), "not authorized to approve");
        _approveFor(owner, operator, id);
    }

    /**
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function _checkTransfer(address from, address to, uint256 id) internal view {
        address msgSender = _msgSender();
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == from, "not owner in _checkTransfer");
        require(to != address(0), "can't send to zero address");
        if (msgSender != from) {
            require(
                (operatorEnabled && _getOperator(id) == msgSender) || _isApprovedForAll(from, msgSender),
                "not approved to transfer"
            );
        }
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function transferFrom(address from, address to, uint256 id) public virtual {
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, ""), "erc721 transfer rejected by to");
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
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, data), "erc721 transfer rejected by to");
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
        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAll(from, msgSender);

        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "not owner in batchTransferFrom");
            require(authorized || (operatorEnabled && _getOperator(id) == msgSender), "not authorized");
            _setOwnerData(id, uint160(to));
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _transferNumNFTPerAddress(from, to, numTokens);
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(_checkOnERC721BatchReceived(msgSender, from, to, ids, data), "erc721 batchTransfer rejected");
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(_checkOnERC721Received(msgSender, from, to, ids[i], ""), "erc721 transfer rejected");
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
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAllFor(address sender, address operator, bool approved) public virtual {
        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @param sender Sender address
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function _setApprovalForAll(address sender, address operator, bool approved) internal {
        address msgSender = _msgSender();
        require(sender != address(0), "Invalid sender address");
        require(msgSender == sender || _isSuperOperator(msgSender), "not authorized");
        require(!_isSuperOperator(operator), "can't change approvalForAll");
        _setOperatorForAll(sender, operator, approved);
        emit ApprovalForAll(sender, operator, approved);
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
}
