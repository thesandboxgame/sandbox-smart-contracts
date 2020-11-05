const {setupPermit} = require("./fixtures");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {splitSignature} = require("ethers/lib/utils");
const {findEvents} = require("../utils");
const sigUtil = require("eth-sig-util");
const {expect} = require('../chai-setup');
const {data712} = require("./data712.js");
const {bufferToHex} = require("ethereumjs-util");

const zeroAddress = ethers.constants.AddressZero;
const TEST_AMOUNT = BigNumber.from(10).mul("1000000000000000000");

describe("Permit", function () {
  let setUp;
  let wallet;
  let nonce;
  let deadline;

  beforeEach(async function () {
    setUp = await setupPermit();
    wallet = ethers.Wallet.createRandom();
    nonce = BigNumber.from(0);
    deadline = BigNumber.from(2582718400);
  });

  // Note: on test network, others[1] is sandAdmin, others[2] is sandBeneficiary

  it("ERC20 Approval event is emitted when msg.sender == owner", async function () {
    const {permitContract, sandContract, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    const receipt = await permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s).then((tx) => tx.wait());;

    const transferEvents = await findEvents(sandContract, "Approval", receipt.blockHash);

    const approvalEvent = transferEvents[0];
    expect(approvalEvent.args[0]).to.equal(wallet.address); // owner
    expect(approvalEvent.args[1]).to.equal(others[3]); // spender
    expect(approvalEvent.args[2]).to.equal(TEST_AMOUNT); // amount
  });

  it("Nonce is incremented for each Approval", async function () {
    const {permitContract, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    const checkNonce = await permitContract.nonces(wallet.address);
    expect(checkNonce).to.equal(0);

    await permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s);

    const nonceAfterApproval = await permitContract.nonces(wallet.address);
    expect(nonceAfterApproval).to.equal(1);
  });

  it("Permit function reverts if deadline has passed", async function () {
    const {permitContract, others} = setUp;

    deadline = BigNumber.from(1382718400);

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    await expect(permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)).to.be.revertedWith("PAST_DEADLINE");
  });

  it("Permit function reverts if owner is zeroAddress", async function () {
    const {permitContract, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    await expect(permitContract.permit(zeroAddress, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)).to.be.revertedWith("INVALID_SIGNATURE"
    );
  });

  it("Permit function reverts if owner != msg.sender", async function () {
    const {permitContract, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    await expect(permitContract.permit(others[4], others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)).to.be.revertedWith("INVALID_SIGNATURE"
    );
  });

  it("Permit function reverts if spender is not the approved spender", async function () {
    const {permitContract, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    await expect(permitContract.permit(wallet.address, others[4], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)).to.be.revertedWith("INVALID_SIGNATURE"
    );
  });

  it("Domain separator is public", async function () {
    const {permitContract, others} = setUp;
    const domainSeparator = await permitContract.DOMAIN_SEPARATOR();

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const expectedDomainSeparator = bufferToHex(
      sigUtil.TypedDataUtils.hashStruct("EIP712Domain", permitData712.domain, permitData712.types)
    );
    expect(domainSeparator).to.equal(expectedDomainSeparator);
  });

  it("Non-approved operators cannot transfer ERC20 until approved", async function () {
    const {permitContract, sandContract, sandAdmin, sandBeneficiary, others} = setUp;
    const receiverOriginalBalance = await sandContract.balanceOf(others[4]);
    expect(receiverOriginalBalance).to.equal(0);

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    // Give wallet some SAND
    const sandContractAsAdmin = await sandContract.connect(sandContract.provider.getSigner(sandAdmin));
    await sandContractAsAdmin.transferFrom(sandBeneficiary, wallet.address, TEST_AMOUNT);

    const sandContractAsSpender = await sandContract.connect(sandContract.provider.getSigner(others[3]));
    await expect(sandContractAsSpender.transferFrom(wallet.address, others[4], TEST_AMOUNT)).to.be.revertedWith(
      "Not enough funds allowed"
    );
    await permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s).then((tx) => tx.wait());;
    const receipt = await sandContractAsSpender.transferFrom(wallet.address, others[4], TEST_AMOUNT);
    const receiverNewBalance = await sandContract.balanceOf(others[4]);
    const transferEventsMatching = await findEvents(sandContract, "Transfer", receipt.blockHash);
    expect(transferEventsMatching.length).to.equal(1);
    expect(transferEventsMatching[0].args[0]).to.equal(wallet.address);
    expect(transferEventsMatching[0].args[1]).to.equal(others[4]);
    expect(transferEventsMatching[0].args[2]).to.equal(TEST_AMOUNT);
    expect(receiverNewBalance).to.equal(TEST_AMOUNT.add(receiverOriginalBalance));
  });

  it("Approved operators cannot transfer more ERC20 than their allowance", async function () {
    const {permitContract, sandContract, sandAdmin, sandBeneficiary, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    // Give wallet lots of SAND
    const sandContractAsAdmin = await sandContract.connect(sandContract.provider.getSigner(sandAdmin));
    await sandContractAsAdmin.transferFrom(sandBeneficiary, wallet.address, TEST_AMOUNT.mul(2));

    const sandContractAsSpender = await sandContract.connect(sandContract.provider.getSigner(others[3]));
    await permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s).then((tx) => tx.wait());;
    await expect(sandContractAsSpender.transferFrom(wallet.address, others[4], TEST_AMOUNT.mul(2))).to.be.revertedWith(
      "Not enough funds allowed"
    );
  });

  it("Approved operators cannot transfer more ERC20 than there is", async function () {
    const {permitContract, sandContract, sandAdmin, sandBeneficiary, others} = setUp;

    const approve = {
      owner: wallet.address,
      spender: others[3],
      value: TEST_AMOUNT._hex,
      nonce: nonce._hex,
      deadline: deadline._hex,
    };

    const permitData712 = data712(permitContract, approve);
    const privateKey = wallet.privateKey;
    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: permitData712});
    const sig = splitSignature(flatSig);

    // Give wallet small amount of SAND
    const sandContractAsAdmin = await sandContract.connect(sandContract.provider.getSigner(sandAdmin));
    await sandContractAsAdmin.transferFrom(sandBeneficiary, wallet.address, TEST_AMOUNT.div(2));

    const sandContractAsSpender = await sandContract.connect(sandContract.provider.getSigner(others[3]));
    await permitContract.permit(wallet.address, others[3], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s).then((tx) => tx.wait());;
    await expect(sandContractAsSpender.transferFrom(wallet.address, others[4], TEST_AMOUNT)).to.be.revertedWith("not enough fund");
  });
});
