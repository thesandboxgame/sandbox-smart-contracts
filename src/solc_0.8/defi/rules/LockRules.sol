//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract LockRules is Context, Ownable {
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

    // This is used to implement a time buffer for reward retrieval, so the used cannot re-stake the rewards too fast.
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

    /// @notice set the lockPeriodInSecs for the anti-compound buffer
    /// @param lockPeriodInSecs amount of time the user must wait between reward withdrawal
    function setTimelockClaim(uint256 lockPeriodInSecs) external onlyOwner {
        timeLockClaim.lockPeriodInSecs = lockPeriodInSecs;
    }

    function setTimelockDeposit(uint256 newTimeDeposit) external onlyOwner {
        lockDeposit.lockPeriodInSecs = newTimeDeposit;
    }

    function setTimeLockWithdraw(uint256 newTimeWithdraw) external onlyOwner {
        lockWithdraw.lockPeriodInSecs = newTimeWithdraw;
    }

    function setAmountLockClaim(uint256 newAmountLockClaim, bool isEnabled) external onlyOwner {
        amountLockClaim.amount = newAmountLockClaim;
        amountLockClaim.claimLockEnabled = isEnabled;
    }

    function getRemainingTimelockClaim() external view returns (uint256) {
        return block.timestamp - (timeLockClaim.lastClaim[_msgSender()] + timeLockClaim.lockPeriodInSecs);
    }

    function getRemainingTimelockWithdraw() external view returns (uint256) {
        return block.timestamp - (lockWithdraw.lastWithdraw[_msgSender()] + lockWithdraw.lockPeriodInSecs);
    }

    function getRemainingTimelockDeposit() external view returns (uint256) {
        return block.timestamp - (lockDeposit.lastDeposit[_msgSender()] + lockDeposit.lockPeriodInSecs);
    }
}
