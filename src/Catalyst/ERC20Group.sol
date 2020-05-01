pragma solidity 0.6.5;

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

    function addSubToken(
        ERC20SubToken subToken,
        address to,
        uint256 supply
    ) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _addSubToken(subToken, to, supply);
    }

    function supplyOf(uint256 id) external view returns (uint256) {
        return _totalSupplies[id];
    }

    function balanceOf(address owner, uint256 tokenId) public view returns (uint256) {
        return _packedTokenBalance[owner].getValueInBin(tokenId);
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
        require(
            from == msg.sender || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || _metaTransactionContracts[msg.sender],
            "NOT_AUTHORIZED"
        );
        ERC20SubToken erc20 = _erc20s[id];
        _packedTokenBalance[from] = ObjectLib64.updateTokenBalance(_packedTokenBalance[from], id, value, ObjectLib64.Operations.SUB);
        _packedTokenBalance[to] = ObjectLib64.updateTokenBalance(_packedTokenBalance[to], id, value, ObjectLib64.Operations.ADD);
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

        uint256 balFrom = _packedTokenBalance[from];
        uint256 balTo = _packedTokenBalance[to];
        for (uint256 i = 0; i < ids.length; i++) {
            ERC20SubToken erc20 = _erc20s[ids[i]];
            balFrom = ObjectLib64.updateTokenBalance(balFrom, ids[i], values[i], ObjectLib64.Operations.SUB);
            balTo = ObjectLib64.updateTokenBalance(balTo, ids[i], values[i], ObjectLib64.Operations.ADD);
            erc20.emitTransferEvent(from, to, values[i]);
        }
        _packedTokenBalance[from] = balFrom;
        _packedTokenBalance[to] = balTo;
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

    // ///////////////// INTERNAL //////////////////////////
    function _addSubToken(
        ERC20SubToken subToken,
        address to,
        uint256 supply
    ) internal {
        uint256 index = _erc20s.length;
        _erc20s.push(subToken);
        subToken.setSubTokenIndex(this, index);

        _packedTokenBalance[to] = _packedTokenBalance[to].updateTokenBalance(index, supply, ObjectLib64.Operations.REPLACE);
        _totalSupplies[index] = supply;

        subToken.emitTransferEvent(address(0), to, supply);
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
    mapping(address => uint256) _packedTokenBalance;
    mapping(address => mapping(address => bool)) _operatorsForAll;
    uint256[] _totalSupplies;
    ERC20SubToken[] _erc20s;

    // ////////////// CONSTRUCTOR ////////////////////////////

    constructor(
        address to,
        uint256[] memory supplies,
        address admin
    ) public {
        _admin = admin;
        for (uint256 i = 0; i < supplies.length; i++) {
            ERC20SubToken subToken = new ERC20SubToken();
            _addSubToken(subToken, to, supplies[i]);
        }
    }
}
