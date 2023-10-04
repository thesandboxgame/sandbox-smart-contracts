import {expect} from 'chai';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    const {assetAdmin, backendAuthWallet, assetPauser} =
      await getNamedAccounts();
    await deployments.fixture('Asset');
    const Asset = await deployments.get('Asset');
    const AssetContract = await ethers.getContractAt('Asset', Asset.address);
    const AssetReveal = await deployments.get('AssetReveal');
    const AssetRevealContract = await ethers.getContractAt(
      'AssetReveal',
      AssetReveal.address
    );
    const Catalyst = await deployments.get('Catalyst');
    const CatalystContract = await ethers.getContractAt(
      'Catalyst',
      Catalyst.address
    );
    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
    const AuthSuperValidator = await deployments.get('AuthSuperValidator');
    const AuthSuperValidatorContract = await ethers.getContractAt(
      'AuthSuperValidator',
      AuthSuperValidator.address
    );

    return {
      AssetContract,
      AssetRevealContract,
      CatalystContract,
      TRUSTED_FORWARDER,
      AuthSuperValidatorContract,
      assetAdmin,
      backendAuthWallet,
      assetPauser,
    };
  }
);

describe('Asset Reveal', function () {
  describe('Contract references', function () {
    it('AuthSuperValidator', async function () {
      const {AssetRevealContract, AuthSuperValidatorContract} =
        await setupTest();
      expect(await AssetRevealContract.getAuthValidator()).to.be.equal(
        AuthSuperValidatorContract.address
      );
    });
    it('Asset', async function () {
      const {AssetRevealContract, AssetContract} = await setupTest();
      expect(await AssetRevealContract.getAssetContract()).to.be.equal(
        AssetContract.address
      );
    });
  });
  describe('Roles', function () {
    it('Admin', async function () {
      const {AssetRevealContract, assetAdmin} = await setupTest();
      const defaultAdminRole = await AssetRevealContract.DEFAULT_ADMIN_ROLE();
      expect(await AssetRevealContract.hasRole(defaultAdminRole, assetAdmin)).to
        .be.true;
    });
    it("Asset's Minter role is granted to AssetReveal", async function () {
      const {AssetRevealContract, AssetContract} = await setupTest();
      const minterRole = await AssetContract.MINTER_ROLE();
      expect(
        await AssetContract.hasRole(minterRole, AssetRevealContract.address)
      ).to.be.true;
    });
    it('AuthSuperValidator signer is set to backendAuthWallet', async function () {
      const {
        AssetRevealContract,
        AuthSuperValidatorContract,
        backendAuthWallet,
      } = await setupTest();
      expect(
        await AuthSuperValidatorContract.getSigner(AssetRevealContract.address)
      ).to.be.equal(backendAuthWallet);
      expect(
        await AuthSuperValidatorContract.getSigner(AssetRevealContract.address)
      ).to.be.equal(backendAuthWallet);
    });
    it('Pauser role is granted to assetPauser', async function () {
      const {AssetRevealContract, assetPauser} = await setupTest();
      const pauserRole = await AssetRevealContract.PAUSER_ROLE();
      expect(await AssetRevealContract.hasRole(pauserRole, assetPauser)).to.be
        .true;
    });
  });
  describe('EIP712', function () {
    it("name is 'Sandbox Asset Reveal'", async function () {
      const {AssetRevealContract} = await setupTest();
      const eip712Domain = await AssetRevealContract.eip712Domain();
      expect(eip712Domain.name).to.be.equal('Sandbox Asset Reveal');
    });
    it("version is '1.0'", async function () {
      const {AssetRevealContract} = await setupTest();
      const eip712Domain = await AssetRevealContract.eip712Domain();
      expect(eip712Domain.version).to.be.equal('1.0');
    });
  });
  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {AssetRevealContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await AssetRevealContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER.address
      );
    });
  });
});
