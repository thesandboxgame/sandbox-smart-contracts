pragma solidity 0.6.5;

import {ERC20} from "../contracts_common/src/Interfaces/ERC20.sol";
import {ERC20Events} from "../contracts_common/src/Interfaces/ERC20Events.sol";
import "../contracts_common/src/Libraries/SafeMath.sol";
import "../contracts_common/src/BaseWithStorage/SuperOperators.sol";

import "./ERC20Group.sol";


contract ERC20SubToken is
    ERC20Events,
    SuperOperators /*, ERC20 */
{
    struct Origin {
        ERC20Group group;
        uint96 index;
    }

    function totalSupply() external view returns (uint256) {
        return _origin.group.supplyOf(_origin.index);
    }

    function balanceOf(address who) external view returns (uint256) {
        return _origin.group.balanceOf(who, _origin.index);
    }

    function decimals() external pure returns (uint8) {
        return uint8(18); // TODO
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
        if (msg.sender != from && !_superOperators[msg.sender] && !_origin.group.isApprovedForAll(from, msg.sender)) {
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
        require(msg.sender == from || _superOperators[msg.sender], "msg.sender != from || superOperator"); // TODO metatx
        _approveFor(from, spender, amount);
        return true;
    }

    function setSubTokenIndex(ERC20Group group, uint256 index) external {
        require(address(_origin.group) == address(0), "already part of a group");
        require(index < 2**96, "out of bound");
        _origin = Origin(group, uint96(index));
    }

    function emitTransferEvent(
        address from,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == address(_origin.group), "only core");
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
        _origin.group.singleTransferFrom(from, to, _origin.index, amount);
    }

    // ///////////////////// UTILITIES ///////////////////////
    using SafeMath for uint256;

    // ////////////////////// DATA ///////////////////////////
    Origin _origin;
    mapping(address => mapping(address => uint256)) internal _mAllowed;
}
