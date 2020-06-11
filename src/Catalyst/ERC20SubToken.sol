pragma solidity 0.6.5;

import "../contracts_common/src/Libraries/SafeMath.sol";
import "../contracts_common/src/BaseWithStorage/SuperOperators.sol";
import "../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

import "./ERC20Group.sol";

contract ERC20SubToken is SuperOperators, MetaTransactionReceiver {
    // TODO add natspec, currently block by solidity compiler issue
    event Transfer(address indexed from, address indexed to, uint256 value);

    // TODO add natspec, currently block by solidity compiler issue
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice A descriptive name for the tokens
    /// @return name of the tokens
    function name() public view returns (string memory) {
        return string(abi.encodePacked(_name));
    }

    /// @notice An abbreviated name for the tokens
    /// @return symbol of the tokens
    function symbol() public view returns (string memory) {
        return string(abi.encodePacked(_symbol));
    }

    /// @notice the tokenId in GemCore
    /// @return the tokenId in GemCore
    function groupTokenId() external view returns (uint256) {
        return _index;
    }

    /// @notice the GemCore address
    /// @return the address of the group
    function groupAddress() external view returns (address) {
        return address(_group);
    }

    function totalSupply() external view returns (uint256) {
        return _group.supplyOf(_index);
    }

    function balanceOf(address who) external view returns (uint256) {
        return _group.balanceOf(who, _index);
    }

    function decimals() external pure returns (uint8) {
        return uint8(0);
    }

    function transfer(address to, uint256 amount) external returns (bool success) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool success) {
        if (
            msg.sender != from && !_metaTransactionContracts[msg.sender] && !_superOperators[msg.sender] && !_group.isApprovedForAll(from, msg.sender)
        ) {
            uint256 allowance = _mAllowed[from][msg.sender];
            if (allowance != (2**256) - 1) {
                // save gas when allowance is maximal by not reducing it (see https://github.com/ethereum/EIPs/issues/717)
                require(allowance >= amount, "Not enough funds allowed");
                _mAllowed[from][msg.sender] = allowance.sub(amount);
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool success) {
        _approveFor(msg.sender, spender, amount);
        return true;
    }

    function approveFor(
        address from,
        address spender,
        uint256 amount
    ) external returns (bool success) {
        require(msg.sender == from || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender], "msg.sender != from || superOperator"); // TODO metatx
        _approveFor(from, spender, amount);
        return true;
    }

    function emitTransferEvent(
        address from,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == address(_group), "only core");
        emit Transfer(from, to, amount);
    }

    // /////////////////// INTERNAL ////////////////////////

    function _approveFor(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0) && spender != address(0), "Cannot approve with 0x0");
        _mAllowed[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function allowance(address owner, address spender) external view returns (uint256 remaining) {
        return _mAllowed[owner][spender];
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal {
        _group.singleTransferFrom(from, to, _index, amount);
    }

    function _firstBytes32(bytes memory src) public pure returns (bytes32 output) {
        assembly {
            output := mload(add(src, 32))
        }
    }

    // ///////////////////// UTILITIES ///////////////////////
    using SafeMath for uint256;

    // //////////////////// CONSTRUCTOR /////////////////////
    constructor(
        ERC20Group group,
        uint256 index,
        string memory tokenName,
        string memory tokenSymbol,
        address admin
    ) public {
        _group = group;
        _index = index;
        require(bytes(tokenName).length > 0, "need a name");
        require(bytes(tokenName).length <= 32, "name too long");
        _name = _firstBytes32(bytes(tokenName));
        require(bytes(tokenSymbol).length > 0, "need a symbol");
        require(bytes(tokenSymbol).length <= 32, "symbol too long");
        _symbol = _firstBytes32(bytes(tokenSymbol));

        _admin = admin;
    }

    // ////////////////////// DATA ///////////////////////////
    ERC20Group immutable _group;
    uint256 immutable _index;
    mapping(address => mapping(address => uint256)) internal _mAllowed;
    bytes32 internal immutable _name; // work only for string that can fit into 32 bytes
    bytes32 internal immutable _symbol; // work only for string that can fit into 32 bytes
}
