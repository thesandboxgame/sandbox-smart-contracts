import {ethers, upgrades} from 'hardhat';
import {Signer, ZeroAddress} from 'ethers';
import {OrderDefault} from './utils/order';
import {randomInt} from 'crypto';
import {signOrder} from './utils/signature';
import {Asset} from './utils/assets';

// TODO: Split fixtures so we use only what is needed!!!
async function deploy() {
  const [deployer, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  const AssetMatcher = await ethers.getContractFactory('AssetMatcher');
  const assetMatcherAsDeployer = await AssetMatcher.deploy();
  const assetMatcherAsUser = await assetMatcherAsDeployer.connect(user);
  const TrustedForwarderFactory = await ethers.getContractFactory(
    'TrustedForwarderMock'
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();
  const RoyaltyRegistryFactory = await ethers.getContractFactory(
    'TestRoyaltiesRegistry'
  );
  const RoyaltyRegistry = await RoyaltyRegistryFactory.deploy();
  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidatorTest'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [false, false, true, false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );

  const OrderValidatorAsUser = await OrderValidatorAsDeployer.connect(user);

  const ExchangeFactory = await ethers.getContractFactory('Exchange');
  const ExchangeContractAsDeployer = await upgrades.deployProxy(
    ExchangeFactory,
    [
      await TrustedForwarder.getAddress(),
      0,
      250,
      defaultFeeReceiver.address,
      await RoyaltyRegistry.getAddress(),
      await OrderValidatorAsDeployer.getAddress(),
      true,
      true,
    ],
    {
      initializer: '__Exchange_init',
    }
  );

  const ExchangeContractAsUser = await ExchangeContractAsDeployer.connect(user);

  const ERC20ContractFactory = await ethers.getContractFactory('TestERC20');
  const ERC20Contract = await ERC20ContractFactory.deploy();
  await ERC20Contract.waitForDeployment();

  const ERC721ContractFactory = await ethers.getContractFactory('TestERC721');
  const ERC721Contract = await ERC721ContractFactory.deploy();
  await ERC721Contract.waitForDeployment();

  const ERC1155ContractFactory = await ethers.getContractFactory('TestERC1155');
  const ERC1155Contract = await ERC1155ContractFactory.deploy();
  await ERC1155Contract.waitForDeployment();

  // TODO: Do we always want this?
  await ExchangeContractAsDeployer.setAssetMatcherContract(
    await assetMatcherAsDeployer.getAddress()
  );
  return {
    assetMatcherAsDeployer,
    assetMatcherAsUser,
    ExchangeContractAsDeployer,
    ExchangeContractAsUser,
    TrustedForwarder,
    ERC20ContractFactory,
    ERC20Contract,
    ERC721ContractFactory,
    ERC721Contract,
    ERC1155ContractFactory,
    ERC1155Contract,
    OrderValidatorAsDeployer,
    OrderValidatorAsUser,
    deployer,
    user,
    user1,
    user2,
    ZERO_ADDRESS: ZeroAddress,
  };
}

// TODO: Use only one test token.
export async function deployFixturesWithExtraTokens() {
  const ret = await deploy();

  const ERC20Contract2 = await ret.ERC20ContractFactory.deploy();
  await ERC20Contract2.waitForDeployment();

  const MintableERC721WithRoyaltiesFactory = await ethers.getContractFactory(
    'MintableERC721WithRoyalties'
  );
  const MintableERC721WithRoyalties =
    await MintableERC721WithRoyaltiesFactory.deploy();
  await MintableERC721WithRoyalties.waitForDeployment();

  const MintableERC1155WithRoyaltiesFactory = await ethers.getContractFactory(
    'MintableERC1155WithRoyalties'
  );
  const MintableERC1155WithRoyalties =
    await MintableERC1155WithRoyaltiesFactory.deploy();
  await MintableERC1155WithRoyalties.waitForDeployment();
  return {
    ...ret,
    ERC20Contract2,
    MintableERC721WithRoyalties,
    MintableERC1155WithRoyalties,
    matchOrders: async (
      maker: Signer,
      makerAsset: Asset,
      taker: Signer,
      takerAsset: Asset
    ) => {
      const leftOrder = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        randomInt(200_000_000_000_000),
        0,
        0
      );
      const rightOrder = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        randomInt(200_000_000_000_000),
        0,
        0
      );
      const makerSig = await signOrder(
        leftOrder,
        maker,
        ret.OrderValidatorAsDeployer
      );
      const takerSig = await signOrder(
        rightOrder,
        taker,
        ret.OrderValidatorAsDeployer
      );
      await ret.ExchangeContractAsUser.matchOrders(
        leftOrder,
        makerSig,
        rightOrder,
        takerSig
      );
    },
  };
}

export async function deployFixtures() {
  return deploy();
}
