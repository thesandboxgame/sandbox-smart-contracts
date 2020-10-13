const {BigNumber} = require("ethers");
const SOL_PRECISION = BigNumber.from(1).mul("1000000000000000000000000000000");

// LandWeightedSANDRewardPool.sol helper functions

// STEPS
// 1 -  Admin initiate by calling notifyRewardAmount:
// a) updateReward is called: rewardPerTokenStored is 0. lastUpdateTime is not set.
// b) rewardRate is set.
// c) lastUpdateTime is set to start time.
// 2 - User stakes:
// a) updateReward is called: rewardPerTokenStored is still 0 because contributions are stll 0
// b) lastUpdateTime is NOT updated because contributions are stll 0
// c) User rewards are updated (but they are 0)
// d) amount is staked and contribution is calculated
// 3 - User earns: contribution x 0.add(time since start.mul(rewardRate).mul(1e30).div(contribution)).div(1e30)


// To calculate latest reward per token stored
// uint256 remainingTime = periodFinish.sub(block.timestamp); // initially 0
// uint256 leftoverReward = remainingTime.mul(rewardRate); // initially 0
// rewardRate = reward.add(leftoverReward).div(DURATION); // initially wholeReward/duration, i.e. SAND per second
module.exports.replicateRewardPerToken = (
  rewardPerTokenStored,
  lastTimeRewardApplicable,
  lastUpdateTime,
  rewardRate,
  totalContributions
) => {
  const timeDifference = lastTimeRewardApplicable.sub(lastUpdateTime);
  return rewardPerTokenStored.add(timeDifference.mul(rewardRate).mul(SOL_PRECISION).div(totalContributions));
};

module.exports.replicateEarned = (contribution, rewardPerToken) => {
  return contribution.mul(rewardPerToken).div(SOL_PRECISION);
};
