import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, upgradeAdmin, trustedForwarder, tsbAssetMinter } =
    await getNamedAccounts();

  const AssetContract = await deployments.get("Asset");
  const CatalystContract = await deployments.get("Catalyst");
  const AuthValidator = await deployments.get("AuthValidator");

  await deploy("AssetMinter", {
    from: deployer,
    contract: "AssetMinter",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          trustedForwarder,
          AssetContract.address,
          CatalystContract.address,
          tsbAssetMinter,
          AuthValidator.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;
func.dependencies = ["Asset", "Catalyst", "AuthValidator"];
func.tags = ["AssetMinter"];
