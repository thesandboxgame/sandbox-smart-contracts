const {deployments, getNamedAccounts} = require("@nomiclabs/buidler");
// const ethers = require("ethers");
// const {Wallet} = ethers;
const {assert, expect} = require("local-chai");
// const {expectRevert} = require("local-utils");

// const privateKey = "0x7777777777777777777777777777777777777777777777777777777777777777";

let setUp;
let accounts;

const setupTest = deployments.createFixture(async (bre) => {
  await deployments.fixture();
  const MetaTxWrapperContract = await bre.ethers.getContract("MetaTxWrapper");
  return {
    MetaTxWrapperContract,
  };
});

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    accounts = await getNamedAccounts();
  });

  it("can check trusted forwarder", async function () {
    const {MetaTxWrapperContract} = setUp;
    const trustedForwarder = await MetaTxWrapperContract.trustedForwarder();
    expect(trustedForwarder).to.equal(accounts.metaTxTrustedForwarder);
    assert.ok(await MetaTxWrapperContract.isTrustedForwarder(accounts.metaTxTrustedForwarder));
  });

  it("can return the message sender when called with no extra data", async function () {
    const {MetaTxWrapperContract} = setUp;
    const sender = await MetaTxWrapperContract._msgSender();
    expect(sender).to.equal("0xc783df8a850f42e7F7e57013759C285caa701eB6");
  });
});
