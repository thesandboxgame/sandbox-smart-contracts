const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const {waitFor, recurseTests} = require("local-utils");
const generateERC20Tests = require("../erc20");

function testGem(gemName) {
  const erc20Tests = generateERC20Tests(
    async () => {
      const {others, gemCoreMinter} = await getNamedAccounts();
      await deployments.fixture();

      const contract = await ethers.getContract(gemName);
      const tokenId = await contract.groupTokenId();

      const coreContract = await ethers.getContract("GemCore", gemCoreMinter);
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

  describe("Gem:ERC20", function () {
    for (const test of erc20Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testGem("LuckGem");
testGem("PowerGem");
