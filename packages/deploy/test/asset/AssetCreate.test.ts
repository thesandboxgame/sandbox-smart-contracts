import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {assetAdmin, backendAuthWallet, assetPauser} =
      await getNamedAccounts();
    await deployments.fixture();
    const AssetContract = await getEthersContract('Asset');
    const AssetCreateContract = await getEthersContract('AssetCreate');
    const CatalystContract = await getEthersContract('Catalyst');
    const TRUSTED_FORWARDER = await getEthersContract('TRUSTED_FORWARDER_V2');
    const AuthSuperValidatorContract = await getEthersContract(
      'AuthSuperValidator'
    );

    return {
      AssetContract,
      AssetCreateContract,
      CatalystContract,
      TRUSTED_FORWARDER,
      AuthSuperValidatorContract,
      assetAdmin,
      backendAuthWallet,
      assetPauser,
    };
  }
);

describe('Asset Create', function () {
  describe('Contract references', function () {
    it('AuthSuperValidator', async function () {
      const {AssetCreateContract, AuthSuperValidatorContract} =
        await setupTest();
      expect(await AssetCreateContract.getAuthValidator()).to.be.equal(
        AuthSuperValidatorContract
      );
    });

    it('Asset', async function () {
      const {AssetCreateContract, AssetContract} = await setupTest();
      expect(await AssetCreateContract.getAssetContract()).to.be.equal(
        AssetContract
      );
    });

    it('Catalyst', async function () {
      const {AssetCreateContract, CatalystContract} = await setupTest();
      expect(await AssetCreateContract.getCatalystContract()).to.be.equal(
        CatalystContract
      );
    });
  });

  describe('Roles', function () {
    it('Admin', async function () {
      const {AssetCreateContract, assetAdmin} = await setupTest();
      const defaultAdminRole = await AssetCreateContract.DEFAULT_ADMIN_ROLE();
      expect(await AssetCreateContract.hasRole(defaultAdminRole, assetAdmin)).to
        .be.true;
    });

    it("Asset's Minter role is granted to AssetCreate", async function () {
      const {AssetCreateContract, AssetContract} = await setupTest();
      const minterRole = await AssetContract.MINTER_ROLE();
      expect(await AssetContract.hasRole(minterRole, AssetCreateContract)).to.be
        .true;
    });

    it("Catalyst's Burner role is granted to AssetCreate", async function () {
      const {AssetCreateContract, CatalystContract} = await setupTest();
      const burnerRole = await CatalystContract.BURNER_ROLE();
      expect(await CatalystContract.hasRole(burnerRole, AssetCreateContract)).to
        .be.true;
    });

    it('AuthSuperValidator signer is set to backendAuthWallet', async function () {
      const {
        AssetCreateContract,
        AuthSuperValidatorContract,
        backendAuthWallet,
      } = await setupTest();
      expect(
        await AuthSuperValidatorContract.getSigner(AssetCreateContract)
      ).to.be.equal(backendAuthWallet);
      expect(
        await AuthSuperValidatorContract.getSigner(AssetCreateContract)
      ).to.be.equal(backendAuthWallet);
    });

    it('Pauser role is granted to assetPauser', async function () {
      const {AssetCreateContract, assetPauser} = await setupTest();
      const pauserRole = await AssetCreateContract.PAUSER_ROLE();
      expect(await AssetCreateContract.hasRole(pauserRole, assetPauser)).to.be
        .true;
    });
  });

  describe('EIP712', function () {
    it("name is 'Sandbox Asset Create'", async function () {
      const {AssetCreateContract} = await setupTest();
      const eip712Domain = await AssetCreateContract.eip712Domain();
      expect(eip712Domain.name).to.be.equal('Sandbox Asset Create');
    });

    it("version is '1.0'", async function () {
      const {AssetCreateContract} = await setupTest();
      const eip712Domain = await AssetCreateContract.eip712Domain();
      expect(eip712Domain.version).to.be.equal('1.0');
    });
  });

  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {AssetCreateContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await AssetCreateContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER
      );
    });
  });
});
