const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {utils, BigNumber, Wallet} = require("ethers");
const {assert, expect} = require("local-chai");
const {signTypedData_v4, TypedDataUtils} = require("eth-sig-util");
const {bufferToHex, keccak256} = require("ethereumjs-util");
const {expectRevert, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");

const amount = BigNumber.from("50000000000000000000000");

let setUp;
let signers;
let dummyTrustedforwarder;
let userWithSand;
let sandRecipient;
let sandWrapperAsTrustedForwarder;
let wallet;

describe("MetaTxWrapper: SAND", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const {sandWrapper} = setUp;
    signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11];
    userWithSand = await signers[1].getAddress();
    sandRecipient = await signers[2].getAddress();
    wallet = Wallet.createRandom();

    await deployments.rawTx({
      to: wallet.address,
      from: sandRecipient,
      value: BigNumber.from(1).mul("1000000000000000000"),
    });
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
      sandRecipient,
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

  describe("MetaTxWrapper: Forwarder", function () {
    const EIP712DomainType = [
      {name: "name", type: "string"},
      {name: "version", type: "string"},
      {name: "chainId", type: "uint256"},
      {name: "verifyingContract", type: "address"},
    ];

    const ForwardRequestType = [
      {name: "from", type: "address"},
      {name: "to", type: "address"},
      {name: "value", type: "uint256"},
      {name: "gas", type: "uint256"},
      {name: "nonce", type: "uint256"},
      {name: "data", type: "bytes"},
    ];

    let forwarder;
    let domainSeparator;

    before(async function () {
      forwarder = await ethers.getContract("Forwarder");

      const GENERIC_PARAMS = "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data";

      typeName = `ForwardRequest(${GENERIC_PARAMS})`;
      typeHash = bufferToHex(keccak256(typeName));
      await forwarder.registerRequestType("TestCall", "0x");
      typeData = {
        domain: {
          name: "Test Domain",
          version: "1",
          chainId: 1234,
          verifyingContract: forwarder.address,
        },
        primaryType: "ForwardRequest",
        types: {
          EIP712Domain: EIP712DomainType,
          ForwardRequest: ForwardRequestType,
        },
        message: {},
      };
      const calcType = TypedDataUtils.encodeType("ForwardRequest", typeData.types);
      assert.equal(calcType, typeName);

      domainSeparator = bufferToHex(TypedDataUtils.hashStruct("EIP712Domain", typeData.domain, typeData.types));
    });
    // TODO: get this test working to ensure our wrapper works as expected with an actual forwarder contract
    it("should work with an actual forwarder contract", async function () {
      const {sandWrapper} = setUp;
      const sandContract = await ethers.getContract("Sand", wallet.connect(ethers.provider));
      const {sandAdmin} = await getNamedAccounts();

      // await waitFor(sandAsUserWithSand.approve(forwarderAddress, amount));

      const SandAdmin = {
        address: sandAdmin,
        Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
      };

      await waitFor(SandAdmin.Sand.setSuperOperator(sandWrapper.address, true));
      await waitFor(SandAdmin.Sand.transfer(wallet.address, BigNumber.from("1000000000000000000000000")));
      await waitFor(sandContract.approve(forwarder.address, amount));

      let {to, data} = await sandWrapper.populateTransaction.transferFrom(wallet.address, sandRecipient, amount);
      data += wallet.address.replace("0x", "");

      const req1 = {
        to: to,
        data: data,
        value: "0",
        from: wallet.address,
        nonce: 0,
        gas: 1e6,
      };

      const privateKey = wallet.privateKey;
      const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
      const sig = signTypedData_v4(privateKeyAsBuffer, {
        data: {...typeData, message: req1},
      });
      const domainSeparator = TypedDataUtils.hashStruct("EIP712Domain", typeData.domain, typeData.types);

      const balanceBefore = await sandContract.balanceOf(sandRecipient);
      const receipt = await waitFor(forwarder.execute(req1, bufferToHex(domainSeparator), typeHash, "0x", sig));

      // sand Transfer events
      const sandTransferEvents = await findEvents(sandContract, "Transfer", receipt.blockHash);
      console.log(`Sand Transfer Events: ${sandTransferEvents}`);

      const allowance = await sandContract.allowance(wallet.address, forwarder.address);
      const walletSandBalance = await sandContract.balanceOf(wallet.address);
      assert(walletSandBalance.gte(amount));
      assert(allowance.gte(amount));

      const balanceAfter = await sandContract.balanceOf(sandRecipient);
      console.log(`balanceBefore: ${balanceBefore}`);
      console.log(`amount: ${amount}`);
      console.log(`balanceAfter: ${balanceAfter}`);

      expect(balanceAfter).to.be.equal(balanceBefore.add(amount));
    });
  });
});
