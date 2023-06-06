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
    catalystAdmin,
    catalystMinter,
    catalystRoyaltyRecipient,
    trustedForwarder,
  } = await getNamedAccounts();
  const OperatorFilterSubscription = await deployments.get(
    "OperatorFilterSubscription"
  );
  const OperatorFilterRegistry = await deployments.get(
    "OperatorFilterRegistry"
  );
  // OperatorFilterRegistry address is 0x000000000000AAeB6D7670E522A718067333cd4E
  // unless using local network, where we make our own deployment of it

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
          catalystRoyaltyRecipient,
          OperatorFilterSubscription.address,
          OperatorFilterRegistry.address,
          catalystAdmin,
          catalystMinter,
          CATALYST_DEFAULT_ROYALTY,
          CATALYST_IPFS_CID_PER_TIER,
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
