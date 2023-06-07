import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, filterOperatorSubscription } = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.get(
    "OPERATOR_FILTER_REGISTRY"
  );

  let defaultSubscription = await deployments.getOrNull("DEFAULT_SUBSCRIPTION");
  // Deploy if needed: external contract is not available on local network
  if (!defaultSubscription) {
    defaultSubscription = await deploy("DEFAULT_SUBSCRIPTION", {
      from: deployer,
      contract: "MockOwnedRegistrant", // cannot use OpenSea's OwnedRegistrant directly; it contains hardcoded registry address
      args: [filterOperatorSubscription, operatorFilterRegistry.address],
      log: true,
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ["DEFAULT_SUBSCRIPTION"];
func.dependencies = ["OPERATOR_FILTER_REGISTRY"];
