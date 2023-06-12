import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { DEFAULT_SUBSCRIPTION } from "../constants";
import { deployments } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre;
  const { filterOperatorSubscription } = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.getOrNull(
    "OPERATOR_FILTER_REGISTRY"
  );

  if (operatorFilterRegistry) {
    const operatorFilterRegistry = await hre.ethers.getContract(
    "OPERATOR_FILTER_REGISTRY"
    );
    const registered = await operatorFilterRegistry.isRegistered(
      filterOperatorSubscription
    );

    const operatorFilterSubscription = await hre.ethers.getContract(
      "OperatorFilterSubscription"
    );

    const registeredOperatorFilterSubscription =
      await operatorFilterRegistry.isRegistered(
        operatorFilterSubscription.address
      );

    // register operatorFilterSubscription
    if (!registeredOperatorFilterSubscription) {
      const tn = await operatorFilterRegistry.register(
        operatorFilterSubscription.address
      );

      await tn.wait();
    }

    // register filterOperatorSubscription
    if (!registered) {
      const tnx = await operatorFilterRegistry
        .connect(hre.ethers.provider.getSigner(filterOperatorSubscription))
        .registerAndCopyEntries(
          filterOperatorSubscription,
          DEFAULT_SUBSCRIPTION
        );

      await tnx.wait();
      console.log(
        "common subscription registered on operator filter registry and opensea's blacklist copied"
      );
    }
  }
};
export default func;

func.tags = ["OperatorSubscriber"];
func.dependencies = [
  "OperatorFilterSubscription",
];
