import {expect} from 'chai';
import {parseEther} from 'ethers';
import {
  LazyMintBatchData,
  LazyMintData,
  getMatchedOrders,
} from '../../utils/lazyMinting';
import setupAssetCreateTests from './assetCreateFixture';

describe('Asset Create', function () {
  describe('Contract references', function () {
    it('AuthSuperValidator', async function () {
      const {AssetCreateContract, AuthSuperValidatorContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.authValidator()).to.be.equal(
        AuthSuperValidatorContract
      );
    });

    it('Asset', async function () {
      const {AssetCreateContract, AssetContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.assetContract()).to.be.equal(
        AssetContract
      );
    });

    it('Catalyst', async function () {
      const {AssetCreateContract, CatalystContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.catalystContract()).to.be.equal(
        CatalystContract
      );
    });

    it('Exchange', async function () {
      const {AssetCreateContract, ExchangeContract} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.exchangeContract()).to.be.equal(
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
      const {AssetCreateContract, SandboxForwarder} =
        await setupAssetCreateTests();
      expect(await AssetCreateContract.getTrustedForwarder()).to.be.equal(
        SandboxForwarder
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

    it('reverts when signature is expired', async function () {
      const {
        user,
        creator,
        SandContract,
        createSingleLazyMintSignature,
        AssetCreateContract,
        getCurrentTimestamp,
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
        expirationTime: BigInt(await getCurrentTimestamp()) - 1000n,
      };

      const signature = await createSingleLazyMintSignature(mintData);

      await expect(
        AssetCreateContract.lazyCreateAsset(
          user,
          signature,
          [...Object.values(mintData)],
          []
        )
      ).to.be.revertedWith('AuthSuperValidator: Expired');
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
        getCurrentTimestamp,
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
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
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
        getCurrentTimestamp,
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
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
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
        getCurrentTimestamp,
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
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
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
        getCurrentTimestamp,
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
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
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

    it('allows users to batch lazy mint when they have all necessary catalysts - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2)],
        amounts: [BigInt(1)],
        unitPrices: [BigInt(1)],
        paymentTokens: [await SandContract.getAddress()],
        metadataHashes: ['0x'],
        maxSupplies: [BigInt(1)],
        creators: [creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );
      // approve Sand to AssetCreate
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        totalAmountToApprove
      );

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          []
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('allows users to batch lazy mint when they have all necessary catalysts - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2)],
        amounts: [BigInt(1)],
        unitPrices: [BigInt(1)],
        paymentTokens: [await SandContract.getAddress()],
        metadataHashes: ['0x'],
        maxSupplies: [BigInt(1)],
        creators: [creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      const signature = await createBatchLazyMintSignature(mintData);

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateMultipleAssets',
        [user, signature, [...Object.values(mintData)], []]
      );

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          totalAmountToApprove,
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('allows users to batch lazy mint with Catalyst purchase - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2)],
        amounts: [BigInt(1)],
        unitPrices: [parseEther('0.1')],
        paymentTokens: [await SandContract.getAddress()],
        metadataHashes: ['0x'],
        maxSupplies: [BigInt(10)],
        creators: [creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve AssetCreate to transfer Sand (to creator)
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        mintData.unitPrices.reduce((acc, curr) => acc + curr, 0n)
      );

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice *
          mintData.amounts.reduce((acc, curr) => acc + curr, 0n)
      );

      const orderData = await getMatchedOrders(
        CatalystContract,
        parseEther('1'),
        SandContract,
        OrderValidatorContract,
        mintData.tiers[0],
        mintData.amounts[0],
        tsbCatSellerSigner,
        userSigner
      );

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          [orderData]
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('allows users to batch lazy mint with Catalyst purchase - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2)],
        amounts: [BigInt(1)],
        unitPrices: [parseEther('0.1')],
        paymentTokens: [await SandContract.getAddress()],
        metadataHashes: ['0x'],
        maxSupplies: [BigInt(10)],
        creators: [creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice *
          mintData.amounts.reduce((acc, curr) => acc + curr, 0n)
      );

      const orderData = await getMatchedOrders(
        CatalystContract,
        parseEther('1'),
        SandContract,
        OrderValidatorContract,
        mintData.tiers[0],
        mintData.amounts[0],
        tsbCatSellerSigner,
        userSigner
      );

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateMultipleAssets',
        [user, signature, [...Object.values(mintData)], [orderData]]
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          mintData.unitPrices.reduce((acc, curr) => acc + curr, 0n),
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 3 different assets - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2), BigInt(3), BigInt(4)],
        amounts: [BigInt(1), BigInt(1), BigInt(1)],
        unitPrices: [BigInt(1), BigInt(1), BigInt(1)],
        paymentTokens: [
          await SandContract.getAddress(),
          await SandContract.getAddress(),
          await SandContract.getAddress(),
        ],
        metadataHashes: ['0x1', '0x2', '0x3'],
        maxSupplies: [BigInt(1), BigInt(1), BigInt(1)],
        creators: [creator, creator, creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );
      // approve Sand to AssetCreate
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        totalAmountToApprove
      );

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          []
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 3 different assets - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2), BigInt(3), BigInt(4)],
        amounts: [BigInt(1), BigInt(1), BigInt(1)],
        unitPrices: [BigInt(1), BigInt(1), BigInt(1)],
        paymentTokens: [
          await SandContract.getAddress(),
          await SandContract.getAddress(),
          await SandContract.getAddress(),
        ],
        metadataHashes: ['0x1', '0x2', '0x3'],
        maxSupplies: [BigInt(1), BigInt(1), BigInt(1)],
        creators: [creator, creator, creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      const signature = await createBatchLazyMintSignature(mintData);

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateMultipleAssets',
        [user, signature, [...Object.values(mintData)], []]
      );

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          totalAmountToApprove,
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 3 different assets with catalyst purchase - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: [BigInt(2), BigInt(3), BigInt(4)],
        amounts: [BigInt(1), BigInt(1), BigInt(1)],
        unitPrices: [parseEther('0.1'), parseEther('0.1'), parseEther('0.1')],
        paymentTokens: [
          await SandContract.getAddress(),
          await SandContract.getAddress(),
          await SandContract.getAddress(),
        ],
        metadataHashes: ['0x1', '0x2', '0x3'],
        maxSupplies: [BigInt(10), BigInt(10), BigInt(10)],
        creators: [creator, creator, creator],
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve AssetCreate to transfer Sand (to creator)
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        mintData.unitPrices.reduce((acc, curr) => acc + curr, 0n)
      );

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice *
          mintData.amounts.reduce((acc, curr) => acc + curr, 0n)
      );

      const orders = await Promise.all(
        mintData.tiers.map((tier, i) =>
          getMatchedOrders(
            CatalystContract,
            parseEther('1'),
            SandContract,
            OrderValidatorContract,
            tier,
            mintData.amounts[i],
            tsbCatSellerSigner,
            userSigner
          )
        )
      );

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          orders
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 10 different assets - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const randomHashes = Array(10)
        .fill(0)
        .map(() => '0x' + Math.floor(Math.random() * 100000).toString(16));

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: Array(10).fill(BigInt(2)),
        amounts: Array(10).fill(BigInt(1)),
        unitPrices: Array(10).fill(BigInt(1)),
        paymentTokens: Array(10).fill(await SandContract.getAddress()),
        metadataHashes: randomHashes,
        maxSupplies: Array(10).fill(BigInt(1)),
        creators: Array(10).fill(creator),
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );
      // approve Sand to AssetCreate
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        totalAmountToApprove
      );

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          []
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 10 different assets - approveAndCall', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const randomHashes = Array(10)
        .fill(0)
        .map(() => '0x' + Math.floor(Math.random() * 100000).toString(16));

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: Array(10).fill(BigInt(2)),
        amounts: Array(10).fill(BigInt(1)),
        unitPrices: Array(10).fill(BigInt(1)),
        paymentTokens: Array(10).fill(await SandContract.getAddress()),
        metadataHashes: randomHashes,
        maxSupplies: Array(10).fill(BigInt(1)),
        creators: Array(10).fill(creator),
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      // Mint catalysts to user
      for (let i = 0; i < mintData.tiers.length; i++) {
        await CatalystContractAsAdmin.mint(
          user,
          mintData.tiers[i],
          mintData.amounts[i]
        );
      }

      const signature = await createBatchLazyMintSignature(mintData);

      const encodedFunction = AssetCreateContract.interface.encodeFunctionData(
        'lazyCreateMultipleAssets',
        [user, signature, [...Object.values(mintData)], []]
      );

      // amounts * unitPrices
      const totalAmountToApprove = mintData.unitPrices.reduce(
        (acc, curr, i) => acc + curr * mintData.amounts[i],
        0n
      );

      await expect(
        SandContract.connect(userSigner).approveAndCall(
          await AssetCreateContract.getAddress(),
          totalAmountToApprove,
          encodedFunction
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });

    it('batch mints 10 different assets with catalyst purchase - direct', async function () {
      const {
        user,
        userSigner,
        creator,
        SandContract,
        createBatchLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
        getCurrentTimestamp,
      } = await setupAssetCreateTests();

      const randomHashes = Array(10)
        .fill(0)
        .map(() => '0x' + Math.floor(Math.random() * 100000).toString(16));

      const mintData: LazyMintBatchData = {
        caller: user,
        tiers: Array(10).fill(BigInt(2)),
        amounts: Array(10).fill(BigInt(1)),
        unitPrices: Array(10).fill(parseEther('0.1')),
        paymentTokens: Array(10).fill(await SandContract.getAddress()),
        metadataHashes: randomHashes,
        maxSupplies: Array(10).fill(BigInt(10)),
        creators: Array(10).fill(creator),
        expirationTime: BigInt(await getCurrentTimestamp()) + 1000n,
      };

      const signature = await createBatchLazyMintSignature(mintData);

      const catPurchasePrice = parseEther('1');

      // approve AssetCreate to transfer Sand (to creator)
      await SandContract.connect(userSigner).approve(
        await AssetCreateContract.getAddress(),
        mintData.unitPrices.reduce((acc, curr) => acc + curr, 0n)
      );

      // approve exchange contract to transfer Sand (to cat seller)
      await SandContract.connect(userSigner).approve(
        await ExchangeContract.getAddress(),
        catPurchasePrice *
          mintData.amounts.reduce((acc, curr) => acc + curr, 0n)
      );

      const orders = await Promise.all(
        mintData.tiers.map((tier, i) =>
          getMatchedOrders(
            CatalystContract,
            parseEther('1'),
            SandContract,
            OrderValidatorContract,
            tier,
            mintData.amounts[i],
            tsbCatSellerSigner,
            userSigner
          )
        )
      );

      await expect(
        AssetCreateContract.lazyCreateMultipleAssets(
          user,
          signature,
          [...Object.values(mintData)],
          orders
        )
      ).to.emit(AssetCreateContract, 'AssetBatchLazyMinted');
    });
  });
});
