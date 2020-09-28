const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
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
let userWithSand;
let sandRecipient;
let wallet;
let forwarder;

describe("MetaTxWrapper: SAND", function () {
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

  before(async function () {
    setUp = await setupTest();
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

  beforeEach(async function () {
    signers = await ethers.getSigners();
    userWithSand = await signers[1].getAddress();
    sandRecipient = await signers[2].getAddress();
    wallet = Wallet.createRandom();

    await deployments.rawTx({
      to: wallet.address,
      from: sandRecipient,
      value: BigNumber.from(1).mul("1000000000000000000"),
    });
  });

  describe("MetaTxWrapper: Calling Directly", function () {
    let signers;
    let sandContract;
    let testWrapper;
    let testWrapperContract;
    let fakeTrustedforwarder;

    beforeEach(async function () {
      signers = await ethers.getSigners();
      fakeTrustedforwarder = await signers[11];
      forwarderAddress = await fakeTrustedforwarder.getAddress();
      sandContract = await deployments.get("Sand");
      const {deploy} = deployments;
      const {deployer} = await getNamedAccounts();

      testWrapper = await deploy("TestSandWrapper", {
        contract: "MetaTxWrapper",
        from: deployer,
        args: [forwarderAddress, sandContract.address],
        log: true,
      });

      const testSandWrapper = {...testWrapper, abi: sandContract.abi};
      await deployments.save("TestSandWrapper", testSandWrapper);
      const [deployerAccount] = await ethers.getSigners();
      const testWrapperDeployed = await deployments.get("TestSandWrapper");
      testWrapperContract = await ethers.getContractAt(
        testWrapperDeployed.abi,
        testWrapperDeployed.address,
        deployerAccount
      );
    });

    it("should revert if forwarded by Untrusted address", async function () {
      const {sandWrapper} = setUp;
      const tx = {
        to: sandWrapper.address,
        value: utils.parseEther("0.0"),
        data: "0x0000000000000000000000000000000000000000",
      };

      const untrustedforwarder = signers[13];
      await expectRevert(
        untrustedforwarder.sendTransaction(tx),
        "Function can only be called through the trusted Forwarder"
      );
    });

    it("should revert with incorrect or missing first param", async function () {
      let {to, data} = await testWrapperContract.populateTransaction.transferFrom(
        sandRecipient, // passing the wrong address
        sandRecipient,
        amount
      );
      data += userWithSand.replace("0x", "");

      await expectRevert(waitFor(fakeTrustedforwarder.sendTransaction({to, data})), "INVALID_METATX_DATA");
    });

    it("should revert if missing appended data", async function () {
      let {to, data} = await testWrapperContract.populateTransaction.transferFrom(userWithSand, sandRecipient, amount);

      await expectRevert(waitFor(fakeTrustedforwarder.sendTransaction({to, data})), "INVALID_METATX_DATA");
    });

    it("should allow error messages from the target contract to surface", async function () {
      let {to, data} = await testWrapperContract.populateTransaction.transferFrom(userWithSand, sandRecipient, amount);
      data += userWithSand.replace("0x", "");

      await expectRevert(waitFor(fakeTrustedforwarder.sendTransaction({to, data})), "Not enough funds allowed");
    });
  });

  it("can forward a call to the sand contract", async function () {
    const {sandWrapper} = setUp;
    const sandContract = await ethers.getContract("Sand", wallet.connect(ethers.provider));
    const {sandAdmin} = await getNamedAccounts();

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
    const balanceAfter = await sandContract.balanceOf(sandRecipient);
    expect(sandTransferEvents.length).to.be.equal(1);
    expect(balanceAfter).to.be.equal(balanceBefore.add(amount));
  });
});
