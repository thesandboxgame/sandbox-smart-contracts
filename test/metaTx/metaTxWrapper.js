const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert, waitFor} = require("local-utils");
const {setupTest} = require("./fixtures");

let setUp;
let dummyTrustedforwarder;
let userWithSand;
let sandRecipient;

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11]; // 0x532792b73c0c6e7565912e7039c59986f7e1dd1f
    userWithSand = await signers[1].getAddress();
    sandRecipient = await signers[2].getAddress();
  });

  it("should revert if forwarded by Untrusted address", async function () {
    const {sandWrapper} = setUp;
    const tx = {
      to: sandWrapper.address,
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
    const {sandWrapper} = setUp;
    const senderAddress = "0x532792b73c0c6e7565912e7039c59986f7e1dd1f";

    const tx = {
      to: sandWrapper.address,
      value: utils.parseEther("0.0"),
      data: senderAddress,
    };
    await expectRevert(dummyTrustedforwarder.sendTransaction(tx), "INVALID_SIGNER");
  });

  it("should fail if params don't match", async function () {
    const {sandWrapper} = setUp;
    const sandWrapperAsTrustedForwarder = await sandWrapper.connect(dummyTrustedforwarder);

    await expectRevert(
      sandWrapperAsTrustedForwarder.transferFrom(
        userWithSand,
        sandRecipient,
        BigNumber.from("50000000000000000000000")
      ),
      "INVALID_SIGNER"
    );
  });

  it("should handle a failure in the Sand contract", async function () {
    const {sandWrapper} = setUp;
    const amount = BigNumber.from("50000000000000000000000");
    const sandWrapperAsTrustedForwarder = await sandWrapper.connect(dummyTrustedforwarder);

    let {to, data} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
      userWithSand,
      sandRecipient,
      amount
    );
    data += userWithSand.replace("0x", "");

    await expectRevert(waitFor(dummyTrustedforwarder.sendTransaction({to, data})), "FORWARDED_CALL_FAILED");
  });

  it("can forward a call to Sand contract", async function () {
    const {sandWrapper, sandContract} = setUp;
    const {sandAdmin} = await getNamedAccounts();
    const amount = BigNumber.from("50000000000000000000000");
    const forwarderAddress = await dummyTrustedforwarder.getAddress();
    const sandWrapperAsTrustedForwarder = await sandWrapper.connect(dummyTrustedforwarder);
    const sandAsUserWithSand = await sandContract.connect(sandContract.provider.getSigner(userWithSand));

    const SandAdmin = {
      address: sandAdmin,
      Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
    };

    // confirm superOperator status:
    await waitFor(SandAdmin.Sand.setSuperOperator(sandWrapper.address, true));
    console.log(`sandWrapper: ${sandWrapper.address}`);
    console.log(`trustedForwarder: ${forwarderAddress}`);
    assert.ok(await SandAdmin.Sand.isSuperOperator(sandWrapper.address));

    // Supply user with sand:
    await waitFor(SandAdmin.Sand.transfer(userWithSand, BigNumber.from("1000000000000000000000000")));
    const currentBalance = await sandContract.balanceOf(userWithSand);
    assert(currentBalance.gte(amount));

    // approve forwarder
    await waitFor(sandAsUserWithSand.approve(forwarderAddress, amount));
    const allowance = await sandContract.allowance(userWithSand, forwarderAddress);
    expect(allowance).to.be.equal(amount);

    let {to, data} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
      userWithSand,
      sandRecipient,
      amount
    );
    data += userWithSand.replace("0x", "");

    const balanceBefore = await sandContract.balanceOf(sandRecipient);
    await waitFor(dummyTrustedforwarder.sendTransaction({to, data}));
    const balanceAfter = await sandContract.balanceOf(sandRecipient);
    expect(balanceAfter).to.be.equal(balanceBefore.add(amount));
  });
});
