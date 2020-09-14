const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

describe("SANDRewardPool", function () {
  async function createFixture() {
    deployer = await getNamedAccounts();
    await deployments.fixture();
  }

  it("Contract should exist", async function () {
    await createFixture();
    const sandRewardPoolContract = await ethers.getContract("SANDRewardPool");
    console.log(sandRewardPoolContract);
  });
});
