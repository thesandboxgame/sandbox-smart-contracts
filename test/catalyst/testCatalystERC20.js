const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const {waitFor, recurseTests} = require("local-utils");
const generateERC20Tests = require("../erc20");

function testCatalyst(catalystName) {
  const erc20Tests = generateERC20Tests(
    async () => {
      const {others, catalystMinter} = await getNamedAccounts();
      await deployments.fixture();

      const contract = await ethers.getContract(catalystName);
      const tokenId = await contract.groupTokenId();

      const coreContract = await ethers.getContract("Catalyst", catalystMinter);
      async function mint(to, amount) {
        await waitFor(coreContract.mint(to, tokenId, amount));
      }

      return {ethereum, contractAddress: contract.address, users: others, mint};
    },
    {
      EIP717: true,
      burn: false,
    }
  );

  describe("Catalyst:ERC20", function () {
    for (const test of erc20Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testCatalyst("EpicCatalyst");
testCatalyst("CommonCatalyst");
