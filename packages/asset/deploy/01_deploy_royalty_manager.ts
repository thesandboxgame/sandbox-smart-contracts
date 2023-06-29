import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, commonRoyaltyReceiver, managerAdmin, contractRoyaltySetter } = await getNamedAccounts();
  const customSplitter = await deployments.get('CustomRoyaltySplitter');


  await deploy("RoyaltyManager", {
    from: deployer,
    contract: "RoyaltyManager",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [commonRoyaltyReceiver, 5000, customSplitter.address, managerAdmin, contractRoyaltySetter],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ["Manager"];
func.dependencies = ['CustomRoyaltySplitter'];
