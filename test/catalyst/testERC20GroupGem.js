const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const erc20GroupTests = require("../erc20Group")(
  async () => {
    const {others, gemMinter} = await getNamedAccounts();
    await deployments.fixture();

    const contract = await ethers.getContract("Gem", gemMinter);

    async function mint(to, amount) {
      const tx = await contract.mint(to, 1, amount);
      const receipt = await tx.wait();
      return {receipt};
    }
    async function batchMint(to, amount) {
      const tx = await contract.batchMint(to, [1, 2, 3], amount);
      const receipt = await tx.wait();
      return {receipt};
    }
    return {ethereum, contractAddress: contract.address, users: others, mint, batchMint};
  },
  {
    // TODO extensions
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

describe("Gems:ERC20Group", function () {
  for (const test of erc20GroupTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
