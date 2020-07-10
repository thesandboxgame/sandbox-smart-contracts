pragma solidity 0.6.5;

import "../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../contracts_common/src/BaseWithStorage/SuperOperators.sol";
import "../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

import "./ERC20Group.sol";


contract ERC20SubToken {
    // TODO add natspec, currently blocked by solidity compiler issue
    event Transfer(address indexed from, address indexed to, uint256 value);

    // TODO add natspec, currently blocked by solidity compiler issue
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

    /// @notice the tokenId in ERC20Group
    /// @return the tokenId in ERC20Group
    function groupTokenId() external view returns (uint256) {
        return _index;
    }

    /// @notice the ERC20Group address
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
        if (msg.sender != from && !_group.isAuthorizedToTransfer(from, msg.sender)) {
            uint256 allowance = _mAllowed[from][msg.sender];
            if (allowance != ~uint256(0)) {
                // save gas when allowance is maximal by not reducing it (see https://github.com/ethereum/EIPs/issues/717)
                require(allowance >= amount, "NOT_AUTHOIZED_ALLOWANCE");
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
        require(msg.sender == from || _group.isAuthorizedToApprove(msg.sender), "NOT_AUTHORIZED");
        _approveFor(from, spender, amount);
        return true;
    }

    function emitTransferEvent(
        address from,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == address(_group), "NOT_AUTHORIZED_GROUP_ONLY");
        emit Transfer(from, to, amount);
    }

    // /////////////////// INTERNAL ////////////////////////

    function _approveFor(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0) && spender != address(0), "INVALID_FROM_OR_SPENDER");
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
    using SafeMathWithRequire for uint256;

    // //////////////////// CONSTRUCTOR /////////////////////
    constructor(
        ERC20Group group,
        uint256 index,
        string memory tokenName,
        string memory tokenSymbol
    ) public {
        _group = group;
        _index = index;
        require(bytes(tokenName).length != 0, "INVALID_NAME_REQUIRED");
        require(bytes(tokenName).length <= 32, "INVALID_NAME_TOO_LONG");
        _name = _firstBytes32(bytes(tokenName));
        require(bytes(tokenSymbol).length != 0, "INVALID_SYMBOL_REQUIRED");
        require(bytes(tokenSymbol).length <= 32, "INVALID_SYMBOL_TOO_LONG");
        _symbol = _firstBytes32(bytes(tokenSymbol));
    }

    // ////////////////////// DATA ///////////////////////////
    ERC20Group immutable _group;
    uint256 immutable _index;
    mapping(address => mapping(address => uint256)) internal _mAllowed;
    bytes32 internal immutable _name; // work only for string that can fit into 32 bytes
    bytes32 internal immutable _symbol; // work only for string that can fit into 32 bytes
}
