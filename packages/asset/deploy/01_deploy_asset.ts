import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";
import { abi } from "../test/operatorRegistryABI";



const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, filterOperatorSubscription, upgradeAdmin, trustedForwarder } =
    await getNamedAccounts();

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
  });

  // get asset from deployment
  const asset = await  deployments.get("Asset");

  // get asset from ethers
  const asset2 = await hre.ethers.getContract("Asset")
  
  if(asset.address == asset2.address) console.log("asset address is same from both ethers and deployments")


  const operatorFilterRegistry = await hre.ethers.getContractAt(
    abi,
    OPERATOR_FILTER_REGISTRY
  );

  const registered = await operatorFilterRegistry.isRegistered(
    filterOperatorSubscription
  );

  if(registered) console.log("Asset is registered. Checked in deployment")

};
export default func;

func.tags = ["Asset"];

func.dependencies = ["Operator_Subscriber"];
