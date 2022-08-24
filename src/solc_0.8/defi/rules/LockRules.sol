//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";

// Note: this contract is meant to be inherited by ERC20RewardPool.
// we should override the renounceOwnership() method otherwise.
contract LockRules is Context, Ownable {
    // limits
    uint256 public constant timeLockLimit = 180 days;
    uint256 public constant amountLockLimit = 1000 ether;

    struct TimeLockClaim {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastClaim;
    }

    struct AmountLockClaim {
        uint256 amount;
        bool claimLockEnabled;
    }

    struct TimeLockWithdraw {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastWithdraw;
    }

    struct TimeLockDeposit {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastDeposit;
    }

    event TimelockClaimSet(uint256 lockPeriodInSecs);
    event TimelockDepositSet(uint256 newTimeDeposit);
    event TimeLockWithdrawSet(uint256 newTimeWithdraw);
    event AmountLockClaimSet(uint256 newAmountLockClaim, bool isEnabled);

    // This is used to implement a time buffer for reward retrieval, so the user cannot re-stake the rewards too fast.
    TimeLockClaim public timeLockClaim;
    AmountLockClaim public amountLockClaim;
    TimeLockWithdraw public lockWithdraw;
    TimeLockDeposit public lockDeposit;

    modifier timeLockClaimCheck(address account) {
        // We use lockPeriodInSecs == 0 to disable this check
        if (timeLockClaim.lockPeriodInSecs != 0) {
            require(
                block.timestamp > timeLockClaim.lastClaim[account] + timeLockClaim.lockPeriodInSecs,
                "LockRules: Claim must wait"
            );
        }
        timeLockClaim.lastClaim[account] = block.timestamp;
        _;
    }

    modifier antiWithdrawCheck(address account) {
        // We use lockPeriodInSecs == 0 to disable this check
        if (lockWithdraw.lockPeriodInSecs != 0) {
            require(
                block.timestamp > lockWithdraw.lastWithdraw[account] + lockWithdraw.lockPeriodInSecs,
                "LockRules: Withdraw must wait"
            );
        }
        lockWithdraw.lastWithdraw[account] = block.timestamp;
        _;
    }

    modifier antiDepositCheck(address account) {
        // We use lockPeriodInSecs == 0 to disable this check
        if (lockDeposit.lockPeriodInSecs != 0) {
            require(
                block.timestamp > lockDeposit.lastDeposit[account] + lockDeposit.lockPeriodInSecs,
                "LockRules: Deposit must wait"
            );
        }
        lockDeposit.lastDeposit[account] = block.timestamp;
        _;
    }

    /// @notice set the _lockPeriodInSecs for the anti-compound buffer
    /// @param _lockPeriodInSecs amount of time the user must wait between reward withdrawal
    function setTimelockClaim(uint256 _lockPeriodInSecs) external onlyOwner {
        require(_lockPeriodInSecs <= timeLockLimit, "LockRules: invalid lockPeriodInSecs");
        timeLockClaim.lockPeriodInSecs = _lockPeriodInSecs;

        emit TimelockClaimSet(_lockPeriodInSecs);
    }

    function setTimelockDeposit(uint256 _newTimeDeposit) external onlyOwner {
        require(_newTimeDeposit <= timeLockLimit, "LockRules: invalid lockPeriodInSecs");
        lockDeposit.lockPeriodInSecs = _newTimeDeposit;

        emit TimelockDepositSet(_newTimeDeposit);
    }

    function setTimeLockWithdraw(uint256 _newTimeWithdraw) external onlyOwner {
        require(_newTimeWithdraw <= timeLockLimit, "LockRules: invalid lockPeriodInSecs");
        lockWithdraw.lockPeriodInSecs = _newTimeWithdraw;

        emit TimeLockWithdrawSet(_newTimeWithdraw);
    }

    function setAmountLockClaim(uint256 _newAmountLockClaim, bool _isEnabled) external onlyOwner {
        require(_newAmountLockClaim <= amountLockLimit, "LockRules: invalid newAmountLockClaim");
        amountLockClaim.amount = _newAmountLockClaim;
        amountLockClaim.claimLockEnabled = _isEnabled;

        emit AmountLockClaimSet(_newAmountLockClaim, _isEnabled);
    }

    function getRemainingTimelockClaim() external view returns (uint256) {
        uint256 timeLock = (timeLockClaim.lastClaim[_msgSender()] + timeLockClaim.lockPeriodInSecs);

        if (timeLock > block.timestamp) {
            return timeLock - block.timestamp;
        } else {
            return 0;
        }
    }

    function getRemainingTimelockWithdraw() external view returns (uint256) {
        uint256 timeLock = (lockWithdraw.lastWithdraw[_msgSender()] + lockWithdraw.lockPeriodInSecs);

        if (timeLock > block.timestamp) {
            return timeLock - block.timestamp;
        } else {
            return 0;
        }
    }

    function getRemainingTimelockDeposit() external view returns (uint256) {
        uint256 timeLock = (lockDeposit.lastDeposit[_msgSender()] + lockDeposit.lockPeriodInSecs);

        if (timeLock > block.timestamp) {
            return timeLock - block.timestamp;
        } else {
            return 0;
        }
    }
}
