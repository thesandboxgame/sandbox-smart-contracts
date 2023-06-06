import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";
import { abi } from "../test/operatorRegistryABI";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, filterOperatorSubscription, trustedForwarder } =
    await getNamedAccounts();

  // OperatorFilterRegistry address is 0x000000000000AAeB6D7670E522A718067333cd4E
  // unless using local network, where we make our own deployment of it
  const operatorFilterRegistry = await deployments.get(
    "OperatorFilterRegistry"
  );

  await deploy("Asset", {
    from: deployer,
    contract: "Asset",
    proxy: {
      owner: deployer,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          trustedForwarder,
          [1, 2, 3, 4, 5, 6],
          [2, 4, 6, 8, 10, 12],
          "ipfs://",
          filterOperatorSubscription,
          operatorFilterRegistry.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });

  // // get asset from deployment
  // const asset = await deployments.get("Asset");

  // // get asset from ethers
  // const asset2 = await hre.ethers.getContract("Asset");

  // if (asset.address == asset2.address)
  //   console.log("asset address is same from both ethers and deployments");

  // const operatorFilterRegistry = await hre.ethers.getContractAt(
  //   abi,
  //   OPERATOR_FILTER_REGISTRY
  // );

  // const registeredFilterOperatorSubscription =
  //   await operatorFilterRegistry.isRegistered(filterOperatorSubscription);

  // if (registeredFilterOperatorSubscription)
  //   console.log(
  //     "filterOperatorSubscription is registered. Checked in deployment"
  //   );

  // const registeredAsset = await operatorFilterRegistry.isRegistered(
  //   asset.address
  // );

  // if (registeredAsset)
  //   console.log("Asset is registered. Checked in deployment");
};
export default func;

func.tags = ["Asset"];
func.dependencies = ["OperatorFilterRegistry", "OperatorSubscriber"];
