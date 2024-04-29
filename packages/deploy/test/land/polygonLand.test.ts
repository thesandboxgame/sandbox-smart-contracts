import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, network, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {landAdmin} = await getNamedAccounts();
    await deployments.fixture(['PolygonLand']);
    const PolygonLandContract = await getEthersContract('PolygonLand');

    const RoyaltyManagerContract = await getEthersContract('RoyaltyManager');

    const TRUSTED_FORWARDER = await getEthersContract('TRUSTED_FORWARDER_V2');

    const OperatorFilterLandSubscription = await getEthersContract(
      'OperatorFilterLandSubscription'
    );
    const PolygonOperatorFilterRegistry = await getEthersContract(
      'PolygonOperatorFilterRegistry'
    );

    const MockMarketPlace1 = await getEthersContract('MockMarketPlace1');
    const MockMarketPlace2 = await getEthersContract('MockMarketPlace2');
    const MockMarketPlace3 = await getEthersContract('MockMarketPlace3');
    const MockMarketPlace4 = await getEthersContract('MockMarketPlace4');

    return {
      PolygonLandContract,
      RoyaltyManagerContract,
      TRUSTED_FORWARDER,
      OperatorFilterLandSubscription,
      PolygonOperatorFilterRegistry,
      MockMarketPlace1,
      MockMarketPlace2,
      MockMarketPlace3,
      MockMarketPlace4,
      landAdmin,
    };
  }
);

describe('PolygonLand', function () {
  describe('Roles', function () {
    it('Admin', async function () {
      const {PolygonLandContract, landAdmin} = await setupTest();
      expect(await PolygonLandContract.getAdmin()).to.be.equal(landAdmin);
    });
  });

  describe('Royalties', function () {
    it('Land is registered on RoyaltyManager', async function () {
      const {PolygonLandContract, RoyaltyManagerContract} = await setupTest();
      expect(await PolygonLandContract.getRoyaltyManager()).be.to.equal(
        RoyaltyManagerContract
      );
    });
  });

  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {PolygonLandContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await PolygonLandContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER
      );
    });
  });

  describe('Operator Filter Registry', function () {
    it('Land contract is registered correctly', async function () {
      const {PolygonOperatorFilterRegistry, PolygonLandContract} =
        await setupTest();
      expect(
        await PolygonOperatorFilterRegistry.isRegistered(PolygonLandContract)
      ).to.be.true;
    });

    it('Land contract is subscribed to correct address', async function () {
      const {
        PolygonOperatorFilterRegistry,
        PolygonLandContract,
        OperatorFilterLandSubscription,
      } = await setupTest();
      expect(
        await PolygonOperatorFilterRegistry.subscriptionOf(PolygonLandContract)
      ).to.be.equal(OperatorFilterLandSubscription);
    });

    it('Land contract has correct market places black listed', async function () {
      const {
        PolygonOperatorFilterRegistry,
        PolygonLandContract,
        MockMarketPlace1,
        MockMarketPlace2,
        MockMarketPlace3,
        MockMarketPlace4,
      } = await setupTest();
      expect(
        await PolygonOperatorFilterRegistry.isOperatorFiltered(
          PolygonLandContract,
          MockMarketPlace1
        ),
        'MarketPlace1 should be filtered'
      ).to.be.equal(true);

      expect(
        await PolygonOperatorFilterRegistry.isOperatorFiltered(
          PolygonLandContract,
          MockMarketPlace2
        ),
        'MarketPlace2 should be filtered'
      ).to.be.equal(true);

      expect(
        await PolygonOperatorFilterRegistry.isOperatorFiltered(
          PolygonLandContract,
          MockMarketPlace3
        ),
        'MarketPlace3 should not be filtered'
      ).to.be.equal(false);

      expect(
        await PolygonOperatorFilterRegistry.isOperatorFiltered(
          PolygonLandContract,
          MockMarketPlace4
        ),
        'MarketPlace4 should not be filtered'
      ).to.be.equal(false);
    });
  });
});
