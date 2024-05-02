import {expect} from 'chai';
import {LazyMintData, getMatchedOrders} from '../../utils/lazyMinting';
import {parseEther} from 'ethers';
import setupAssetCreateTests from './assetCreateFixture';

describe.only('Asset Create', function () {
  describe('Contract references', function () {
    it('AuthSuperValidator', async function () {
      const {AssetCreateContract, AuthSuperValidatorContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getAuthValidator()).to.be.equal(
        AuthSuperValidatorContract
      );
    });
    it('Asset', async function () {
      const {AssetCreateContract, AssetContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getAssetContract()).to.be.equal(
        AssetContract
      );
    });
    it('Catalyst', async function () {
      const {AssetCreateContract, CatalystContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getCatalystContract()).to.be.equal(
        CatalystContract
      );
    });
    it('Exchange', async function () {
      const {AssetCreateContract, ExchangeContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getExchangeContract()).to.be.equal(
        ExchangeContract
      );
    });
  });
  describe('Roles', function () {
    it('Admin', async function () {
      const {AssetCreateContract, assetAdmin} = await setupAssetCreateTests();
      const defaultAdminRole = await AssetCreateContract.DEFAULT_ADMIN_ROLE();
      expect(await AssetCreateContract.hasRole(defaultAdminRole, assetAdmin)).to
        .be.true;
    });
    it("Asset's Minter role is granted to AssetCreate", async function () {
      const {AssetCreateContract, AssetContract} =
        await setupAssetCreateTests();
      const minterRole = await AssetContract.MINTER_ROLE();
      expect(await AssetContract.hasRole(minterRole, AssetCreateContract)).to.be
        .true;
    });
    it("Catalyst's Burner role is granted to AssetCreate", async function () {
      const {AssetCreateContract, CatalystContract} =
        await setupAssetCreateTests();
      const burnerRole = await CatalystContract.BURNER_ROLE();
      expect(await CatalystContract.hasRole(burnerRole, AssetCreateContract)).to
        .be.true;
    });
    it('AuthSuperValidator signer is set to backendAuthWallet', async function () {
      const {
        AssetCreateContract,
        AuthSuperValidatorContract,
        backendAuthWallet,
      } = await setupAssetCreateTests();
      expect(
        await AuthSuperValidatorContract.getSigner(AssetCreateContract)
      ).to.be.equal(backendAuthWallet);
      expect(
        await AuthSuperValidatorContract.getSigner(AssetCreateContract)
      ).to.be.equal(backendAuthWallet);
    });
    it('Pauser role is granted to assetPauser', async function () {
      const {AssetCreateContract, assetPauser} = await setupAssetCreateTests();
      const pauserRole = await AssetCreateContract.PAUSER_ROLE();
      expect(await AssetCreateContract.hasRole(pauserRole, assetPauser)).to.be
        .true;
    });
  });
  describe('EIP712', function () {
    it("name is 'Sandbox Asset Create'", async function () {
      const {AssetCreateContract} = await setupAssetCreateTests();
      const eip712Domain = await AssetCreateContract.eip712Domain();
      expect(eip712Domain.name).to.be.equal('Sandbox Asset Create');
    });
    it("version is '1.0'", async function () {
      const {AssetCreateContract} = await setupAssetCreateTests();
      const eip712Domain = await AssetCreateContract.eip712Domain();
      expect(eip712Domain.version).to.be.equal('1.0');
    });
  });
  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {AssetCreateContract, TRUSTED_FORWARDER} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER
      );
    });
  });
  describe('Lazy Minting', function () {
    it('Lazy minting fee is set to 0', async function () {
      const {AssetCreateContract} = await setupAssetCreateTests();
      expect(await AssetCreateContract.lazyMintFeeInBps()).to.be.equal(0);
    });
    it('Lazy minting fee receiver is set to treasury', async function () {
      const {AssetCreateContract, treasury} = await setupAssetCreateTests();
      expect(await AssetCreateContract.lazyMintFeeReceiver()).to.be.equal(
        treasury
      );
    });
    it('allows users to lazy mint when they have all necessary catalysts - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createSingleLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
      } = await setupAssetCreateTests();

      const mintData: LazyMintData = {
        caller: user,
        tier: BigInt(2),
        amount: BigInt(1),
        unitPrice: BigInt(1),
        paymentToken: await SandContract.getAddress(),
        metadataHash: '0x',
        maxSupply: BigInt(1),
        creator,
      };

      const signature = await createSingleLazyMintSignature(mintData);

      // approve Sand to AssetCreate
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        mintData.unitPrice
      );

      // Mint catalysts to user
      await CatalystContractAsAdmin.mint(user, mintData.tier, mintData.amount);

      await expect(
        AssetCreateContract.lazyCreateAsset(
          user,
          signature,
          [...Object.values(mintData)],
          []
        )
      ).to.emit(AssetCreateContract, 'AssetLazyMinted');
    });
    it('allows users to lazy mint when they have all necessary catalysts - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createSingleLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
      } = await setupAssetCreateTests();

      const mintData: LazyMintData = {
        caller: user,
        tier: BigInt(2),
        amount: BigInt(1),
        unitPrice: BigInt(1),
        paymentToken: await SandContract.getAddress(),
        metadataHash: '0x',
        maxSupply: BigInt(1),
        creator,
      };

      // Mint catalysts to user
      await CatalystContractAsAdmin.mint(user, mintData.tier, mintData.amount);

      const signature = await createSingleLazyMintSignature(mintData);

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateAsset',
        [user, signature, [...Object.values(mintData)], []]
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          mintData.unitPrice,
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetLazyMinted');
    });
    it('allows users to lazy mint with Catalyst purchase - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createSingleLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
      } = await setupAssetCreateTests();

      const mintData: LazyMintData = {
        caller: user,
        tier: BigInt(2),
        amount: BigInt(1),
        unitPrice: parseEther('0.1'),
        paymentToken: await SandContract.getAddress(),
        metadataHash: '0x',
        maxSupply: BigInt(10),
        creator,
      };

      const signature = await createSingleLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve AssetCreate to transfer Sand (to creator)
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        mintData.unitPrice
      );

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice * mintData.amount
      );

      const orderData = await getMatchedOrders(
        CatalystContract,
        parseEther('1'),
        SandContract,
        OrderValidatorContract,
        mintData.tier,
        mintData.amount,
        tsbCatSellerSigner,
        userSigner
      );

      await expect(
        AssetCreateContract.lazyCreateAsset(
          user,
          signature,
          [...Object.values(mintData)],
          orderData
        )
      ).to.emit(AssetCreateContract, 'AssetLazyMinted');
    });
    it('allows users to lazy mint with Catalyst purchase - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createSingleLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
      } = await setupAssetCreateTests();

      const mintData: LazyMintData = {
        caller: user,
        tier: BigInt(2),
        amount: BigInt(1),
        unitPrice: parseEther('0.1'),
        paymentToken: await SandContract.getAddress(),
        metadataHash: '0x',
        maxSupply: BigInt(10),
        creator,
      };

      const signature = await createSingleLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice * mintData.amount
      );

      const orderData = await getMatchedOrders(
        CatalystContract,
        parseEther('1'),
        SandContract,
        OrderValidatorContract,
        mintData.tier,
        mintData.amount,
        tsbCatSellerSigner,
        userSigner
      );

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateAsset',
        [user, signature, [...Object.values(mintData)], orderData]
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          mintData.unitPrice,
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetLazyMinted');
    });
    it('allows users to batch lazy mint when they have all necessary catalysts - direct', async function () {});
    it('allows users to batch lazy mint when they have all necessary catalysts - approveAndCall', async function () {});
    it('allows users to batch lazy mint with Catalyst purchase - direct', async function () {});
    it('allows users to batch lazy mint with Catalyst purchase - approveAndCall', async function () {});
  });
});
