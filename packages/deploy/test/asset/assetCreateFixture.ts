import {deployments} from 'hardhat';
import {
  LazyMintBatchData,
  LazyMintData,
  createLazyMintSignature,
  createMultipleLazyMintSignature,
  giveSandToAccount,
} from '../../utils/lazyMinting';
import {parseEther} from 'ethers';

const setupAssetCreateTests = deployments.createFixture(
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

    // LOAD CONTRACTS
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

    // SIGNERS
    const userSigner = await ethers.getSigner(lazyMintingTestAccount1);
    const tsbCatSellerSigner = await ethers.getSigner(lazyMintingCatSeller);
    const lazyMintingCatSellerSigner = await ethers.provider.getSigner(
      lazyMintingCatSeller
    );

    const CatalystContractAsAdmin = CatalystContract.connect(
      await ethers.provider.getSigner(catalystMinter)
    );

    await giveSandToAccount(
      SandContract,
      lazyMintingTestAccount1,
      parseEther('1000')
    );

    const getCurrentTimestamp = async () => {
      return (await ethers.provider.getBlock('latest'))?.timestamp || 0;
    };

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

    const createSingleLazyMintSignature = (data: LazyMintData) =>
      createLazyMintSignature(data, AssetCreateContract, network);

    const createBatchLazyMintSignature = (data: LazyMintBatchData) =>
      createMultipleLazyMintSignature(data, AssetCreateContract, network);

    const OrderValidatorAsAdmin = OrderValidatorContract.connect(
      await ethers.provider.getSigner(assetAdmin)
    );

    const ERC20_ROLE = await OrderValidatorContract.ERC20_ROLE();
    await OrderValidatorAsAdmin.grantRole(
      ERC20_ROLE,
      await SandContract.getAddress()
    );
    await OrderValidatorAsAdmin.disableWhitelists();

    return {
      AssetContract,
      AssetCreateContract,
      CatalystContract,
      CatalystContractAsAdmin,
      createSingleLazyMintSignature,
      createBatchLazyMintSignature,
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
      getCurrentTimestamp,
    };
  }
);

export default setupAssetCreateTests;
