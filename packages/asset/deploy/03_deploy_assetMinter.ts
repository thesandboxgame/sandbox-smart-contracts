import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, revealer, upgradeAdmin, trustedForwarder } =
    await getNamedAccounts();

  const AssetContract = await deployments.get("Asset");
  const CatalystContract = await deployments.get("Catalyst");

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
          deployer,
          revealer,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;
func.dependencies = ["Asset", "Catalyst"];
func.tags = ["AssetMinter"];
