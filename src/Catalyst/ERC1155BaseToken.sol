pragma solidity 0.6.5;

import "../contracts_common/src/Interfaces/ERC1155.sol";
import "../contracts_common/src/Interfaces/ERC1155TokenReceiver.sol";

import "../contracts_common/src/Libraries/AddressUtils.sol";
import "../contracts_common/src/Libraries/ObjectLib32.sol";

import "../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "../contracts_common/src/BaseWithStorage/SuperOperators.sol";


contract ERC1155BaseToken is MetaTransactionReceiver, SuperOperators, ERC1155 {
    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param value amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override {
        bool metaTx = _transferFrom(from, to, id, value);
        require(_checkERC1155AndCallSafeTransfer(metaTx ? from : msg.sender, from, to, id, value, data), "erc1155 transfer rejected");
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param values amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override {
        require(ids.length == values.length, "Inconsistent array length between args");
        require(to != address(0), "destination is zero address");
        require(from != address(0), "from is zero address");
        bool metaTx = _metaTransactionContracts[msg.sender];
        require(from == msg.sender || metaTx || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender], "not authorized");

        _batchTransferFrom(from, to, ids, values);
        emit TransferBatch(metaTx ? from : msg.sender, from, to, ids, values);
        require(_checkERC1155AndCallSafeBatchTransfer(metaTx ? from : msg.sender, from, to, ids, values, data), "erc1155 transfer rejected");
    }

    /// @notice Get the balance of `owner` for the token type `id`.
    /// @param owner The address of the token holder.
    /// @param id the token type of which to get the balance of.
    /// @return the balance of `owner` for the token type `id`.
    function balanceOf(address owner, uint256 id) public override view returns (uint256) {
        // do not check for existence, balance is zero if never minted
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        return _packedTokenBalance[owner][bin].getValueInBin(index);
    }

    /// @notice Get the balance of `owners` for each token type `ids`.
    /// @param owners the addresses of the token holders queried.
    /// @param ids ids of each token type to query.
    /// @return the balance of each `owners` for each token type `ids`.
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) external override view returns (uint256[] memory) {
        require(owners.length == ids.length, "Inconsistent array length between args");
        uint256[] memory balances = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            balances[i] = balanceOf(owners[i], ids[i]);
        }
        return balances;
    }

    /// @notice Enable or disable approval for `operator` to manage all `sender`'s tokens.
    /// @dev used for Meta Transaction (from metaTransactionContract).
    /// @param sender address which grant approval.
    /// @param operator address which will be granted rights to transfer all token owned by `sender`.
    /// @param approved whether to approve or revoke.
    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external {
        require(msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender], "require meta approval");
        _setApprovalForAll(sender, operator, approved);
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(address operator, bool approved) external override {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice Queries the approval status of `operator` for owner `owner`.
    /// @param owner the owner of the tokens.
    /// @param operator address of authorized operator.
    /// @return isOperator true if the operator is approved, false if not.
    function isApprovedForAll(address owner, address operator) external override view returns (bool isOperator) {
        require(owner != address(0), "owner is zero address");
        require(operator != address(0), "operator is zero address");
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id) external view returns (bool) {
        return
            id == ERC165ID || //ERC165
            id == 0xd9b67a26; // ERC1155
    }

    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(from != address(0), "from is zero address");
        bool metaTx = _metaTransactionContracts[msg.sender];
        require(from == msg.sender || metaTx || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender], "not authorized");

        uint256 balFrom;

        uint256 lastBin = 2**256 - 1;
        for (uint256 i = 0; i < ids.length; i++) {
            if (amounts[i] > 0) {
                (uint256 bin, uint256 index) = ids[i].getTokenBinIndex();
                if (lastBin == 2**256 - 1) {
                    lastBin = bin;
                    balFrom = ObjectLib32.updateTokenBalance(_packedTokenBalance[from][bin], index, amounts[i], ObjectLib32.Operations.SUB);
                } else {
                    if (bin != lastBin) {
                        _packedTokenBalance[from][lastBin] = balFrom;
                        balFrom = _packedTokenBalance[from][bin];
                        lastBin = bin;
                    }

                    balFrom = balFrom.updateTokenBalance(index, amounts[i], ObjectLib32.Operations.SUB);
                }
            }
        }
        if (lastBin != 2**256 - 1) {
            _packedTokenBalance[from][lastBin] = balFrom;
        }
        emit TransferBatch(metaTx ? from : msg.sender, from, address(0), ids, amounts);
    }

    /// @notice Burns `amount` tokens of type `id`.
    /// @param id token type which will be burnt.
    /// @param amount amount of token to burn.
    function burn(uint256 id, uint256 amount) external {
        _burn(msg.sender, msg.sender, id, amount);
    }

    /// @notice Burns `amount` tokens of type `id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id token type which will be burnt.
    /// @param amount amount of token to burn.
    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external {
        require(from != address(0), "from is zero address");
        bool metaTx = _metaTransactionContracts[msg.sender];
        require(from == msg.sender || metaTx || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender], "not authorized");
        _burn(metaTx ? from : msg.sender, from, id, amount);
    }

    // /////////////////////////////// INTERNAL ////////////////////////////
    function _transferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value
    ) internal returns (bool metaTx) {
        require(to != address(0), "destination is zero address");
        require(from != address(0), "from is zero address");
        metaTx = _metaTransactionContracts[msg.sender];
        require(from == msg.sender || metaTx || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender], "Operator not approved");
        if (value > 0) {
            // if different owners it will fails
            (uint256 bin, uint256 index) = id.getTokenBinIndex();
            _packedTokenBalance[from][bin] = _packedTokenBalance[from][bin].updateTokenBalance(index, value, ObjectLib32.Operations.SUB);
            _packedTokenBalance[to][bin] = _packedTokenBalance[to][bin].updateTokenBalance(index, value, ObjectLib32.Operations.ADD);
        }

        emit TransferSingle(metaTx ? from : msg.sender, from, to, id, value);
    }

    function _batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal {
        uint256 numItems = ids.length;
        uint256 bin;
        uint256 index;
        uint256 balFrom;
        uint256 balTo;

        uint256 lastBin = 2**256 - 1;
        for (uint256 i = 0; i < numItems; i++) {
            if (values[i] > 0) {
                (bin, index) = ids[i].getTokenBinIndex();
                if (lastBin == 2**256 - 1) {
                    lastBin = bin;
                    balFrom = ObjectLib32.updateTokenBalance(_packedTokenBalance[from][bin], index, values[i], ObjectLib32.Operations.SUB);
                    balTo = ObjectLib32.updateTokenBalance(_packedTokenBalance[to][bin], index, values[i], ObjectLib32.Operations.ADD);
                } else {
                    if (bin != lastBin) {
                        _packedTokenBalance[from][lastBin] = balFrom;
                        _packedTokenBalance[to][lastBin] = balTo;
                        balFrom = _packedTokenBalance[from][bin];
                        balTo = _packedTokenBalance[to][bin];
                        lastBin = bin;
                    }

                    balFrom = balFrom.updateTokenBalance(index, values[i], ObjectLib32.Operations.SUB);
                    balTo = balTo.updateTokenBalance(index, values[i], ObjectLib32.Operations.ADD);
                }
            }
        }
        if (lastBin != 2**256 - 1) {
            _packedTokenBalance[from][lastBin] = balFrom;
            _packedTokenBalance[to][lastBin] = balTo;
        }
    }

    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(sender != address(0), "sender is zero address");
        require(sender != operator, "sender = operator");
        require(operator != address(0), "operator is zero address");
        require(!_superOperators[operator], "super operator can't have their approvalForAll changed");
        _operatorsForAll[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    function _burn(
        address operator,
        address from,
        uint256 id,
        uint256 amount
    ) internal {
        require(amount > 0 && amount <= MAX_SUPPLY, "invalid amount");
        (uint256 bin, uint256 index) = (id).getTokenBinIndex();
        _packedTokenBalance[from][bin] = _packedTokenBalance[from][bin].updateTokenBalance(index, amount, ObjectLib32.Operations.SUB);
        emit TransferSingle(operator, from, address(0), id, amount);
    }

    function checkIsERC1155Receiver(address _contract) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory call_data = abi.encodeWithSelector(ERC165ID, ERC1155_IS_RECEIVER);
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

    function _checkERC1155AndCallSafeTransfer(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal returns (bool) {
        if (!to.isContract()) {
            return true;
        }
        return ERC1155TokenReceiver(to).onERC1155Received(operator, from, id, value, data) == ERC1155_RECEIVED;
    }

    function _checkERC1155AndCallSafeBatchTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal returns (bool) {
        if (!to.isContract()) {
            return true;
        }
        bytes4 retval = ERC1155TokenReceiver(to).onERC1155BatchReceived(operator, from, ids, values, data);
        return (retval == ERC1155_BATCH_RECEIVED);
    }

    // //////////////////////////////// UTILS AND CONSTANTS ///////////////////////////////
    using AddressUtils for address;
    using ObjectLib32 for ObjectLib32.Operations;
    using ObjectLib32 for uint256;

    bytes4 constant ERC165ID = 0x01ffc9a7;
    bytes4 private constant ERC1155_IS_RECEIVER = 0x4e2312e0;
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    uint256 private constant MAX_SUPPLY = uint256(2)**32 - 1;

    // /////////////////////////////////////////// DATA ///////////////////////////////

    mapping(address => mapping(uint256 => uint256)) private _packedTokenBalance;
    mapping(address => mapping(address => bool)) private _operatorsForAll;

    // //////////////////////////////////// CONSTRUCTOR ////////////////////////////////
    constructor(address metaTransactionContract, address admin) public {
        _setMetaTransactionProcessor(metaTransactionContract, true);
        _admin = admin;
    }
}
