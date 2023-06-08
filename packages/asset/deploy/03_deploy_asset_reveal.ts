import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, upgradeAdmin, trustedForwarder } = await getNamedAccounts();

  const AssetContract = await deployments.get("Asset");
  const AuthValidatorContract = await deployments.get("AuthValidator");

  const name = "Sandbox Asset Reveal";
  const version = "1.0";

  await deploy("AssetReveal", {
    from: deployer,
    contract: "AssetReveal",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          name,
          version,
          AssetContract.address,
          AuthValidatorContract.address,
          trustedForwarder,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;

func.tags = ["AssetReveal"];
func.dependencies = ["Asset", "AuthValidator"];
