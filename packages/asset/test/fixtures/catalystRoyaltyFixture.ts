import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from "hardhat";

export async function catalystRoyaltyDistribution() {
  await deployments.fixture(["Catalyst"]);
  const {
    deployer,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    catalystMinter,
  } = await getNamedAccounts();
  const { deploy } = await deployments;
  const users = await getUnnamedAccounts();

  const seller = users[0];
  const buyer = users[1];
  const royaltyReceiver = users[2];
  const user = users[3];
  const commonRoyaltyReceiver2 = users[4];
  const royaltyReceiver2 = users[5];
  const creator = users[6];

  await deploy("FallbackRegistry", {
    from: deployer,
    contract: "FallbackRegistry",
    args: [deployer],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await deploy("RoyaltyRegistry", {
    from: deployer,
    contract: "RoyaltyRegistry",
    args: ["0x0000000000000000000000000000000000000000"],
    skipIfAlreadyDeployed: true,
    log: true,
  });
  const FallbackRegistry = await ethers.getContract("FallbackRegistry");

  await deploy("RoyaltyEngineV1", {
    from: deployer,
    contract: "RoyaltyEngineV1",
    args: [FallbackRegistry.address],
    skipIfAlreadyDeployed: true,
    log: true,
  });

  const RoyaltyRegistry = await ethers.getContract("RoyaltyRegistry");
  const RoyaltyEngineV1 = await ethers.getContract("RoyaltyEngineV1");
  await RoyaltyEngineV1.initialize(deployer, RoyaltyRegistry.address);

  await deploy("MockMarketplace", {
    from: deployer,
    contract: "MockMarketplace",
    skipIfAlreadyDeployed: true,
    args: [RoyaltyEngineV1.address],
    log: true,
  });

  await deploy("TestERC20", {
    from: deployer,
    contract: "TestERC20",
    skipIfAlreadyDeployed: true,
    args: ["TestERC20", "T"],
    log: true,
  });

  const ERC20 = await ethers.getContract("TestERC20");
  const manager = await ethers.getContract("RoyaltyManager");
  const mockMarketplace = await ethers.getContract("MockMarketplace");

  const catalyst = await ethers.getContract("Catalyst", catalystMinter);

  const managerAdminRole = await manager.DEFAULT_ADMIN_ROLE();
  const contractRoyaltySetterRole =
    await manager.CONTRACT_ROYALTY_SETTER_ROLE();
  const ERC20AsBuyer = ERC20.connect(await ethers.getSigner(buyer));
  const managerAsAdmin = manager.connect(await ethers.getSigner(managerAdmin));
  const managerAsRoyaltySetter = manager.connect(
    await ethers.getSigner(contractRoyaltySetter)
  );

  return {
    ERC20,
    manager,
    mockMarketplace,
    ERC20AsBuyer,
    deployer,
    seller,
    buyer,
    user,
    commonRoyaltyReceiver,
    royaltyReceiver,
    RoyaltyRegistry,
    managerAsAdmin,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    creator,
    catalyst,
    contractRoyaltySetter,
    managerAdminRole,
    contractRoyaltySetterRole,
    managerAsRoyaltySetter,
  };
}
