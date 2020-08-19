const {setupPermit} = require("./fixtures");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {Web3Provider} = ethers.providers;
const {splitSignature} = require("ethers/lib/utils");
const {getApprovalDigest} = require("./_testHelper");
const {waitFor} = require("local-utils");

const TEST_AMOUNT = BigNumber.from(10).mul("1000000000000000000");
const deadline = BigNumber.from(2582718400);
const nonce = BigNumber.from(0);

describe("Permit", function () {
  it("Permit contract emits an Approval event when msg.sender == owner", async function () {
    const {permitContract, others} = await setupPermit();

    const digest = getApprovalDigest(
      permitContract.address,
      {owner: others[0], spender: others[1], value: TEST_AMOUNT},
      nonce,
      deadline
    );

    const ethersProvider = new Web3Provider(ethereum);
    const flatSig = await ethersProvider.getSigner(others[0]).signMessage(digest);
    const sig = splitSignature(flatSig);
    console.log("sig", sig);

    const permitContractAsUser = await permitContract.connect(ethersProvider.getSigner(others[0]));

    const receipt = await waitFor(
      permitContractAsUser.permit(others[0], others[1], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)
    );

    console.log(receipt);

    // expect Approval event
    // check event params
    // check nonce incremented
  });
});
