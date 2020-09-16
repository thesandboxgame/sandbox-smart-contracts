const {Contract} = require("ethers");
const {ethers} = require("@nomiclabs/buidler");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {deployer, sandAdmin} = await getNamedAccounts();

  const rewardPoolAsDeployed = await deployments.get("GoerliSANDRewardPool");
  const rewardPoolABI = rewardPoolAsDeployed.abi;
  const rewardPoolAddress = rewardPoolAsDeployed.receipt.contractAddress;

  const rewardPool = new Contract(rewardPoolAddress, rewardPoolABI, ethers.provider.getSigner(deployer));

  const rewardPoolAsDeployer = rewardPool.connect(ethers.provider.getSigner(deployer));
  const rewardPoolAsAdmin = rewardPool.connect(ethers.provider.getSigner(sandAdmin));

  log("setting sandAdmin as Reward Distribution");
  await rewardPoolAsDeployer.functions.setRewardDistribution(sandAdmin, {gasLimit: 1000000}).then((tx) => tx.wait());

  log("notifying the Reward Amount");
  await rewardPoolAsAdmin.functions.notifyRewardAmount(3000000, {gasLimit: 1000000}).then((tx) => tx.wait());
};
module.exports.dependencies = ["GoerliSANDRewardPool", "Sand"];
