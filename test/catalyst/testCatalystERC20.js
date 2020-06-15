const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const {waitFor} = require("local-utils");
const erc20Tests = require("../erc20")(
  async () => {
    const {others, catalystMinter} = await getNamedAccounts();
    await deployments.fixture();

    const contract = await ethers.getContract("CommonCatalyst", catalystMinter);
    async function mint(to, amount) {
      await waitFor(contract.mint(to, amount));
    }
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

// TODO renable if using ERC20
// describe("Catalyst:ERC20", function () {
//   for (const test of erc20Tests) {
//     // eslint-disable-next-line mocha/no-setup-in-describe
//     recurse(test);
//   }
// });
