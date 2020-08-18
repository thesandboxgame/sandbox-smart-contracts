const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert, waitFor} = require("local-utils");
const {setupTest} = require("./fixtures");

const amount = BigNumber.from("50000000000000000000000");

let setUp;
let dummyTrustedforwarder;
let userWithSand;
let sandRecipient;
let sandWrapperAsTrustedForwarder;

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const {sandWrapper} = setUp;
    const signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11];
    userWithSand = await signers[1].getAddress();
    sandRecipient = await signers[2].getAddress();
    sandWrapperAsTrustedForwarder = await sandWrapper.connect(dummyTrustedforwarder);
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
    let {to, data} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
      sandRecipient, // passing the wrong address
      sandRecipient,
      amount
    );
    data += userWithSand.replace("0x", "");

    await expectRevert(waitFor(dummyTrustedforwarder.sendTransaction({to, data})), "INVALID_METATX_DATA");
  });

  it("should fail if missing appended data", async function () {
    let {to, data} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
      sandRecipient, // passing the wrong address
      sandRecipient,
      amount
    );

    await expectRevert(waitFor(dummyTrustedforwarder.sendTransaction({to, data})), "INVALID_METATX_DATA");
  });

  it("should handle a failure in the Sand contract", async function () {
    let {to, data} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
      userWithSand,
      sandRecipient,
      amount
    );
    data += userWithSand.replace("0x", "");

    await expectRevert(waitFor(dummyTrustedforwarder.sendTransaction({to, data})), "Not enough funds allowed");
  });

  it("can forward a transferFrom call to Sand contract", async function () {
    const {sandWrapper, sandContract} = setUp;
    const {sandAdmin} = await getNamedAccounts();
    const forwarderAddress = await dummyTrustedforwarder.getAddress();
    const sandAsUserWithSand = await sandContract.connect(sandContract.provider.getSigner(userWithSand));

    const SandAdmin = {
      address: sandAdmin,
      Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
    };

    await waitFor(SandAdmin.Sand.setSuperOperator(sandWrapper.address, true));
    await waitFor(SandAdmin.Sand.transfer(userWithSand, BigNumber.from("1000000000000000000000000")));
    await waitFor(sandAsUserWithSand.approve(forwarderAddress, amount));

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
