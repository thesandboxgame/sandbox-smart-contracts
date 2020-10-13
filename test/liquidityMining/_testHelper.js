const {BigNumber} = require("ethers");
const {cubeRoot6} = require("local-utils");
const NFT_FACTOR_6 = BigNumber.from(1).mul("100000");
const NFT_CONSTANT_6 = BigNumber.from(9).mul("1000000");
const DECIMAL_12 = BigNumber.from(1).mul("1000000000000");
const SOL_PRECISION = BigNumber.from(1).mul("1000000000000000000000000000000");

// LandWeightedSANDRewardPool.sol helper functions

// To calculate user's contribution when staking
module.exports.replicateContribution = (stakeAmount, numLands) => {
  if (numLands === 0) {
    return stakeAmount;
  }
  const landFactor = cubeRoot6(BigNumber.from(numLands)).add(NFT_CONSTANT_6).mul(NFT_FACTOR_6);
  const additionalContributionForLands = stakeAmount.mul(landFactor).div(DECIMAL_12);
  return stakeAmount.add(additionalContributionForLands);
};

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
