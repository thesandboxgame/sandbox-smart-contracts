pragma solidity 0.5.9;

import {ERC20} from "../../contracts_common/src/Interfaces/ERC20.sol";

contract LockedFundWithReleaseSchedule {

    ERC20 _erc20;
    address _from;

    struct Lock {
        uint128 period;
        uint128 amountPerPeriod;

        uint128 amountLeft;
        uint128 nextTime;
    }
    mapping (address => Lock) _locks;

    function getAmountLeft(address to) external view returns(uint256) {
        return _locks[to].amountLeft;
    }

    function getUnlockedAmountAt(address to, uint128 timestamp) external view returns(uint256) {
        uint128 timePassed = timestamp - _locks[to].nextTime;
        uint128 numPeriodsPassed = _getNumPeriodsPassed(timePassed, _locks[to].period);
        return _getAmountToWithdraw(numPeriodsPassed, _locks[to].amountPerPeriod, _locks[to].amountLeft);
    }

    event Deposit(address from, address to, uint256 amount);
    event Withdrawal(address to, uint256 amount);
    event AllFundUnlocked(address to);

    constructor(ERC20 erc20, address from) public {
        _erc20 = erc20;
        _from = from;
    }

    function lock(address to, uint128 amount, uint128 firstWithdrawal, uint128 period, uint128 numPeriods) external {
        require(msg.sender == _from, "only the specified sender is allowed to lock"); // TODO instead comparmentalise locks per sender

        require(_locks[to].amountLeft == 0, "cannot lock while fund already locked");
        require(amount > 0, "amount == 0");
        require(period > 0, "period == 0");
        require(numPeriods > 0, "numPeriods  == 0");
        require(firstWithdrawal + period * numPeriods < 2**128, "time lengths too big");

        uint128 amountPerPeriod = amount / numPeriods;

        _locks[to].period = period;
        _locks[to].amountPerPeriod = amountPerPeriod;

        _locks[to].amountLeft = amount;
        _locks[to].nextTime = firstWithdrawal;

        require(_erc20.transferFrom(msg.sender, address(this), uint256(amount)), "could not lock tokens");

        uint256 extra = amount - (numPeriods * amountPerPeriod);
        if(extra > 0) {
            require(_erc20.transferFrom(msg.sender, to, extra), "could not send extra tokens");
        }

        emit Deposit(msg.sender, to, amount);

        // solium-disable-next-line security/no-block-members
        if(block.timestamp >= firstWithdrawal) {
            withdraw(to);
        }
    }

    function _getNumPeriodsPassed(
        uint128 timePassed,
        uint128 period
    ) internal view returns (uint128) {
        return (1 + (timePassed / period));
    }

    function _getAmountToWithdraw(
        uint128 numPeriodsPassed,
        uint128 amountPerPeriod,
        uint128 amountLeft
    ) internal view returns (uint128) {
        uint128 amountToWithdraw = numPeriodsPassed * amountPerPeriod;

        if(amountLeft < amountToWithdraw) {
            amountToWithdraw = amountLeft;
        }
        return amountToWithdraw;
    }

    function withdraw(address to) public {
        uint128 nextTime = _locks[to].nextTime;
        uint128 period = _locks[to].period;
        uint128 amountPerPeriod = _locks[to].amountPerPeriod;
        uint128 amountLeft = _locks[to].amountLeft;

        // solium-disable-next-line security/no-block-members
        require(block.timestamp >= nextTime, "too early");
        require(amountLeft > 0, "no more funds");

        // solium-disable-next-line security/no-block-members
        uint128 timePassed = uint128(block.timestamp - nextTime);
        uint128 numPeriodsPassed = _getNumPeriodsPassed(timePassed, period);
        uint128 amountToWithdraw = _getAmountToWithdraw(numPeriodsPassed, amountPerPeriod, amountLeft);

        _locks[to].amountLeft = amountLeft - amountToWithdraw;
        _locks[to].nextTime = _locks[to].nextTime + numPeriodsPassed * _locks[to].period;
        require(_erc20.transferFrom(address(this), to, amountToWithdraw), "could not transfer token");

        emit Withdrawal(to, amountToWithdraw);

        if(amountLeft == amountToWithdraw) {
            emit AllFundUnlocked(to);
        }
    }
}