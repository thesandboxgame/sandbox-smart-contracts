import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {deployer} = await getNamedAccounts();
    await deployments.fixture(['Land']);
    const LandContract = await getEthersContract('Land');

    const RoyaltyManagerContract = await getEthersContract('RoyaltyManager');

    const OperatorFilterLandSubscription = await getEthersContract(
      'OperatorFilterLandSubscription'
    );
    const OperatorFilterRegistry = await getEthersContract(
      'OperatorFilterRegistry'
    );

    return {
      LandContract,
      RoyaltyManagerContract,
      OperatorFilterLandSubscription,
      OperatorFilterRegistry,
      deployer,
    };
  }
);

describe('Land', function () {
  describe('Roles', function () {
    it('Admin', async function () {
      const {LandContract, deployer} = await setupTest();
      expect(await LandContract.getAdmin()).to.be.equal(deployer);
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
  });
});
