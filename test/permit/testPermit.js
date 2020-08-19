const {setupPermit} = require("./fixtures");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {Web3Provider} = ethers.providers;
const {splitSignature} = require("ethers/lib/utils");
const {getApprovalDigest} = require("./_testHelper");
const {waitFor} = require("local-utils");

const TEST_AMOUNT = BigNumber.from(10).mul("1000000000000000000");
const nonce = BigNumber.from(0);
const deadline = BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

describe("Permit", function () {
  it("Permit contract exists", async function () {
    const {permitContract, others} = await setupPermit();
    console.log(others[0]); // 0x9FC9C2DfBA3b6cF204C37a5F690619772b926e39

    const digest = await getApprovalDigest(
      permitContract.address,
      {owner: others[0], spender: others[1], value: TEST_AMOUNT},
      nonce,
      deadline
    );

    const ethersProvider = new Web3Provider(ethereum);
    const flatSig = await ethersProvider.getSigner(others[0]).signMessage(digest);
    const sig = splitSignature(flatSig);
    console.log('sig', sig);

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
