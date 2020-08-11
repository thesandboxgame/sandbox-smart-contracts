const {ethers} = require("ethers");
const {deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
// const {expectRevert} = require("local-utils");

const setupTest = deployments.createFixture(async ({deployments, ethers}) => {
  await deployments.fixture();
  const MetaTxWrapperContract = await ethers.getContract("MetaTxWrapper");
  return {
    MetaTxWrapperContract,
  };
});

describe("MetaTxWrapper", function () {
  it("can set & check trusted forwarder", async function () {
    const {metaTxTrustedForwarder} = await getNamedAccounts();
    const {MetaTxWrapperContract} = await setupTest();
    const trustedForwarder = await MetaTxWrapperContract.trustedForwarder();
    expect(trustedForwarder).to.equal(metaTxTrustedForwarder);
    assert.ok(await MetaTxWrapperContract.isTrustedForwarder(metaTxTrustedForwarder));
  });
});
