const {guard} = require("../lib");
const {BigNumber} = require("ethers");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, log} = deployments;
  const {deployer, sandAdmin, sandBeneficiary} = await getNamedAccounts();

  // Monthly reward 1,500,000 SAND
  const REWARD_AMOUNT = BigNumber.from(1500000).mul("1000000000000000000");
  const REWARD_NAME = "RinkebySANDRewardPool";

  const rewardPool = await deployments.get(REWARD_NAME);

  log("setting sandAdmin as Reward Distribution");
  await execute(
    REWARD_NAME,
    {from: deployer, skipUnknownSigner: true, gasLimit: 1000000},
    "setRewardDistribution",
    sandAdmin
  );

  log("transferring SAND reward to the Reward Pool");
  await execute(
    "Sand",
    {from: sandBeneficiary, skipUnknownSigner: true, gasLimit: 1000000},
    "transfer",
    rewardPool.address,
    REWARD_AMOUNT
  );

  log("notifying the Reward Amount");
  await execute(
    REWARD_NAME,
    {from: sandAdmin, skipUnknownSigner: true, gasLimit: 1000000},
    "notifyRewardAmount",
    REWARD_AMOUNT
  );
};
module.exports.skip = guard(["1", "314159", "4"]);
module.exports.dependencies = ["RinkebySANDRewardPool", "Sand"];
