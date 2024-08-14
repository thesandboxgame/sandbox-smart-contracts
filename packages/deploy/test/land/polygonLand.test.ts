import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {deployer, sandAdmin} = await getNamedAccounts();
    await deployments.fixture(['PolygonLand']);
    const PolygonLandContract = await getEthersContract('PolygonLand');

    const RoyaltyManagerContract = await getEthersContract('RoyaltyManager');

    const TRUSTED_FORWARDER = await getEthersContract('TRUSTED_FORWARDER_V2');

    const PolygonOperatorFilterSubscription = await getEthersContract(
      'PolygonOperatorFilterSubscription'
    );
    const PolygonOperatorFilterRegistry = await getEthersContract(
      'PolygonOperatorFilterRegistry'
    );

    return {
      PolygonLandContract,
      RoyaltyManagerContract,
      TRUSTED_FORWARDER,
      PolygonOperatorFilterSubscription,
      PolygonOperatorFilterRegistry,
      deployer,
      sandAdmin,
    };
  }
);

describe('PolygonLand', function () {
  describe('Roles', function () {
    it('Admin', async function () {
      const {PolygonLandContract, sandAdmin} = await setupTest();
      expect(await PolygonLandContract.getAdmin()).to.be.equal(sandAdmin);
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
        PolygonOperatorFilterSubscription,
      } = await setupTest();
      expect(
        await PolygonOperatorFilterRegistry.subscriptionOf(PolygonLandContract)
      ).to.be.equal(PolygonOperatorFilterSubscription);
    });
  });
});
