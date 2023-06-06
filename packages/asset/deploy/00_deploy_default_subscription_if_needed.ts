import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, filterOperatorSubscription } = await getNamedAccounts();

  let defaultSubscription = await deployments.getOrNull("DEFAULT_SUBSCRIPTION");
  // Deploy if needed: external contract is not available on local network
  if (!defaultSubscription) {
    defaultSubscription = await deploy("DEFAULT_SUBSCRIPTION", {
      from: deployer,
      contract: "OwnedRegistrant",
      args: [filterOperatorSubscription],
      log: true,
    });
  }
};
export default func;
func.tags = ["DEFAULT_SUBSCRIPTION"];
