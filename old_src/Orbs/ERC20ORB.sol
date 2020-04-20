pragma solidity 0.5.9;

import {ERC20} from "../../contracts_common/src/Interfaces/ERC20.sol";
import {
    ERC20Events
} from "../../contracts_common/src/Interfaces/ERC20Events.sol";
import "../../contracts_common/src/Libraries/SafeMath.sol";
import "../../contracts_common/src/BaseWithStorage/SuperOperators.sol";

import "./ORBCore.sol";

contract ERC20ORB is
    ERC20Events,
    SuperOperators /*is ERC20*/
{
    using SafeMath for uint256;

    struct Origin {
        ORBCore core;
        uint8 index;
    }

    Origin origin;
    mapping(address => mapping(address => uint256)) internal mAllowed;

    constructor(ORBCore _core, uint8 _index) public {
        origin = Origin(_core, _index);
    }

    function totalSupply() public view returns (uint256) {
        return origin.core.supplyOf(origin.index);
    }

    function balanceOf(address who) public view returns (uint256) {
        return origin.core.balanceOf(who, origin.index);
    }

    function decimals() public view returns (uint8) {
        return uint8(18);
    }

    function transfer(address _to, uint256 _amount)
        public
        returns (bool success)
    {
        _transfer(msg.sender, _to, _amount);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _amount)
        public
        returns (bool success)
    {
        if (msg.sender != _from && !_superOperators[msg.sender]) {
            uint256 allowance = mAllowed[_from][msg.sender];
            if (allowance != (2**256) - 1) {
                // save gas when allowance is maximal by not reducing it (see https://github.com/ethereum/EIPs/issues/717)
                require(allowance >= _amount, "Not enough funds allowed");
                mAllowed[_from][msg.sender] = allowance.sub(_amount);
            }
        }
        _transfer(_from, _to, _amount);
        return true;
    }

    function approve(address _spender, uint256 _amount)
        public
        returns (bool success)
    {
        _approveFor(msg.sender, _spender, _amount);
        return true;
    }

    function approveFor(address from, address _spender, uint256 _amount)
        public
        returns (bool success)
    {
        require(
            msg.sender == from || _superOperators[msg.sender],
            "msg.sender != from || superOperator"
        );
        _approveFor(from, _spender, _amount);
        return true;
    }

    function _approveFor(address _owner, address _spender, uint256 _amount)
        internal
    {
        require(
            _owner != address(0) && _spender != address(0),
            "Cannot approve with 0x0"
        );
        mAllowed[_owner][_spender] = _amount;
        emit Approval(_owner, _spender, _amount);
    }

    function allowance(address _owner, address _spender)
        public
        view
        returns (uint256 remaining)
    {
        return mAllowed[_owner][_spender];
    }

    function _transfer(address _from, address _to, uint256 _amount) internal {
        origin.core.transferFrom(_from, _to, origin.index, _amount);
    }

    function emitTransferEvent(address _from, address _to, uint256 _amount)
        external
    {
        require(msg.sender == address(origin.core), "only core");
        emit Transfer(_from, _to, _amount);
    }
}
