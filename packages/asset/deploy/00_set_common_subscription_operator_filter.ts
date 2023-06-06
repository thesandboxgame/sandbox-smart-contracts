import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { abi, byteCode } from "../test/operatorRegistryABI";
import { factoryABI, factoryByteCode } from "../test/factoryABI";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, ethers } = hre;
  const { filterOperatorSubscription, deployer } = await getNamedAccounts();

  const operatorFilterRegistry = await hre.ethers.getContract(
    "OPERATOR_FILTER_REGISTRY"
  );

  const registered = await operatorFilterRegistry.isRegistered(
    filterOperatorSubscription
  );

  const defaultSubscription = await hre.ethers.getContract(
    "DEFAULT_SUBSCRIPTION"
  );

  const registeredDefault = await operatorFilterRegistry.isRegistered(
    defaultSubscription.address
  );

  // register default subscription
  // needed for local network since OwnedRegistrant cannot register at CANONICAL_OPERATOR_FILTER_REGISTRY_ADDRESS
  // (registry cannot be deployed at this address locally)
  if (!registeredDefault) {
    const tn = await operatorFilterRegistry.register(
      defaultSubscription.address
    );

    await tn.wait();
  }

  // this registered check is there so that the asset minter test setup doesn't fail.

  // register filterOperatorSubscription
  if (!registered) {
    const tnx = await operatorFilterRegistry
      .connect(hre.ethers.provider.getSigner(filterOperatorSubscription))
      .registerAndCopyEntries(
        filterOperatorSubscription,
        defaultSubscription.address
      );

    await tnx.wait();
    console.log("common subscription registered on operator filter registry");
  }
};
export default func;

func.tags = ["OperatorSubscriber"];
func.dependencies = ["OPERATOR_FILTER_REGISTRY", "DEFAULT_SUBSCRIPTION"];
