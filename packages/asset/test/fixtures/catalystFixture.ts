import {
  deployments,
  getUnnamedAccounts
} from "hardhat";

export const runCatalystSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture(["Catalyst"]);
    const { deployer, catalystAdmin, catalystMinter } =
      await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const user1 = users[0];
    const user2 = users[1];
    const user3 = users[3];

    const catalyst = await ethers.getContract("Catalyst", user3);
    const catalystAsAdmin = await ethers.getContract("Catalyst", catalystAdmin);
    const minterRole = await catalyst.MINTER_ROLE();
    const catalystAsMinter = await ethers.getContract("Catalyst", catalystMinter);

    return {
      deployer,
      catalyst,
      user1,
      user2,
      minterRole,
      catalystAsAdmin,
      catalystAsMinter
    };
  }
);
