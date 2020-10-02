const {expect} = require("chai");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

describe("LandWeightedSANDRewardPool computation", function () {
  it("computing contributions", async function () {
    await deployments.fixture();
    const {deployer} = await getNamedAccounts();
    await deployments.deploy("LandWeightedSANDRewardPoolTest", {from: deployer, args: ["100000", "9000000"]});
    const contract = await ethers.getContract("LandWeightedSANDRewardPoolTest");
    const valuesToTests = [
      {
        amountStaked: 1000,
        numLands: 9,
        expectedContribution: 2108,
      },
    ];
    for (const values of valuesToTests) {
      const result = await contract.testComputeContribution(values.amountStaked, values.numLands);
      expect(result).to.equal(values.expectedContribution);
    }
  });
});
