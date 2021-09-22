import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {expect} from './chai-setup';
import {cleanTestingEnvironment, createSnapshot} from './utils';

async function isContractAvailable(addr: string): Promise<boolean> {
  const code = await ethers.provider.getCode(addr);
  return code !== '0x';
}
// eslint-disable-next-line @typescript-eslint/no-empty-function
const setup1 = deployments.createFixture(async () => {});
const setup2 = deployments.createFixture(async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('FakeChildChainManager', {from: deployer});
  const contract = await ethers.getContract('FakeChildChainManager');
  await contract.setPolygonAsset(contract.address);
  return contract;
});
// eslint-disable-next-line @typescript-eslint/no-empty-function
const setup3 = deployments.createFixture(async () => {});

const createSnapshotSetup = createSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('FakeChildChainManager', {
    from: deployer,
    proxy: false,
  });
  return await ethers.getContract('FakeChildChainManager');
});
async function thrown(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (err) {
    return err.message;
  }
}
describe('Snapshot/Revert', function () {
  describe('Common mistakes', function () {
    before(cleanTestingEnvironment);

    describe('Using createFixture more than once', function () {
      it('we take a snapshot with setup1 and the next step fails', async function () {
        await setup1();
      });
      it('in an unrelated test we call setup1 again erasing what setup2 done.', async function () {
        const contract = await setup2();
        await setup1();
        // The contract is missing in the evm.
        // With this condition the step alone fails but it works when run all the steps together.
        expect(await isContractAvailable(contract.address)).to.be.false;
      });
    });

    describe('Using fixture outside of createFixture contaminates the testing environment for now on', function () {
      it('we call fixture, so now we have a lot more than expected in the next tests', async function () {
        await deployments.fixture('Asset');
        const contract = await ethers.getContract('Asset');
        expect(await isContractAvailable(contract.address)).to.be.true;
      });
      it('if we take a snapshot here we will get Asset inside it', async function () {
        await setup3();
        const contract = await ethers.getContract('Asset');
        expect(await isContractAvailable(contract.address)).to.be.true;
      });
      it("The contract is still available even if we didn't did the deploy here. This can be in a different test suite", async function () {
        const contract = await ethers.getContract('Asset');
        expect(await isContractAvailable(contract.address)).to.be.true;
      });
    });
  });

  describe('Cleaning works for fixtures called elsewhere', function () {
    before(cleanTestingEnvironment);
    describe('Cleaning let you test each test and the whole thing without errors', function () {
      let addr: string;
      it('we call fixture, so now we have a lot more than expected', async function () {
        await deployments.fixture('Asset');
        const contract = await ethers.getContract('Asset');
        addr = contract.address;
        expect(await isContractAvailable(contract.address)).to.be.true;
      });
      it('clean removes the data from the evm and from the hardhat-deploy memory cache', async function () {
        await cleanTestingEnvironment();
        expect(await thrown(ethers.getContract('Asset'))).to.be.equal(
          'No Contract deployed with name Asset'
        );
        expect(await isContractAvailable(addr)).to.be.false;
      });
    });
  });

  describe('createSnapshot is the right way to user fixtures + createFixture', function () {
    it("createSnapshot doesn't care about what happen before", async function () {
      await deployments.fixture('Asset');
      const asset = await ethers.getContract('Asset');
      const contract = await createSnapshotSetup();
      expect(await isContractAvailable(contract.address)).to.be.true;
      expect(await thrown(ethers.getContract('Asset'))).to.be.equal(
        'No Contract deployed with name Asset'
      );
      expect(await isContractAvailable(asset.address)).to.be.false;
    });
  });
});
