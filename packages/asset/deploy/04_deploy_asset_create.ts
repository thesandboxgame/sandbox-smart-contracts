import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, upgradeAdmin, trustedForwarder } = await getNamedAccounts();

  const AssetContract = await deployments.get("Asset");
  const AuthValidatorContract = await deployments.get("AuthValidator");
  const CatalystContract = await deployments.get("Catalyst");

  const name = "Sandbox Asset Create";
  const version = "1.0";

  await deploy("AssetCreate", {
    from: deployer,
    contract: "AssetCreate",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          name,
          version,
          AssetContract.address,
          CatalystContract.address,
          AuthValidatorContract.address,
          trustedForwarder,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ["AssetCreate"];
func.dependencies = ["Asset", "Catalyst", "AuthValidator"];
