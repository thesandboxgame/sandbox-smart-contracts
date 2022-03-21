//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

contract LockRules {
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
}
