import {expect} from 'chai';
import {deployments} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {getMatchedOrders} from '../../utils/lazyMinting';
import {parseEther} from 'ethers';

type LazyMintData = {
  caller: Address;
  tier: bigint;
  amount: bigint;
  unitPrice: bigint;
  paymentToken: Address;
  metadataHash: string;
  maxSupply: bigint;
  creator: Address;
};

const setupTest = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers, network}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {
      assetAdmin,
      backendAuthWallet,
      assetPauser,
      treasury,
      catalystMinter,
      lazyMintingCatSeller,
      lazyMintingTestAccount1,
      lazyMintingTestAccount2,
    } = await getNamedAccounts();
    await deployments.fixture();
    const AssetContract = await getEthersContract('Asset');
    const AssetCreateContract = await getEthersContract('AssetCreate');
    const CatalystContract = await getEthersContract('Catalyst');
    const ExchangeContract = await getEthersContract('Exchange');
    const SandContract = await getEthersContract('PolygonSand');
    const TRUSTED_FORWARDER = await getEthersContract('TRUSTED_FORWARDER_V2');
    const OrderValidatorContract = await getEthersContract('OrderValidator');
    const AuthSuperValidatorContract = await getEthersContract(
      'AuthSuperValidator'
    );

    const CatalystContractAsAdmin = CatalystContract.connect(
      await ethers.provider.getSigner(catalystMinter)
    );

    const lazyMintingCatSellerSigner = await ethers.provider.getSigner(
      lazyMintingCatSeller
    );

    // Mint 100 of each catalyst to lazyMintingCatSeller
    for (let i = 1; i <= 5; i++) {
      await CatalystContractAsAdmin.mint(
        lazyMintingCatSeller,
        BigInt(i),
        BigInt(100)
      );
      await CatalystContract.connect(
        lazyMintingCatSellerSigner
      ).setApprovalForAll(await ExchangeContract.getAddress(), true);
    }

    // **Manipulate the Sand contract to give user some Sand**
    // impersonate CHILD_CHAIN_MANAGER
    await ethers.provider.send('hardhat_impersonateAccount', [
      '0x8464135c8F25Da09e49BC8782676a84730C318bC',
    ]);
    const sandUser = await ethers.provider.getSigner(
      '0x8464135c8F25Da09e49BC8782676a84730C318bC'
    );

    // give sandUser ether
    await ethers.provider.send('hardhat_setBalance', [
      '0x8464135c8F25Da09e49BC8782676a84730C318bC',
      '0x100000000000000000000',
    ]);

    const abiCoder = new ethers.AbiCoder();

    // call deposit on PolygonSand contract via  function deposit(address user, bytes calldata depositData)
    await SandContract.connect(sandUser).deposit(
      lazyMintingTestAccount1,
      abiCoder.encode(['uint256'], [BigInt(100000000000000000000n)])
    );

    // stop impersonating
    await ethers.provider.send('hardhat_stopImpersonatingAccount', [
      '0x8464135c8F25Da09e49BC8782676a84730C318bC',
    ]);
    const userSigner = await ethers.getSigner(lazyMintingTestAccount1);
    const tsbCatSellerSigner = await ethers.getSigner(lazyMintingCatSeller);

    const createLazyMintSignature = async (data: LazyMintData) => {
      const {
        caller,
        tier,
        amount,
        unitPrice,
        paymentToken,
        metadataHash,
        maxSupply,
        creator,
      } = data;
      const nonce = await AssetCreateContract.signatureNonces(caller);

      const backendAuthWallet = new ethers.Wallet(
        '0x4242424242424242424242424242424242424242424242424242424242424242'
      );

      const sigData = {
        types: {
          LazyMint: [
            {name: 'caller', type: 'address'},
            {name: 'creator', type: 'address'},
            {name: 'nonce', type: 'uint16'},
            {name: 'tier', type: 'uint8'},
            {name: 'amount', type: 'uint256'},
            {name: 'unitPrice', type: 'uint256'},
            {name: 'paymentToken', type: 'address'},
            {name: 'metadataHash', type: 'string'},
            {name: 'maxSupply', type: 'uint256'},
          ],
        },
        domain: {
          name: 'Sandbox Asset Create',
          version: '1.0',
          chainId: network.config.chainId,
          verifyingContract: await AssetCreateContract.getAddress(),
        },
        message: {
          caller,
          creator,
          nonce,
          tier,
          amount,
          unitPrice,
          paymentToken,
          metadataHash,
          maxSupply,
        },
      };

      const signature = await backendAuthWallet.signTypedData(
        sigData.domain,
        sigData.types,
        sigData.message
      );
      return signature;
    };

    return {
      AssetContract,
      AssetCreateContract,
      CatalystContract,
      CatalystContractAsAdmin,
      createLazyMintSignature,
      SandContract,
      OrderValidatorContract,
      ExchangeContract,
      treasury,
      TRUSTED_FORWARDER,
      AuthSuperValidatorContract,
      assetAdmin,
      backendAuthWallet,
      assetPauser,
      tsbCatSeller: lazyMintingCatSeller,
      tsbCatSellerSigner,
      user: lazyMintingTestAccount1,
      userSigner,
      creator: lazyMintingTestAccount2,
    };
  }
);

describe.only('Asset Create', function () {
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
    it('Exchange', async function () {
      const {AssetCreateContract, ExchangeContract} = await setupTest();
      expect(await AssetCreateContract.getExchangeContract()).to.be.equal(
        ExchangeContract
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
  describe('Lazy Minting', function () {
    it('Lazy minting fee is set to 0', async function () {
      const {AssetCreateContract} = await setupTest();
      expect(await AssetCreateContract.lazyMintFeeInBps()).to.be.equal(0);
    });
    it('Lazy minting fee receiver is set to treasury', async function () {
      const {AssetCreateContract, treasury} = await setupTest();
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
        createLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
      } = await setupTest();

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

      const signature = await createLazyMintSignature(mintData);

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
        createLazyMintSignature,
        AssetCreateContract,
        CatalystContractAsAdmin,
      } = await setupTest();

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

      const signature = await createLazyMintSignature(mintData);

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
        createLazyMintSignature,
        AssetCreateContract,
        CatalystContract,
        ExchangeContract,
        OrderValidatorContract,
        tsbCatSellerSigner,
      } = await setupTest();

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

      const signature = await createLazyMintSignature(mintData);

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
    it('allows users to lazy mint with Catalyst purchase - approveAndCall', async function () {});
  });
});
