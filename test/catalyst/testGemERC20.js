const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const {waitFor} = require("local-utils");
const erc20Tests = require("../erc20")(
  async () => {
    const {others, gemCoreMinter} = await getNamedAccounts();
    await deployments.fixture();

    const coreContract = await ethers.getContract("GemCore", gemCoreMinter);
    async function mint(to, amount) {
      await waitFor(coreContract.mint(to, 0, amount));
    }
    const contract = await ethers.getContract("Luck");
    return {ethereum, contractAddress: contract.address, users: others, mint};
  },
  {
    EIP717: true,
    burn: true,
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

describe("Gem:ERC20", function () {
  for (const test of erc20Tests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
