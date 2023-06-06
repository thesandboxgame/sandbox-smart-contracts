import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  let operatorFilterRegistry = await deployments.getOrNull(
    "OperatorFilterRegistry"
  );
  if (!operatorFilterRegistry) {
    operatorFilterRegistry = await deploy("OperatorFilterRegistry", {
      from: deployer,
      contract: "OperatorFilterRegistry",
      log: true,
    });
  }
};
export default func;
func.tags = ["OperatorFilterRegistry"];
