import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { abi , byteCode } from "../test/operatorRegistryABI";
import { factoryABI, factoryByteCode
 } from "../test/factoryABI";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, ethers } = hre;
  const {
    filterOperatorSubscription,
  } = await getNamedAccounts();

  const operatorFilterRegistry = await hre.ethers.getContractAt(
    abi,
    OPERATOR_FILTER_REGISTRY
  );

  const registered = await operatorFilterRegistry.isRegistered(
    filterOperatorSubscription
  );

  // this registered check is there so that the asset minter test setup doesn't fail.
  if (!registered) {
    console.log("common subscription registered on operator filter registry")
    const tnx = await operatorFilterRegistry
      .connect(hre.ethers.provider.getSigner(filterOperatorSubscription))
      .registerAndCopyEntries(filterOperatorSubscription, DEFAULT_SUBSCRIPTION);

    await tnx.wait();
  }
};
export default func;

func.tags = ["Operator_Subscriber"];
