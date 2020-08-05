const {ethers} = require("ethers");
const {deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {assert} = require("local-chai");
// const {expectRevert} = require("local-utils");

const setupTest = deployments.createFixture(async ({deployments, ethers}) => {
  await deployments.fixture();
  const MetaTxWrapperContract = await ethers.getContract("MetaTxWrapper");
  return {
    MetaTxWrapperContract,
  };
});

describe("MetaTxWrapper", function () {
  it("can check trusted forwarder", async function () {
    const {others} = await getNamedAccounts();
    const trustedForwarder = others[3];
    const {MetaTxWrapperContract} = await setupTest();
    assert.ok(await MetaTxWrapperContract.isTrustedForwarder(trustedForwarder));
  });
});
