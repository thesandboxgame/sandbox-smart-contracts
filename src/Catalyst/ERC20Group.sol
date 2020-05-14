pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./ERC20SubToken.sol";
import "../contracts_common/src/Libraries/SafeMath.sol";
import "../contracts_common/src/Libraries/AddressUtils.sol";
import "../contracts_common/src/Libraries/ObjectLib64.sol";
import "../contracts_common/src/Libraries/BytesUtil.sol";

import "../contracts_common/src/BaseWithStorage/SuperOperators.sol";
import "../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";


contract ERC20Group is SuperOperators, MetaTransactionReceiver {
    event SubToken(ERC20SubToken subToken);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event Minter(address newMinter);

    function getMinter() external view returns (address) {
        return _minter;
    }

    function setMinter(address newMinter) external {
        require(msg.sender == _admin, "only admin allowed");
        _minter = newMinter;
        emit Minter(newMinter);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        require(msg.sender == _minter, "only minter allowed to mint");
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[to][bin] = _packedTokenBalance[to][bin].updateTokenBalance(index, amount, ObjectLib64.Operations.ADD);
        _totalSupplies[id] += amount;
        _erc20s[id].emitTransferEvent(address(0), to, amount);
    }

    function addSubToken(ERC20SubToken subToken) external {
        require(msg.sender == _minter, "NOT_AUTHORIZED_ONLY_MINTER");
        _addSubToken(subToken);
    }

    function supplyOf(uint256 id) external view returns (uint256) {
        return _totalSupplies[id];
    }

    function balanceOf(address owner, uint256 id) public view returns (uint256) {
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        return _packedTokenBalance[owner][bin].getValueInBin(index);
    }

    function balanceOfBatch(address[] calldata owners, uint256[] calldata tokenIds) external view returns (uint256[] memory) {
        require(owners.length == tokenIds.length, "Inconsistent array length between args");
        uint256[] memory balances = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            balances[i] = balanceOf(owners[i], tokenIds[i]);
        }
        return balances;
    }

    function singleTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value
    ) external {
        require(to != address(0), "INVALID_TO");
        ERC20SubToken erc20 = _erc20s[id];
        require(
            from == msg.sender ||
                msg.sender == address(erc20) ||
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender] ||
                _metaTransactionContracts[msg.sender],
            "NOT_AUTHORIZED"
        );

        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[from][bin] = _packedTokenBalance[from][bin].updateTokenBalance(index, value, ObjectLib64.Operations.SUB);
        _packedTokenBalance[to][bin] = _packedTokenBalance[to][bin].updateTokenBalance(index, value, ObjectLib64.Operations.ADD);
        erc20.emitTransferEvent(from, to, value);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external {
        require(ids.length == values.length, "INVALID_ARGS_IDS_VALUES_LENGTH");
        require(to != address(0), "INVALID_TO");
        require(
            from == msg.sender || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || _metaTransactionContracts[msg.sender],
            "NOT_AUTHORIZED"
        );

        uint256 bin = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        uint256 index;
        uint256 lastBin;
        uint256 balFrom;
        uint256 balTo;
        for (uint256 i = 0; i < ids.length; i++) {
            (bin, index) = ids[i].getTokenBinIndex();
            if (lastBin == 0) {
                lastBin = bin;
                balFrom = ObjectLib64.updateTokenBalance(_packedTokenBalance[from][bin], index, values[i], ObjectLib64.Operations.SUB);
                balTo = ObjectLib64.updateTokenBalance(_packedTokenBalance[to][bin], index, values[i], ObjectLib64.Operations.ADD);
            } else {
                if (bin != lastBin) {
                    _packedTokenBalance[from][lastBin] = balFrom;
                    _packedTokenBalance[to][lastBin] = balTo;
                    balFrom = _packedTokenBalance[from][bin];
                    balTo = _packedTokenBalance[to][bin];
                    lastBin = bin;
                }
                balFrom = balFrom.updateTokenBalance(index, values[i], ObjectLib64.Operations.SUB);
                balTo = balTo.updateTokenBalance(index, values[i], ObjectLib64.Operations.ADD);
            }
            ERC20SubToken erc20 = _erc20s[ids[i]];
            erc20.emitTransferEvent(from, to, values[i]);
        }
        if (bin != 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) {
            _packedTokenBalance[from][bin] = balFrom;
            _packedTokenBalance[to][bin] = balTo;
        }
    }

    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external {
        require(msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender], "NOT_AUTHORIZED");
        _setApprovalForAll(sender, operator, approved);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool isOperator) {
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    function burnFor(
        address from,
        uint256 id,
        uint256 value
    ) external returns (bool) {
        require(
            from == msg.sender || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || _metaTransactionContracts[msg.sender],
            "NOT_AUTHORIZED"
        );
        ERC20SubToken erc20 = _erc20s[id];
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[from][bin] = ObjectLib64.updateTokenBalance(_packedTokenBalance[from][bin], id, value, ObjectLib64.Operations.SUB);
        erc20.emitTransferEvent(from, address(0), value);
        return true;
    }

    function burnEachFor(
        address from,
        uint256[] calldata ids,
        uint256 value
    ) external returns (bool) {
        require(
            from == msg.sender || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || _metaTransactionContracts[msg.sender],
            "NOT_AUTHORIZED"
        );
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            ERC20SubToken erc20 = _erc20s[id];
            (uint256 bin, uint256 index) = id.getTokenBinIndex();
            _packedTokenBalance[from][bin] = ObjectLib64.updateTokenBalance(_packedTokenBalance[from][bin], id, value, ObjectLib64.Operations.SUB);
            erc20.emitTransferEvent(from, address(0), value);
        }
        return true;
    }

    // ///////////////// INTERNAL //////////////////////////
    function _addSubToken(ERC20SubToken subToken) internal {
        uint256 index = _erc20s.length;
        _erc20s.push(subToken);
        _totalSupplies.push(0); // TODO use mapping instead
        subToken.setSubTokenIndex(this, index);
        emit SubToken(subToken);
    }

    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(!_superOperators[operator], "super operator can't have their approvalForAll changed");
        _operatorsForAll[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    // ///////////////// UTILITIES /////////////////////////
    using AddressUtils for address;
    using ObjectLib64 for ObjectLib64.Operations;
    using ObjectLib64 for uint256;
    using SafeMath for uint256;

    // ////////////////// DATA ///////////////////////////////
    mapping(address => mapping(uint256 => uint256)) private _packedTokenBalance;
    mapping(address => mapping(address => bool)) _operatorsForAll;
    uint256[] _totalSupplies;
    ERC20SubToken[] _erc20s;
    address _minter;

    // ////////////// CONSTRUCTOR ////////////////////////////

    struct SubTokenData {
        string name;
        string symbol;
    }

    constructor(address admin, address minter) public {
        _admin = admin;
        _minter = minter;
    }
}
