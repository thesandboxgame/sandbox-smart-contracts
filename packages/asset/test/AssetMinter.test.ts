import { expect } from "chai";
import { deployments } from "hardhat";

const runAssetSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture(["AssetMinter"]);
    const { deployer } = await getNamedAccounts();
    const AssetContract = await ethers.getContract("AssetMinter", deployer);
    return {
      deployer,
      AssetContract,
    };
  }
);

describe.skip("AssetContract", () => {
  it("Should deploy correctly", async () => {
    const { AssetContract } = await runAssetSetup();
    expect(AssetContract.address).to.be.properAddress;
  });
});
