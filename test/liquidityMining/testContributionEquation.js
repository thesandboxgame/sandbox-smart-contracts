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
        numLands: 0,
        expectedContribution: 1000,
      },
      {
        amountStaked: 1000,
        numLands: 1,
        expectedContribution: 2000,
      },
      {
        amountStaked: 1000,
        numLands: 3,
        expectedContribution: 2044,
      },
      {
        amountStaked: 1000,
        numLands: 9,
        expectedContribution: 2108,
      },
      {
        amountStaked: 1000,
        numLands: 10,
        expectedContribution: 2115,
      },
      {
        amountStaked: 1000,
        numLands: 122,
        expectedContribution: 2395,
      },
      {
        amountStaked: 1000,
        numLands: 10000,
        expectedContribution: 4054,
      },
    ];
    for (const values of valuesToTests) {
      const result = await contract.testComputeContribution(values.amountStaked, values.numLands);
      expect(result).to.equal(values.expectedContribution);
    }
  });
});
