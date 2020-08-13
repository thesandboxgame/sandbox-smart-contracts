const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {utils} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert} = require("local-utils");

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
    const signers = await ethers.getSigners();
    const dummyTrustedforwarder = signers[11];

    expect(trustedForwarder).to.equal(await dummyTrustedforwarder.getAddress());
    assert.ok(await MetaTxWrapperContract.isTrustedForwarder(dummyTrustedforwarder.getAddress()));
  });

  it("should revert if forwarded by Untrusted address", async function () {
    const {MetaTxWrapperContract} = setUp;
    const tx = {
      to: MetaTxWrapperContract.address,
      value: utils.parseEther("0.0"),
    };
    const signers = await ethers.getSigners();
    const untrustedforwarder = signers[13];
    await expectRevert(
      untrustedforwarder.sendTransaction(tx),
      "Function can only be called through the trusted Forwarder"
    );
  });

  it("should revert with incorrect or missing first param", async function () {
    const {MetaTxWrapperContract} = setUp;
    const senderAddress = "0x532792b73c0c6e7565912e7039c59986f7e1dd1f";

    const tx = {
      to: MetaTxWrapperContract.address,
      value: utils.parseEther("0.0"),
      data: senderAddress,
    };

    const signers = await ethers.getSigners();
    const dummyTrustedforwarder = signers[11]; // 0x532792b73c0c6e7565912e7039c59986f7e1dd1f
    await expectRevert(dummyTrustedforwarder.sendTransaction(tx), "INVALID_SIGNER");
  });
});
