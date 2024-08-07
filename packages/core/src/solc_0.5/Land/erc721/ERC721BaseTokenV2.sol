// SPDX-License-Identifier: MIT
/* solhint-disable func-order, code-complexity */
pragma solidity 0.5.9;

import {AddressUtils} from "../../contracts_common/Libraries/AddressUtils.sol";
import {ERC721TokenReceiver} from "../../contracts_common/Interfaces/ERC721TokenReceiver.sol";
import {ERC721Events} from "../../contracts_common/Interfaces/ERC721Events.sol";
import {SuperOperatorsV2} from "../../contracts_common/BaseWithStorage/SuperOperatorsV2.sol";
import {MetaTransactionReceiverV2} from "../../contracts_common/BaseWithStorage/MetaTransactionReceiverV2.sol";
import {ERC721MandatoryTokenReceiver} from "../../contracts_common/Interfaces/ERC721MandatoryTokenReceiver.sol";

/**
 * @title ERC721BaseTokenV2
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
contract ERC721BaseTokenV2 is ERC721Events, SuperOperatorsV2, MetaTransactionReceiverV2 {
    using AddressUtils for address;

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    /// @notice Number of NFT an address own
    mapping (address => uint256) public _numNFTPerAddress;

    /// @notice Token ids per address
    mapping (uint256 => uint256) public _owners;

    /// @notice Operators for each owner address for all tokens
    mapping (address => mapping(address => bool)) public _operatorsForAll;

    /// @notice Operator for each token id
    mapping (uint256 => address) public _operators;

    bool internal _initialized;

    modifier initializer() {
        require(!_initialized, "ERC721BaseToken: Contract already initialized");
        _;
    }

    /**
     * @notice Initializes the contract with the meta-transaction contract & admin
     * @param metaTransactionContract Authorized contract for meta-transactions
     * @param admin Admin of the contract
     */
    function initialize (
        address metaTransactionContract,
        address admin
    ) public initializer {
        _admin = admin;
        _setMetaTransactionProcessor(metaTransactionContract, true);
        _initialized = true;
        emit AdminChanged(address(0), _admin);
    }

    /**
     * @param from Sender address
     * @param to Recipient address
     * @param id Token id to transfer
     */
    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        _numNFTPerAddress[from]--;
        _numNFTPerAddress[to]++;
        _owners[id] = uint256(to);
        emit Transfer(from, to, id);
    }

    /**
     * @notice Return the number of Land owned by an address
     * @param owner The address to look for
     * @return The number of Land token owned by the address
     */
    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "owner is zero address");
        return _numNFTPerAddress[owner];
    }

    /**
     * @param id token id
     * @return address of the owner
     */
    function _ownerOf(uint256 id) internal view returns (address) {
        return address(_owners[id]);
    }

    /**
     * @param id Token id
     * @return owner Address of the token's owner
     * @return operatorEnabled Is he an operator
     */
    function _ownerAndOperatorEnabledOf(uint256 id) internal view returns (address owner, bool operatorEnabled) {
        uint256 data = _owners[id];
        owner = address(data);
        operatorEnabled = (data / 2**255) == 1;
    }

    /**
     * @notice Return the owner of a Land
     * @param id The id of the Land
     * @return The address of the owner
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
    function _approveFor(
        address owner,
        address operator,
        uint256 id
    ) internal {
        if (operator == address(0)) {
            _owners[id] = uint256(owner); // no need to resset the operator, it will be overriden next time
        } else {
            _owners[id] = uint256(owner) + 2**255;
            _operators[id] = operator;
        }
        emit Approval(owner, operator, id);
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
    ) public {
        address owner = _ownerOf(id);
        require(sender != address(0), "sender is zero address");
        require(
            msg.sender == sender ||
                _metaTransactionContracts[msg.sender] ||
                _operatorsForAll[sender][msg.sender] ||
                _superOperators[msg.sender],
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
    function approve(address operator, uint256 id) public {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(
            owner == msg.sender || _operatorsForAll[owner][msg.sender] || _superOperators[msg.sender],
            "not authorized to approve"
        );
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
            return _operators[id];
        } else {
            return address(0);
        }
    }

    /**
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     * @return is it a meta-tx
     */
    function _checkTransfer(
        address from,
        address to,
        uint256 id
    ) internal view returns (bool isMetaTx) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == from, "not owner in _checkTransfer");
        require(to != address(0), "can't send to zero address");
        if (msg.sender != from) {
            if(_metaTransactionContracts[msg.sender]) {
                return true;
            }
            require(
                _operatorsForAll[from][msg.sender] ||
                    (operatorEnabled && _operators[id] == msg.sender) ||
                    _superOperators[msg.sender],
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
    function _checkInterfaceWith10000Gas(address _contract, bytes4 interfaceId)
        internal
        view
        returns (bool)
    {
        bool success;
        bool result;
        bytes memory call_data = abi.encodeWithSelector(ERC165ID, interfaceId);
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let call_ptr := add(0x20, call_data)
            let call_size := mload(call_data)
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
    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public {
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
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public {
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
    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external {
        safeTransferFrom(from, to, id, "");
    }

    /**
     * @notice Transfer many tokens between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
     * @param data additional data
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external {
        _batchTransferFrom(from, to, ids, data, false);
    }

    /**
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
     * @param data additional data
     * @param safe checks the target contract
     */
    function _batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data,
        bool safe
    ) internal {
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        bool authorized =
            msg.sender == from || metaTx || _operatorsForAll[from][msg.sender] || _superOperators[msg.sender];

        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "not owner in batchTransferFrom");
            require(authorized || (operatorEnabled && _operators[id] == msg.sender), "not authorized");
            _owners[id] = uint256(to);
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _numNFTPerAddress[from] -= numTokens;
            _numNFTPerAddress[to] += numTokens;
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(
                    _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data),
                    "erc721 batch transfer rejected by to"
                );
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(
                        _checkOnERC721Received(metaTx ? from : msg.sender, from, to, ids[i], ""),
                        "erc721 transfer rejected by to"
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
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external {
        _batchTransferFrom(from, to, ids, data, true);
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
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
    ) public {
        require(sender != address(0), "Invalid sender address");
        require(
            msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender],
            "not authorized to approve for all"
        );

        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) public {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @param sender Sender address
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(!_superOperators[operator], "super operator can't have their approvalForAll changed");
        _operatorsForAll[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Check if the sender approved the operator
     * @param owner The address of the owner
     * @param operator The address of the operator
     * @return The status of the approval
     */
    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool)
    {
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    /**
     * @param from sender address
     * @param owner owner address of the token
     * @param id token id to burn
     */
    function _burn(
        address from,
        address owner,
        uint256 id
    ) internal {
        require(from == owner, "not owner");
        _owners[id] = 2**160; // cannot mint it again
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
        require(from != address(0), "Invalid sender address");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(
            msg.sender == from ||
                _metaTransactionContracts[msg.sender] ||
                (operatorEnabled && _operators[id] == msg.sender) ||
                _operatorsForAll[from][msg.sender] ||
                _superOperators[msg.sender],
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
        bytes4 retval = ERC721TokenReceiver(to).onERC721Received(operator, from, tokenId, _data);
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
        bytes4 retval = ERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data);
        return (retval == _ERC721_BATCH_RECEIVED);
    }

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
