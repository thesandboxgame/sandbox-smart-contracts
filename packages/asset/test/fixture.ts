import {
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
  ethers,
} from "hardhat";
import { withSnapshot, setupUsers } from "../util";
import { abi } from "./operatorRegistryABI";
import { OPERATOR_FILTER_REGISTRY, DEFAULT_SUBSCRIPTION } from "../constants";

export const setupOperatorFilter = withSnapshot(["Asset"], async function () {
  const {
    deployer,
    upgradeAdmin,
    filterOperatorSubscription,
  } = await getNamedAccounts();

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

  const mockERC1155MarketPlace1 = await ethers.getContract(
    "MockERC1155MarketPlace1"
  );
  const mockERC1155MarketPlace2 = await ethers.getContract(
    "MockERC1155MarketPlace2"
  );
  const mockERC1155MarketPlace3 = await ethers.getContract(
    "MockERC1155MarketPlace3"
  );
  const mockERC1155MarketPlace4 = await ethers.getContract(
    "MockERC1155MarketPlace4"
  );

  const Asset = await ethers.getContract("Asset");

  const operatorFilterRegistry = await ethers.getContractAt(
    abi,
    OPERATOR_FILTER_REGISTRY
  );

  const mockERC1155MarketPlace1CodeHash =
    await operatorFilterRegistry.codeHashOf(mockERC1155MarketPlace1.address);
  const mockERC1155MarketPlace2CodeHash =
    await operatorFilterRegistry.codeHashOf(mockERC1155MarketPlace2.address);
  const mockERC1155MarketPlace3CodeHash =
    await operatorFilterRegistry.codeHashOf(mockERC1155MarketPlace3.address);
  const mockERC1155MarketPlace4CodeHash =
    await await operatorFilterRegistry.codeHashOf(
      mockERC1155MarketPlace4.address
    );
  const operatorFilterRegistryAsSubscription = operatorFilterRegistry.connect(
    await ethers.getSigner(filterOperatorSubscription)
  );

  const isFilterOperatorSubscriptionRegistered =
    await operatorFilterRegistryAsSubscription.isRegistered(
      filterOperatorSubscription
    );

  if (isFilterOperatorSubscriptionRegistered)
    console.log("Common operator filter subscription is registered. Checked in fixture");

  const isAssetRegistered =
    await operatorFilterRegistryAsSubscription.isRegistered(Asset.address);

  if (isAssetRegistered) {
    console.log("Asset is registered. Checked in fixture");
  } else {
    console.log("Asset is not registered. Checked in fixture");
  }

  const codeHashes = [
    mockERC1155MarketPlace1CodeHash,
    mockERC1155MarketPlace2CodeHash,
    mockERC1155MarketPlace3CodeHash,
    mockERC1155MarketPlace4CodeHash,
  ];
  const tnx1 = await operatorFilterRegistryAsSubscription["updateCodeHashes"](
    filterOperatorSubscription,
    codeHashes,
    true
  );
  await tnx1.wait();

  const marketplaces = [
    mockERC1155MarketPlace1.address,
    mockERC1155MarketPlace2.address,
    mockERC1155MarketPlace3.address,
    mockERC1155MarketPlace4.address,
  ];
  const tnx2 = await operatorFilterRegistryAsSubscription["updateOperators"](
    filterOperatorSubscription,
    marketplaces,
    true
  );
  await tnx2.wait();

  const users = await setupUsers(otherAccounts, {
    Asset,
  });

  return {
    mockERC1155MarketPlace1,
    mockERC1155MarketPlace2,
    mockERC1155MarketPlace3,
    mockERC1155MarketPlace4,
    operatorFilterRegistry,
    operatorFilterRegistryAsSubscription,
    filterOperatorSubscription,
    users,
    deployer,
    upgradeAdmin,
    Asset,
  };
});
