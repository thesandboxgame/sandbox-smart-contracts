const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {assert, expect} = require("local-chai");
const {signTypedData_v4, TypedDataUtils} = require("eth-sig-util");
const {bufferToHex, keccak256} = require("ethereumjs-util");
const {expectRevert, waitFor} = require("local-utils");
const {setupTest} = require("./fixtures");
const {setupCatalystUsers} = require("../catalyst/fixtures");

const amount = BigNumber.from("50000000000000000000000");
const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

let setUp;
let signers;
let dummyTrustedforwarder;
let userWithSand;
let sandRecipient;
let sandWrapperAsTrustedForwarder;
let catalystWrapperAsTrustedForwarder;

describe("MetaTxWrapper: SAND", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const {sandWrapper} = setUp;
    signers = await ethers.getSigners();
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

  describe.skip("MetaTxWrapper: Forwarder", function () {
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
    let data;
    let domainSeparator;

    before(async function () {
      const {trustedForwarder} = await getNamedAccounts();
      forwarder = await ethers.getContractAt("Forwarder", trustedForwarder);

      const GENERIC_PARAMS = "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data";

      typeName = `ForwardRequest(${GENERIC_PARAMS})`;
      typeHash = bufferToHex(keccak256(typeName));
      await forwarder.registerRequestType("TestCall", "");
      data = {
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
      //sanity: verify that we calculated the type locally just like eth-utils:
      const calcType = TypedDataUtils.encodeType("ForwardRequest", data.types);
      assert.equal(calcType, typeName);
      console.log(`calcType: ${calcType}`);
      console.log(`typeName: ${typeName}`);
      const calcTypeHash = bufferToHex(TypedDataUtils.hashType("ForwardRequest", data.types));
      console.log(`typeHash: ${typeHash}`);
      // const typehashToHex = utils.hexlify(typeHash);
      console.log(typeof typeHash);
      console.log(`calcTypeHash: ${calcTypeHash}`);
      console.log(typeof calcTypeHash);
      assert.equal(calcTypeHash, typeHash);

      domainSeparator = bufferToHex(TypedDataUtils.hashStruct("EIP712Domain", data.domain, data.types));
    });

    it("should work with an actual forwarder contract", async function () {
      const {sandWrapper, sandContract} = setUp;
      const {sandAdmin} = await getNamedAccounts();
      const {trustedForwarder} = await getNamedAccounts();
      const sandAsUserWithSand = await sandContract.connect(sandContract.provider.getSigner(userWithSand));

      const SandAdmin = {
        address: sandAdmin,
        Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
      };

      await waitFor(SandAdmin.Sand.setSuperOperator(sandWrapper.address, true));
      await waitFor(SandAdmin.Sand.transfer(userWithSand, BigNumber.from("1000000000000000000000000")));
      await waitFor(sandAsUserWithSand.approve(trustedForwarder, amount));

      let {to, txData} = await sandWrapperAsTrustedForwarder.populateTransaction.transferFrom(
        userWithSand,
        sandRecipient,
        amount
      );
      txData += userWithSand.replace("0x", "");
      console.log(`txData: ${txData}`);

      const balanceBefore = await sandContract.balanceOf(sandRecipient);

      // await waitFor(dummyTrustedforwarder.sendTransaction({to, txData}));
      const balanceAfter = await sandContract.balanceOf(sandRecipient);
      // expect(balanceAfter).to.be.equal(balanceBefore.add(amount));

      // const func = sandContract.transferFrom(userWithSand, sandRecipient, amount).encodeABI();

      const req1 = {
        to: to,
        data: data,
        value: "0",
        from: userWithSand,
        nonce: 0,
        gas: 1e6,
      };
      // console.log(`data: ${data}`);
      // console.log(`signer: ${signers[1]}`);
      // console.log(`req1: ${req1}`);
      const sig = signTypedData_v4(signers[1], {
        data: {...data, message: req1},
      });
      const domainSeparator = TypedDataUtils.hashStruct("EIP712Domain", data.domain, data.types);

      // note: we pass request as-is (with extra field): web3/truffle can only send javascript members that were
      // declared in solidity
      await forwarder.execute(req1, bufferToHex(domainSeparator), typeHash, "0x", sig);
      // @ts-ignore
      const logs = await recipient.getPastEvents("TestForwarderMessage");
      assert.equal(logs.length, 1, "TestRecipient should emit");
      assert.equal(logs[0].args.realSender, userWithSand, 'TestRecipient should "see" real sender of meta-tx');
      assert.equal("1", (await forwarder.getNonce(userWithSand)).toString(), "verifyAndCall should increment nonce");
    });
  });
});

describe("MetaTxWrapper: CATALYST_MINTER", function () {
  beforeEach(async function () {
    setUp = await setupTest();
    const {catalystWrapper} = setUp;
    const signers = await ethers.getSigners();
    dummyTrustedforwarder = signers[11];
    userWithSand = await signers[1].getAddress();
    // sandRecipient = await signers[3].getAddress();
    catalystWrapperAsTrustedForwarder = await catalystWrapper.connect(dummyTrustedforwarder);
  });

  it("should revert if forwarder contract is not set as a metaTransactionContract", async function () {
    const gemIds = [0, 1, 4];
    const quantity = 3;

    let {to, data} = await catalystWrapperAsTrustedForwarder.populateTransaction.mint(
      userWithSand,
      0,
      dummyHash,
      3, // LegendaryCatalyst
      gemIds,
      quantity,
      userWithSand,
      "0x"
    );
    data += userWithSand.replace("0x", "");
    await expectRevert(waitFor(dummyTrustedforwarder.sendTransaction({to, data})), "NOT_SENDER");
  });

  it("should revert if user does not own any Catalysts & Gems", async function () {
    const gemIds = [0, 1, 4];
    const quantity = 3;

    const {catalystWrapper, catalystContract} = setUp;
    const {catalystAdmin} = await getNamedAccounts();
    const CatalystAdmin = {
      address: catalystAdmin,
      Catalyst: catalystContract.connect(catalystContract.provider.getSigner(catalystAdmin)),
    };

    await waitFor(CatalystAdmin.Catalyst.setMetaTransactionProcessor(catalystWrapper.address, true));
    let {to, data} = await catalystWrapperAsTrustedForwarder.populateTransaction.mint(
      userWithSand,
      0,
      dummyHash,
      3, // LegendaryCatalyst
      gemIds,
      quantity,
      userWithSand,
      "0x"
    );
    data += userWithSand.replace("0x", "");
    await expectRevert(
      waitFor(dummyTrustedforwarder.sendTransaction({to, data})),
      "can't substract more than there is"
    );
  });
  // currently fails with : Error: VM Exception while processing transaction: revert NOT_SENDER
  it.skip("should forward call to the CatalystMinter contract", async function () {
    const {gem, catalyst} = await setupCatalystUsers();
    const gemIds = [0, 1, 4];
    const quantity = 3;

    const {catalystWrapper} = setUp;
    const {catalystAdmin, gemAdmin} = await getNamedAccounts();
    const CatalystAdmin = {
      address: catalystAdmin,
      Catalyst: catalyst.connect(catalyst.provider.getSigner(catalystAdmin)),
    };
    const GemAdmin = {
      address: gemAdmin,
      Gem: gem.connect(gem.provider.getSigner(gemAdmin)),
    };

    await CatalystAdmin.Catalyst.batchMint(userWithSand, [0, 1, 2, 3], [10, 10, 10, 10]);
    await GemAdmin.Gem.batchMint(userWithSand, [0, 1, 2, 3, 4], [10, 10, 10, 10, 10]);

    // when call is forwarded to CatalystMinter, the msg.sender is the metaTXWrapper contract
    await waitFor(CatalystAdmin.Catalyst.setMetaTransactionProcessor(catalystWrapper.address, true));
    assert.ok(await catalyst.isMetaTransactionProcessor(catalystWrapper.address));

    let {to, data} = await catalystWrapperAsTrustedForwarder.populateTransaction.mint(
      userWithSand,
      0,
      dummyHash,
      3, // LegendaryCatalyst
      gemIds,
      quantity,
      userWithSand,
      "0x"
    );
    data += userWithSand.replace("0x", "");
    assert.ok(await waitFor(dummyTrustedforwarder.sendTransaction({to, data})));
  });
});
