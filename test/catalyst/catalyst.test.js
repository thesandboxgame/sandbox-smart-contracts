const {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} = require('hardhat');
const {waitFor, recurseTests} = require('../utils');
const generateERC20Tests = require('../erc20');

function testCatalyst(catalystName) {
  const erc20Tests = generateERC20Tests(
    async () => {
      const others = await getUnnamedAccounts();
      const {deployer} = await getNamedAccounts();
      await deployments.fixture();
      const contract = await ethers.getContract(catalystName);

      function mint(to, amount) {
        return waitFor(
          contract.connect(ethers.provider.getSigner(deployer)).mint(to, amount)
        );
      }

      return {
        ethersProvider: ethers.provider,
        contractAddress: contract.address,
        users: others,
        mint,
      };
    },
    {
      EIP717: true,
      burn: false,
    }
  );

  describe(catalystName, function () {
    for (const test of erc20Tests) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      recurseTests(test);
    }
  });
}

testCatalyst('Catalyst_Epic');
// testCatalyst('Catalyst_Common');
// testCatalyst('Catalyst_Rare');
// testCatalyst('Catalyst_Legendary');
