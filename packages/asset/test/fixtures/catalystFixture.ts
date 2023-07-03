import { deployments, getUnnamedAccounts } from "hardhat";
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from "../../constants";

export const runCatalystSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    const {
      deployer,
      upgradeAdmin,
      catalystMinter,
      catalystAdmin,
      catalystRoyaltyRecipient,
      trustedForwarder,
    } = await getNamedAccounts();
    const { deploy } = deployments;
    const users = await getUnnamedAccounts();
    const user1 = users[0];
    const user2 = users[1];
    const user3 = users[3];

    const OperatorFilterSubscriptionContract = await ethers.getContractFactory(
      "OperatorFilterSubscription"
    );
    const OperatorFilterSubscription =
      await OperatorFilterSubscriptionContract.deploy();

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
            catalystAdmin, // DEFAULT_ADMIN_ROLE
            catalystMinter, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
        },
        upgradeIndex: 0,
      },
      skipIfAlreadyDeployed: true,
    });
    
    const catalyst = await ethers.getContract("Catalyst");
    const catalystAsAdmin = await catalyst.connect(
      ethers.provider.getSigner(catalystAdmin)
    );
    const minterRole = await catalyst.MINTER_ROLE();
    const catalystAdminRole = await catalyst.DEFAULT_ADMIN_ROLE();
    const catalystAsMinter = await catalyst.connect(
      ethers.provider.getSigner(catalystMinter)
    );
    return {
      deployer,
      catalyst,
      user1,
      user2,
      minterRole,
      catalystAsAdmin,
      catalystAsMinter,
      catalystAdminRole,
      upgradeAdmin,
      catalystMinter,
      catalystAdmin,
      catalystRoyaltyRecipient,
      trustedForwarder,
      OperatorFilterSubscription,
    };
  }
);
