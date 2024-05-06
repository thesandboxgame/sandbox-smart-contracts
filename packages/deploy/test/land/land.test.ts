import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {landAdmin} = await getNamedAccounts();
    await deployments.fixture(['Land']);
    const LandContract = await getEthersContract('Land');

    const RoyaltyManagerContract = await getEthersContract('RoyaltyManager');

    const OperatorFilterLandSubscription = await getEthersContract(
      'OperatorFilterLandSubscription'
    );
    const OperatorFilterRegistry = await getEthersContract(
      'OperatorFilterRegistry'
    );

    const MockMarketPlace1 = await getEthersContract('MockMarketPlace1');
    const MockMarketPlace2 = await getEthersContract('MockMarketPlace2');
    const MockMarketPlace3 = await getEthersContract('MockMarketPlace3');
    const MockMarketPlace4 = await getEthersContract('MockMarketPlace4');

    return {
      LandContract,
      RoyaltyManagerContract,
      OperatorFilterLandSubscription,
      OperatorFilterRegistry,
      MockMarketPlace1,
      MockMarketPlace2,
      MockMarketPlace3,
      MockMarketPlace4,
      landAdmin,
    };
  }
);

describe('Land', function () {
  describe('Roles', function () {
    it('Admin', async function () {
      const {LandContract, landAdmin} = await setupTest();
      expect(await LandContract.getAdmin()).to.be.equal(landAdmin);
    });
  });

  describe('Royalties', function () {
    it('Land is registered on RoyaltyManager', async function () {
      const {LandContract, RoyaltyManagerContract} = await setupTest();
      expect(await LandContract.getRoyaltyManager()).be.to.equal(
        RoyaltyManagerContract
      );
    });
  });

  describe('Operator Filter Registry', function () {
    it('Land contract is registered correctly', async function () {
      const {OperatorFilterRegistry, LandContract} = await setupTest();
      expect(await OperatorFilterRegistry.isRegistered(LandContract)).to.be
        .true;
    });

    it('Land contract is subscribed to correct address', async function () {
      const {
        OperatorFilterRegistry,
        LandContract,
        OperatorFilterLandSubscription,
      } = await setupTest();
      expect(
        await OperatorFilterRegistry.subscriptionOf(LandContract)
      ).to.be.equal(OperatorFilterLandSubscription);
    });

    it('Land contract has correct market places black listed', async function () {
      const {
        OperatorFilterRegistry,
        LandContract,
        MockMarketPlace1,
        MockMarketPlace2,
        MockMarketPlace3,
        MockMarketPlace4,
      } = await setupTest();
      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          LandContract,
          MockMarketPlace1
        ),
        'MarketPlace1 should be filtered'
      ).to.be.equal(true);

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          LandContract,
          MockMarketPlace2
        ),
        'MarketPlace2 should be filtered'
      ).to.be.equal(true);

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          LandContract,
          MockMarketPlace3
        ),
        'MarketPlace3 should not be filtered'
      ).to.be.equal(false);

      expect(
        await OperatorFilterRegistry.isOperatorFiltered(
          LandContract,
          MockMarketPlace4
        ),
        'MarketPlace4 should not be filtered'
      ).to.be.equal(false);
    });
  });
});
