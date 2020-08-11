// const {ethers} = require("ethers");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
// const {expectRevert} = require("local-utils");

let setUp;

const setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const MetaTxWrapperContract = await ethers.getContract("MetaTxWrapper");
  return {
    MetaTxWrapperContract,
  };
});

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    setUp = await setupTest();
  });

  it("can set & check trusted forwarder", async function () {
    const {MetaTxWrapperContract} = setUp;
    const {metaTxTrustedForwarder} = await getNamedAccounts();
    const trustedForwarder = await MetaTxWrapperContract.trustedForwarder();
    expect(trustedForwarder).to.equal(metaTxTrustedForwarder);
    assert.ok(await MetaTxWrapperContract.isTrustedForwarder(metaTxTrustedForwarder));
  });
});
