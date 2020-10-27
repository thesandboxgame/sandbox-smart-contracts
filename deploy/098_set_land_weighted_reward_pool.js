const {guard} = require("../lib");
const {BigNumber} = require("ethers");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, read, log} = deployments;
  const {deployer, liquidityRewardAdmin, liquidityRewardProvider} = await getNamedAccounts();

  // Monthly reward 1,500,000 SAND
  const REWARD_AMOUNT = BigNumber.from(1500000).mul("1000000000000000000");
  const REWARD_NAME = "LandWeightedSANDRewardPool";

  const rewardPool = await deployments.get(REWARD_NAME);

  const currentRewardDistribution = await read(REWARD_NAME, "rewardDistribution");
  if (currentRewardDistribution.toLowerCase() !== liquidityRewardAdmin.toLowerCase()) {
    log("setting liquidityRewardAdmin as Reward Distribution");
    await execute(REWARD_NAME, {from: deployer, gasLimit: 1000000}, "setRewardDistribution", liquidityRewardAdmin);
  }

  log("transferring SAND reward to the Reward Pool");
  await execute(
    "Sand",
    {from: liquidityRewardProvider, skipUnknownSigner: true, gasLimit: 1000000},
    "transfer",
    rewardPool.address,
    REWARD_AMOUNT
  );

  log("notifying the Reward Amount");
  await execute(
    REWARD_NAME,
    {from: liquidityRewardAdmin, skipUnknownSigner: true, gasLimit: 1000000},
    "notifyRewardAmount",
    REWARD_AMOUNT
  );
};
module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["LandWeightedSANDRewardPool", "Sand"];
