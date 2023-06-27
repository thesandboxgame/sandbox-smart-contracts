import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from "../constants";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const {
    deployer,
    upgradeAdmin,
    catalystMinter,
    catalystAdmin,
    trustedForwarder,
  } = await getNamedAccounts();
  const OperatorFilterSubscription = await deployments.get(
    "OperatorFilterSubscription"
  );

  const manager = await deployments.get(
    "Manager"
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
          trustedForwarder,
          OperatorFilterSubscription.address,
          catalystAdmin, // DEFAULT_ADMIN_ROLE
          catalystMinter, // MINTER_ROLE
          CATALYST_IPFS_CID_PER_TIER,
          manager.address
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ["Catalyst"];
func.dependencies = ["ProxyAdmin", "OperatorFilterSubscription", "Manager"];
