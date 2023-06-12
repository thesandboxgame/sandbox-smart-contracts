import {
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
  ethers,
} from "hardhat";
import { withSnapshot, setupUsers } from "../util";
import { DEFAULT_SUBSCRIPTION } from "../constants";


export const setupOperatorFilter = withSnapshot(
  ["Asset", "OperatorSubscriber"],
  async function () {
    const { deployer, upgradeAdmin, filterOperatorSubscription, trustedForwarder } =
      await getNamedAccounts();

    const otherAccounts = await getUnnamedAccounts();

    const { deploy } = deployments;

    await deploy("MockERC1155MarketPlace1", {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy("MockERC1155MarketPlace2", {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy("MockERC1155MarketPlace3", {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy("MockERC1155MarketPlace4", {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    

    const mockMarketPlace1 = await ethers.getContract(
      "MockERC1155MarketPlace1"
    );
    const mockMarketPlace2 = await ethers.getContract(
      "MockERC1155MarketPlace2"
    );
    const mockMarketPlace3 = await ethers.getContract(
      "MockERC1155MarketPlace3"
    );
    const mockMarketPlace4 = await ethers.getContract(
      "MockERC1155MarketPlace4"
    );

    await deploy('MockOperatorFilterRegistry', {
      from: deployer,
      args: [
        DEFAULT_SUBSCRIPTION,
        [mockMarketPlace1.address, mockMarketPlace2.address],
      ],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const operatorFilterRegistry = await ethers.getContract(
      "MockOperatorFilterRegistry"
    );

    const operatorFilterRegistryAsSubscription = operatorFilterRegistry.connect(
      await ethers.getSigner(filterOperatorSubscription)
    );

    const tnx = await operatorFilterRegistryAsSubscription.registerAndCopyEntries(
      filterOperatorSubscription,
      DEFAULT_SUBSCRIPTION
    );
    await tnx.wait();

    await deploy("MockAsset", {
      from: deployer,
      contract: "MockAsset",
      proxy: {
        owner: upgradeAdmin,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [
            trustedForwarder,
            [1, 2, 3, 4, 5, 6],
            [2, 4, 6, 8, 10, 12],
            "ipfs://",
            filterOperatorSubscription
          ],
        },
        upgradeIndex: 0,
      },
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const Asset = await ethers.getContract("MockAsset");
    const tnx1 = await Asset.setRegistryAndSubscribe(operatorFilterRegistry.address, filterOperatorSubscription);
    await tnx1.wait();
    const users = await setupUsers(otherAccounts, {
      Asset,
    });

    return {
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      operatorFilterRegistry,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
      users,
      deployer,
      upgradeAdmin,
      Asset,
    };
  }
);
