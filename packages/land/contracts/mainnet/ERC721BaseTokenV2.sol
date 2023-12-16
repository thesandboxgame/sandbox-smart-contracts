// SPDX-License-Identifier: MIT
/* solhint-disable func-order, code-complexity */
pragma solidity 0.8.2;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {ERC721BaseToken} from "../common/ERC721BaseToken.sol";
import {MetaTransactionReceiverV2} from "./MetaTransactionReceiverV2.sol";
import {IERC721MandatoryTokenReceiver} from "../common/IERC721MandatoryTokenReceiver.sol";

/**
 * @title ERC721BaseTokenV2
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
abstract contract ERC721BaseTokenV2 is ERC721BaseToken, MetaTransactionReceiverV2 {
    using AddressUpgradeable for address;

    /**
     * @notice Initializes the contract with the meta-transaction contract & admin
     * @param metaTransactionContract Authorized contract for meta-transactions
     * @param admin Admin of the contract
     */
    function initialize(address metaTransactionContract, address admin) public initializer {
        $setAdmin(admin);
        _setMetaTransactionProcessor(metaTransactionContract, true);
        emit AdminChanged(address(0), admin);
    }

    /**
     * @param from Sender address
     * @param to Recipient address
     * @param id Token id to transfer
     */
    function _transferFrom(address from, address to, uint256 id) internal {
        _moveNumNFTPerAddress(from, to, 1);
        _setOwnerData(id, uint160(to));
        emit Transfer(from, to, id);
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
    function ownerOf(uint256 id) external view override returns (address owner) {
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
            _setOperators(id, operator);
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
            msg.sender == sender ||
                _isMetaTransactionProcessor(msg.sender) ||
                _isOperatorsForAll(sender, msg.sender) ||
                _isSuperOperator(msg.sender),
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
    function approve(address operator, uint256 id) public virtual override {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(
            owner == msg.sender || _isOperatorsForAll(owner, msg.sender) || _isSuperOperator(msg.sender),
            "not authorized to approve"
        );
        _approveFor(owner, operator, id);
    }

    /**
     * @notice Get the approved operator for a specific token
     * @param id The id of the token
     * @return The address of the operator
     */
    function getApproved(uint256 id) external view override returns (address) {
        mapping(uint256 => address) storage _operators = $operators();
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        if (operatorEnabled) {
            return _operators[id];
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
        mapping(uint256 => address) storage _operators = $operators();
        require(owner != address(0), "token does not exist");
        require(owner == from, "not owner in _checkTransfer");
        require(to != address(0), "can't send to zero address");
        if (msg.sender != from) {
            if (_isMetaTransactionProcessor(msg.sender)) {
                return true;
            }
            require(
                _isOperatorsForAll(from, msg.sender) ||
                    (operatorEnabled && _operators[id] == msg.sender) ||
                    _isSuperOperator(msg.sender),
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
    function transferFrom(address from, address to, uint256 id) public virtual override {
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
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public virtual override {
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
    function safeTransferFrom(address from, address to, uint256 id) external virtual override {
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
        mapping(uint256 => address) storage _operators = $operators();
        bool metaTx = msg.sender != from && _isMetaTransactionProcessor(msg.sender);
        bool authorized = msg.sender == from ||
            metaTx ||
            _isOperatorsForAll(from, msg.sender) ||
            _isSuperOperator(msg.sender);

        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "not owner in batchTransferFrom");
            require(authorized || (operatorEnabled && _operators[id] == msg.sender), "not authorized");
            _setOwnerData(id, uint160(to));
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _moveNumNFTPerAddress(from, to, numTokens);
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(
                    _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data),
                    "batch transfer rejected by to"
                );
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(
                        _checkOnERC721Received(metaTx ? from : msg.sender, from, to, ids[i], ""),
                        "transfer rejected by to"
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
    function supportsInterface(bytes4 id) external pure virtual override returns (bool) {
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
            msg.sender == sender || _isMetaTransactionProcessor(msg.sender) || _isSuperOperator(msg.sender),
            "not authorized"
        );

        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @param sender Sender address
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function _setApprovalForAll(address sender, address operator, bool approved) internal {
        require(!_isSuperOperator(operator), "can't change approvalForAll");
        $operatorsForAll()[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Check if the sender approved the operator
     * @param owner The address of the owner
     * @param operator The address of the operator
     * @return The status of the approval
     */
    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _isOperatorsForAll(owner, operator) || _isSuperOperator(operator);
    }

    /**
     * @param from sender address
     * @param owner owner address of the token
     * @param id token id to burn
     */
    function _burn(address from, address owner, uint256 id) internal {
        mapping(address => uint256) storage _numNFTPerAddress = $numNFTPerAddress();
        require(from == owner, "not owner");
        _setOwnerData(id, 2 ** 160);
        // cannot mint it again
        _numNFTPerAddress[from]--;
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
        mapping(uint256 => address) storage _operators = $operators();
        require(from != address(0), "Invalid sender address");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(
            msg.sender == from ||
                _isMetaTransactionProcessor(msg.sender) ||
                (operatorEnabled && _operators[id] == msg.sender) ||
                _isOperatorsForAll(from, msg.sender) ||
                _isSuperOperator(msg.sender),
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
        bytes4 retval = IERC721ReceiverUpgradeable(to).onERC721Received(operator, from, tokenId, _data);
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
}
