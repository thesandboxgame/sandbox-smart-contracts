const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert} = require("local-utils");
const {setupTest} = require("./fixtures");

let setUp;
let dummyTrustedforwarder;
let userWithSand;
let userWithoutSand;

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11]; // 0x532792b73c0c6e7565912e7039c59986f7e1dd1f
    userWithSand = await signers[1].getAddress();
    userWithoutSand = await signers[2].getAddress();
  });

  it("can check trusted forwarder", async function () {
    const {metaWrapper} = setUp;
    console.log(`metaTxWrapper: ${metaWrapper.abi}`);
    const trustedForwarder = await metaWrapper.trustedForwarder();

    expect(trustedForwarder).to.equal(await dummyTrustedforwarder.getAddress());
    assert.ok(await metaWrapper.isTrustedForwarder(dummyTrustedforwarder.getAddress()));
  });

  it("should revert if forwarded by Untrusted address", async function () {
    const {metaWrapper} = setUp;
    const tx = {
      to: metaWrapper.address,
      value: utils.parseEther("0.0"),
      data: "0x0000000000000000000000000000000000000000",
    };
    const signers = await ethers.getSigners();
    const untrustedforwarder = signers[13];
    await expectRevert(
      untrustedforwarder.sendTransaction(tx),
      "Function can only be called through the trusted Forwarder"
    );
  });

  it("should revert with incorrect or missing first param", async function () {
    const {metaWrapper} = setUp;
    const senderAddress = "0x532792b73c0c6e7565912e7039c59986f7e1dd1f";

    const tx = {
      to: metaWrapper.address,
      value: utils.parseEther("0.0"),
      data: senderAddress,
    };
    await expectRevert(dummyTrustedforwarder.sendTransaction(tx), "INVALID_SIGNER");
  });

  it("can forward a call", async function () {
    const {metaWrapper} = setUp;
    const sandContract = await ethers.getContract("Sand");
    const {sandAdmin} = await getNamedAccounts();
    const SandAdmin = {
      address: sandAdmin,
      Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
    };
    await SandAdmin.Sand.transfer(userWithSand, BigNumber.from("1000000000000000000000000"));

    await metaWrapper.transferFrom(userWithSand, userWithoutSand, BigNumber.from("50000000000000000000000"));
  });
});
