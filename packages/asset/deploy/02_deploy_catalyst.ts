import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  CATALYST_BASE_URI,
  CATALYST_ROYALTY_BPS_PER_TIER,
  CATALYST_ROYALTY_TREASURY_ADDRESS,
  TRUSTED_FORWARDER_ADDRESS,
} from "../constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer, upgradeAdmin, catalystAdmin, catalystMinter } =
    await getNamedAccounts();

  const OperatorFilterSubscription = await deployments.get(
    "OperatorFilterSubscription"
  );

  await deploy("Catalyst", {
    from: deployer,
    log: true,
    contract: "Catalyst",
    proxy: {
      owner: upgradeAdmin,
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        methodName: "initialize",
        args: [
          CATALYST_BASE_URI,
          TRUSTED_FORWARDER_ADDRESS,
          CATALYST_ROYALTY_TREASURY_ADDRESS,
          OperatorFilterSubscription.address,
          catalystAdmin,
          catalystMinter,
          CATALYST_ROYALTY_BPS_PER_TIER,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ["Catalyst"];
func.dependencies = ["ProxyAdmin", "OperatorFilterSubscription"];
