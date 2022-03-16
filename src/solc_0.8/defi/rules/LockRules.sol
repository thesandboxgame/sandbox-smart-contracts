//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

contract LockRules {
    struct AntiCompound {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastClaim;
    }

    //TODO missing this modifier -> together with AntiCompound?
    struct LockClaim {
        uint256 amount;
        bool claimLockEnabled;
    }

    struct LockWithdraw {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastWithdraw;
    }

    struct LockDeposit {
        uint256 lockPeriodInSecs;
        mapping(address => uint256) lastDeposit;
    }

    // This is used to implement a time buffer for reward retrieval, so the used cannot re-stake the rewards too fast.
    AntiCompound public antiCompound;
    LockClaim public lockClaim;
    LockWithdraw public lockWithdraw;
    LockDeposit public lockDeposit;

    // TODO: same as setAntiCompoundLockPeriod()
    // function setTimeLockClaim(uint256 newTimeLock) external{}

    modifier antiCompoundCheck(address account) {
        // We use lockPeriodInSecs == 0 to disable this check
        if (antiCompound.lockPeriodInSecs != 0) {
            require(
                block.timestamp > antiCompound.lastClaim[account] + antiCompound.lockPeriodInSecs,
                "MultiStakingPool: Claim must wait"
            );
        }
        antiCompound.lastClaim[account] = block.timestamp;
        _;
    }

    modifier antiWithdrawCheck(address account) {
        // We use lockPeriodInSecs == 0 to disable this check
        if (lockWithdraw.lockPeriodInSecs != 0) {
            require(
                block.timestamp > lockWithdraw.lastWithdraw[account] + lockWithdraw.lockPeriodInSecs,
                "MultiStakingPool: Withdraw must wait"
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
                "MultiStakingPool: Deposit must wait"
            );
        }
        lockDeposit.lastDeposit[account] = block.timestamp;
        _;
    }
}
