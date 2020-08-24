const {setupPermit} = require("./fixtures");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {splitSignature} = require("ethers/lib/utils");
const {waitFor} = require("local-utils");
const sigUtil = require("eth-sig-util");

const TEST_AMOUNT = BigNumber.from(10).mul("1000000000000000000");
const deadline = BigNumber.from(2582718400);
const nonce = BigNumber.from(0);

describe("Permit", function () {
  it("Permit contract emits an Approval event when msg.sender == owner", async function () {
    const {permitContract, others} = await setupPermit();

    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;

    const approve = {owner: wallet.address, spender: others[1], value: TEST_AMOUNT};

    const data712 = {
      types: {
        EIP712Domain: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "version",
            type: "string",
          },
          {
            name: "verifyingContract",
            type: "address",
          },
        ],
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      primaryType: "Permit",
      domain: {
        name: "The Sandbox 3D",
        version: "1",
        verifyingContract: permitContract.address,
      },
      message: {
        owner: approve.owner,
        spender: approve.spender,
        value: approve.value._hex,
        nonce: nonce._hex,
        deadline: deadline._hex,
      },
    };

    const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), "hex");
    const flatSig = sigUtil.signTypedData_v4(privateKeyAsBuffer, {data: data712});
    const sig = splitSignature(flatSig);

    const receipt = await waitFor(
      permitContract.permit(wallet.address, others[1], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)
    );

    console.log(receipt);

    // expect Approval event
    // check event params
    // check nonce incremented
  });
});
