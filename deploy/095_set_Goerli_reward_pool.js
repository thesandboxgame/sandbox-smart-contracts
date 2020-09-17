const {Contract, BigNumber} = require("ethers");
const {ethers} = require("@nomiclabs/buidler");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, log} = deployments;

  const {deployer, sandAdmin} = await getNamedAccounts();

  const rewardAmount = BigNumber.from(2500000).mul("1000000000000000000");

  const rewardPoolAsDeployed = await deployments.get("GoerliSANDRewardPool");
  const rewardPoolABI = rewardPoolAsDeployed.abi;
  const rewardPoolAddress = rewardPoolAsDeployed.receipt.contractAddress;

  const rewardPool = new Contract(rewardPoolAddress, rewardPoolABI, ethers.provider.getSigner(deployer));

  const rewardPoolAsDeployer = rewardPool.connect(ethers.provider.getSigner(deployer));
  const rewardPoolAsAdmin = rewardPool.connect(ethers.provider.getSigner(sandAdmin));

  log("setting sandAdmin as Reward Distribution");
  await rewardPoolAsDeployer.functions.setRewardDistribution(sandAdmin, {gasLimit: 1000000}).then((tx) => tx.wait());

  // transfer SAND reward to rewardPoolAddress
  log("transferring SAND reward");
  await execute("Sand", {from: deployer, skipUnknownSigner: true}, "transfer", rewardPoolAddress, rewardAmount);

  log("notifying the Reward Amount");
  await rewardPoolAsAdmin.functions.notifyRewardAmount(rewardAmount, {gasLimit: 1000000}).then((tx) => tx.wait());
};
module.exports.skip = async () => true;
module.exports.dependencies = ["GoerliSANDRewardPool", "Sand"];
