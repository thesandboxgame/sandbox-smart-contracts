const {setupPermit} = require("./fixtures");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {Web3Provider} = ethers.providers;
const {splitSignature, arrayify} = require("ethers/lib/utils");
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
    
    console.log('others[0]', others[0]);
    console.log('others[1]', others[1]);

    console.log('digestTest', digest); 
    // digest bytes32
    // 0x14 94 b8 a8 72 93 c1 c6 87 91 02 50 a8 f0 22 fc 23 1d ea e2 98 ab 5f 9f 76 fc 52 12 19 3c b8 0e

    const ethersProvider = new Web3Provider(ethereum);

    const user = await ethersProvider.getSigner(others[0]);

    // TODO: fix sig
    const flatSig = await user.signMessage(arrayify(digest));
    const sig = splitSignature(flatSig);
    console.log('sig', sig);

    const permitContractAsUser = await permitContract.connect(user);

    const digestActual = await permitContract.digestMe(others[0], others[1], TEST_AMOUNT, deadline);
    console.log('digestActual', digestActual);

    const rContract = await permitContract.sig(sig.r);
    const sContract = await permitContract.sig(sig.s);

    console.log('contract sig r&s', rContract, sContract);

    const receipt = await waitFor(
      permitContractAsUser.permit(others[0], others[1], TEST_AMOUNT, deadline, sig.v, sig.r, sig.s)
    );

    console.log(receipt);

    // expect Approval event
    // check event params
    // check nonce incremented
  });
});
