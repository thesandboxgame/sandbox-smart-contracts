const {ethers, getUnnamedAccounts, getNamedAccounts} = require('hardhat');
const {waitFor, recurseTests, withSnapshot} = require('../../../utils');
const generateERC20Tests = require('../../../erc20');

function testCatalyst(catalystName) {
  const erc20Tests = generateERC20Tests(
    withSnapshot(['PolygonCatalysts'], async () => {
      const others = await getUnnamedAccounts();
      const {catalystMinter} = await getNamedAccounts();
      const contract = await ethers.getContract(catalystName);

      function mint(to, amount) {
        return waitFor(
          contract
            .connect(ethers.provider.getSigner(catalystMinter))
            .mint(to, amount)
        );
      }

      return {
        ethersProvider: ethers.provider,
        contractAddress: contract.address,
        users: others,
        mint,
      };
    }),
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

testCatalyst('PolygonCatalyst_EPIC');
// testCatalyst('Catalyst_COMMON');
// testCatalyst('Catalyst_RARE');
// testCatalyst('Catalyst_LEGENDARY');
