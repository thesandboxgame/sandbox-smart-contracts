import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  let operatorFilterRegistry = await deployments.getOrNull(
    "OPERATOR_FILTER_REGISTRY"
  );
  // Deploy if needed: external contract is not available on local network
  if (!operatorFilterRegistry) {
    operatorFilterRegistry = await deploy("OPERATOR_FILTER_REGISTRY", {
      from: deployer,
      contract: "OperatorFilterRegistry",
      log: true,
    });
  }
};
export default func;
func.tags = ["OPERATOR_FILTER_REGISTRY"];
