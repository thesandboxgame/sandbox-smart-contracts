pragma solidity 0.5.9;

import "./ERC20ORB.sol";
import "../contracts_common/Libraries/SafeMath.sol";
import "../contracts_common/Libraries/AddressUtils.sol";
import "../contracts_common/Libraries/ObjectLib64.sol";
import "../contracts_common/Libraries/BytesUtil.sol";

import "../contracts_common/Interfaces/ERC1155.sol";
import "../contracts_common/Interfaces/ERC1155TokenReceiver.sol";

import "../contracts_common/BaseWithStorage/SuperOperators.sol";

contract ORBCore is SuperOperators, ERC1155 {
    using AddressUtils for address;
    using ObjectLib64 for ObjectLib64.Operations;
    using ObjectLib64 for uint256;
    using SafeMath for uint256;
    mapping(address => uint256) packedTokenBalance;
    mapping(address => mapping(address => bool)) operatorsForAll;

    mapping(address => bool) metaTransactionContracts; // native meta-transaction support
    
    uint256[3] totalSupplies;
    ERC20ORB[3] erc20s;
    event ORB(ERC20ORB orb);
    constructor(address _to, uint256 supply0, uint256 supply1, uint256 supply2)
        public
    {
        deployORB(0, supply0, _to);
        deployORB(1, supply1, _to);
        deployORB(2, supply2, _to);
    }

    function deployORB(uint8 index, uint256 supply, address _to) internal {
        ERC20ORB orb = new ERC20ORB(this, index);

        packedTokenBalance[_to] = packedTokenBalance[_to].updateTokenBalance(
            index,
            supply,
            ObjectLib64.Operations.REPLACE
        );
        totalSupplies[index] = supply;

        orb.emitTransferEvent(address(0), _to, supply);

        erc20s[index] = orb;
        emit ORB(orb);
    }

    function supplyOf(uint256 _id) external view returns (uint256) {
        if (_id > 2) {
            return 0;
        }
        return totalSupplies[_id];
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value
    ) external {
        require(msg.sender == address(erc20s[_id]), "only sub erc20");
        _transferFrom(_from, _to, _id, _value);
        require( // solium-disable-line error-reason
            _checkERC1155AndCallSafeTransfer(
                metaTransactionContracts[msg.sender] ? _from : msg.sender,
                _from,
                _to,
                _id,
                _value,
                "",
                true
            ),
            "failCheck"
        );
    }

    function _transferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value
    ) internal {
        require(_to != address(0), "Invalid to address");
        ERC20ORB erc20 = erc20s[_id];
        if (
            _from != msg.sender &&
            !metaTransactionContracts[msg.sender] &&
            msg.sender != address(erc20)
        ) {
            require(
                _superOperators[msg.sender] ||
                    operatorsForAll[_from][msg.sender],
                "Operator not approved"
            );
        }

        packedTokenBalance[_from] = packedTokenBalance[_from]
            .updateTokenBalance(_id, _value, ObjectLib64.Operations.SUB);
        packedTokenBalance[_to] = packedTokenBalance[_to].updateTokenBalance(
            _id,
            _value,
            ObjectLib64.Operations.ADD
        );
        emit TransferSingle(
            metaTransactionContracts[msg.sender] ? _from : msg.sender,
            _from,
            _to,
            _id,
            _value
        );
        erc20.emitTransferEvent(_from, _to, _value);
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external {
        _transferFrom(_from, _to, _id, _value);
        require( // solium-disable-line error-reason
            _checkERC1155AndCallSafeTransfer(
                metaTransactionContracts[msg.sender] ? _from : msg.sender,
                _from,
                _to,
                _id,
                _value,
                _data,
                false
            ),
            "failCheck"
        );
    }

    // NOTE: call data should be optimized to order _ids so packedBalance can be used efficiently
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external {
        _batchTransferFrom(_from, _to, _ids, _values);
        require( // solium-disable-line error-reason
            _checkERC1155AndCallSafeBatchTransfer(
                metaTransactionContracts[msg.sender] ? _from : msg.sender,
                _from,
                _to,
                _ids,
                _values,
                _data
            )
        );
    }

    function _batchTransferFrom(
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _values
    ) internal {
        require(
            _ids.length == _values.length,
            "Inconsistent array length between args"
        );
        require(_to != address(0), "Invalid recipient");
        require(
            _from == msg.sender ||
                _superOperators[msg.sender] ||
                operatorsForAll[_from][msg.sender] ||
                metaTransactionContracts[msg.sender],
            "not authorized"
        );

        uint256 balFrom = packedTokenBalance[_from];
        uint256 balTo = packedTokenBalance[_to];
        for (uint256 i = 0; i < _ids.length; i++) {
            ERC20ORB erc20 = erc20s[_ids[i]];
            balFrom = ObjectLib64.updateTokenBalance(
                balFrom,
                _ids[i],
                _values[i],
                ObjectLib64.Operations.SUB
            );
            balTo = ObjectLib64.updateTokenBalance(
                balTo,
                _ids[i],
                _values[i],
                ObjectLib64.Operations.ADD
            );
            erc20.emitTransferEvent(_from, _to, _values[i]);
        }
        packedTokenBalance[_from] = balFrom;
        packedTokenBalance[_to] = balTo;
        emit TransferBatch(
            metaTransactionContracts[msg.sender] ? _from : msg.sender,
            _from,
            _to,
            _ids,
            _values
        );
    }

    function balanceOf(address _owner, uint256 _tokenId)
        public
        view
        returns (uint256)
    {
        if (_tokenId > 2) {
            return 0;
        }
        return packedTokenBalance[_owner].getValueInBin(_tokenId);
    }

    function balanceOfBatch(
        address[] calldata _owners,
        uint256[] calldata _tokenIds
    ) external view returns (uint256[] memory) {
        require(
            _owners.length == _tokenIds.length,
            "Inconsistent array length between args"
        );
        uint256[] memory balances = new uint256[](_tokenIds.length);
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            balances[i] = balanceOf(_owners[i], _tokenIds[i]);
        }
        return balances;
    }

    function setApprovalForAllFor(
        address _sender,
        address _operator,
        bool _approved
    ) external {
        require(
            msg.sender == _sender ||
                metaTransactionContracts[msg.sender] ||
                _superOperators[msg.sender],
            "require meta approval"
        );
        _setApprovalForAll(_sender, _operator, _approved);
    }
    function setApprovalForAll(address _operator, bool _approved) external {
        _setApprovalForAll(msg.sender, _operator, _approved);
    }
    function _setApprovalForAll(
        address _sender,
        address _operator,
        bool _approved
    ) internal {
        require(
            !_superOperators[_operator],
            "super operator can't have their approvalForAll changed"
        );
        operatorsForAll[_sender][_operator] = _approved;
        emit ApprovalForAll(_sender, _operator, _approved);
    }
    function isApprovedForAll(address _owner, address _operator)
        external
        view
        returns (bool isOperator)
    {
        return operatorsForAll[_owner][_operator] || _superOperators[_operator];
    }

    function supportsInterface(bytes4 id) external view returns (bool) {
        //ERC165            // ERC1155
        return id == 0x01ffc9a7 || id == 0xd9b67a26;
    }

    bytes4 private constant ERC1155_IS_RECEIVER = 0x4e2312e0;
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 constant ERC165ID = 0x01ffc9a7;

    function checkIsERC1155Receiver(address _contract)
        internal
        view
        returns (bool)
    {
        bytes4 erc1155ReceiverID = ERC1155_IS_RECEIVER;
        bytes4 erc165ID = ERC165ID;
        bool success;
        uint256 result;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let x := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(x, erc165ID) // Place signature at beginning of empty storage
            mstore(add(x, 0x04), erc1155ReceiverID) // Place first argument directly next to signature

            success := staticcall(
                10000, // 10k gas
                _contract, // To addr
                x, // Inputs are stored at location x
                0x24, // Inputs are 36 bytes long
                x, // Store output over input (saves space)
                0x20
            ) // Outputs are 32 bytes long

            result := mload(x) // Load the result
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result == 1;
    }

    function _checkERC1155AndCallSafeTransfer(
        address _operator,
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data,
        bool _unsafe
    ) internal returns (bool) {
        if (!_to.isContract()) {
            return true;
        }
        if (_unsafe && !checkIsERC1155Receiver(_to)) {
            return true;
        }
        return
            ERC1155TokenReceiver(_to).onERC1155Received(
                    _operator,
                    _from,
                    _id,
                    _value,
                    _data
                ) ==
                ERC1155_RECEIVED;
    }

    function _checkERC1155AndCallSafeBatchTransfer(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _values,
        bytes memory _data
    ) internal returns (bool) {
        if (!_to.isContract()) {
            return true;
        }
        bytes4 retval = ERC1155TokenReceiver(_to).onERC1155BatchReceived(
            _operator,
            _from,
            _ids,
            _values,
            _data
        );
        return (retval == ERC1155_BATCH_RECEIVED);
    }

}
