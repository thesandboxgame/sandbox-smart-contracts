import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";
import { abi } from "../test/operatorRegistryABI";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const {
    deployer,
    filterOperatorSubscription,
    trustedForwarder,
    upgradeAdmin,
  } = await getNamedAccounts();


  await deploy("Asset", {
    from: deployer,
    contract: "Asset",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          trustedForwarder,
          [1, 2, 3, 4, 5, 6],
          [2, 4, 6, 8, 10, 12],
          "ipfs://",
          filterOperatorSubscription
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;

func.tags = ["Asset"];
func.dependencies = ["OPERATOR_FILTER_REGISTRY", "OperatorSubscriber"];
