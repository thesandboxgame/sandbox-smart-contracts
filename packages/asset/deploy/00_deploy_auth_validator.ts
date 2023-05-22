import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, assetAdmin, backendSigner } = await getNamedAccounts();

  await deploy("AuthValidator", {
    from: deployer,
    contract: "AuthValidator",
    args: [assetAdmin, backendSigner],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ["AuthValidator"];
