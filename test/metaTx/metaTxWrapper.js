const {ethers} = require("@nomiclabs/buidler");
const {utils} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert} = require("local-utils");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const {setupTest} = require("./fixtures");

const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

let setUp;
// let accounts;
let dummyTrustedforwarder;
let userWithEth;

describe("MetaTxWrapper", function () {
  beforeEach(async function () {
    console.log(`Now 1: ${Date.now()}`);
    setUp = await setupTest();
    // accounts = await getNamedAccounts();
    const signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11]; // 0x532792b73c0c6e7565912e7039c59986f7e1dd1f
    userWithEth = await signers[1].getAddress();
  });

  it("can check trusted forwarder", async function () {
    const {MetaTxWrapperContract} = setUp;
    const trustedForwarder = await MetaTxWrapperContract.trustedForwarder();

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
    await expectRevert(dummyTrustedforwarder.sendTransaction(tx), "INVALID_SIGNER");
  });

  it("can forward a call", async function () {
    const {MetaTxWrapperContract} = setUp;
    // const {others} = await getNamedAccounts();

    const TestMessage = {
      catalystIds: [0, 1, 2, 3],
      catalystQuantities: [10, 10, 10, 10],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [20, 20, 20, 20, 20],
      nonce: 0,
    };
    const dummySignature = signPurchaseMessage(privateKey, TestMessage, userWithEth);

    let ABI = ["function purchaseWithETH(address buyer, Message message, bytes signature)"];
    let iface = new utils.Interface(ABI);
    const encodedCallData = iface.encodeFunctionData("purchaseWithETH", [userWithEth, TestMessage, dummySignature]);

    // const senderAddress = "0x532792b73c0c6e7565912e7039c59986f7e1dd1f";

    const tx = {
      to: MetaTxWrapperContract.address,
      value: utils.parseEther("0.0"),
      data: encodedCallData,
    };
    // @review need to set the forwardTo address in wrapper constructor
    await dummyTrustedforwarder.sendTransaction(tx);
  });
  /**

> let iface = new ethers.utils.Interface(ABI);
> iface.encodeFunctionData("transfer", [ "0x1234567890123456789012345678901234567890", parseEther("1.0") ])
'0xa9059cbb00000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000de0b6b3a7640000'
   */
});
