const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const erc721Tests = require("../erc721")(
  async () => {
    const {deployer, landAdmin, others} = await getNamedAccounts();
    await deployments.fixture();

    const contract = await ethers.getContract("Estate");
    const landContract = await ethers.getContract("Land");
    await landContract
      .connect(landContract.provider.getSigner(landAdmin))
      .functions.setMinter(deployer, true)
      .then((tx) => tx.wait());

    let counter = 0;
    async function mint(to) {
      const landTx = await landContract
        .connect(landContract.provider.getSigner(deployer))
        .functions.mintQuad(to, 1, counter, counter, "0x");
      await landTx.wait();
      const tx = await contract
        .connect(contract.provider.getSigner(to))
        .functions.createFromQuad(to, to, 1, counter, counter);
      const receipt = await tx.wait();
      counter++;
      return {receipt, tokenId: receipt.events.find((v) => v.event === "QuadsAdded").args[0].toString()};
    }

    return {ethereum, contractAddress: contract.address, users: others, mint};
  },
  {
    batchTransfer: true,
    burn: true,
    mandatoryERC721Receiver: true,
  }
);

function recurse(test) {
  if (test.subTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(test.title, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      for (const subTest of test.subTests) {
        // eslint-disable-next-line mocha/no-setup-in-describe
        recurse(subTest);
      }
    });
  } else {
    it(test.title, test.test);
  }
}

describe("Estate:ERC721", function () {
  for (const test of erc721Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
