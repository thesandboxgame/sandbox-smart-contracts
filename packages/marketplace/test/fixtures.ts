import {ethers, upgrades} from 'hardhat';
import {ZeroAddress} from 'ethers';

// TODO: Split fixtures so we use only what is needed!!!
async function deploy() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
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
    'OrderValidator'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [false, false, true, false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );

  const OrderValidatorAsUser = await OrderValidatorAsDeployer.connect(user);
  const protocolFeePrimary = 123;
  const protocolFeeSecondary = 250;
  const ExchangeFactory = await ethers.getContractFactory('Exchange');
  const ExchangeContractAsDeployer = await upgrades.deployProxy(
    ExchangeFactory,
    [
      admin.address,
      await TrustedForwarder.getAddress(),
      protocolFeePrimary,
      protocolFeeSecondary,
      defaultFeeReceiver.address,
      await RoyaltyRegistry.getAddress(),
      await OrderValidatorAsDeployer.getAddress(),
      await assetMatcherAsDeployer.getAddress(),
      true,
      true,
    ],
    {
      initializer: '__Exchange_init',
    }
  );

  const ExchangeContractAsUser = await ExchangeContractAsDeployer.connect(user);
  const ExchangeContractAsAdmin = await ExchangeContractAsDeployer.connect(
    admin
  );
  const RoyaltiesRegistryFactory = await ethers.getContractFactory(
    'RoyaltiesRegistry'
  );
  const RoyaltiesRegistryAsDeployer = await upgrades.deployProxy(
    RoyaltiesRegistryFactory,
    [],
    {
      initializer: '__RoyaltiesRegistry_init',
    }
  );

  const RoyaltiesRegistryAsUser = await RoyaltiesRegistryAsDeployer.connect(
    user
  );

  const TestERC721WithRoyaltyV2981Factory = await ethers.getContractFactory(
    'TestERC721WithRoyaltyV2981'
  );
  const ERC721WithRoyaltyV2981 = await upgrades.deployProxy(
    TestERC721WithRoyaltyV2981Factory,
    [],
    {
      initializer: 'initialize',
    }
  );

  const ERC20ContractFactory = await ethers.getContractFactory('TestERC20');
  const ERC20Contract = await ERC20ContractFactory.deploy();
  await ERC20Contract.waitForDeployment();

  const ERC20Contract2 = await ERC20ContractFactory.deploy();
  await ERC20Contract2.waitForDeployment();

  const ERC721ContractFactory = await ethers.getContractFactory('TestERC721');
  const ERC721Contract = await ERC721ContractFactory.deploy();
  await ERC721Contract.waitForDeployment();

  const ERC1155ContractFactory = await ethers.getContractFactory('TestERC1155');
  const ERC1155Contract = await ERC1155ContractFactory.deploy();
  await ERC1155Contract.waitForDeployment();

  const EXCHANGE_ADMIN_ROLE =
    await ExchangeContractAsAdmin.EXCHANGE_ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await ExchangeContractAsAdmin.DEFAULT_ADMIN_ROLE();
  return {
    protocolFeePrimary,
    protocolFeeSecondary,
    EXCHANGE_ADMIN_ROLE,
    DEFAULT_ADMIN_ROLE,
    assetMatcherAsDeployer,
    assetMatcherAsUser,
    RoyaltyRegistry,
    ExchangeContractAsDeployer,
    ExchangeContractAsAdmin,
    ExchangeContractAsUser,
    TrustedForwarder,
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC1155Contract,
    OrderValidatorAsDeployer,
    OrderValidatorAsUser,
    RoyaltiesRegistryAsDeployer,
    RoyaltiesRegistryAsUser,
    ERC721WithRoyaltyV2981,
    deployer,
    admin,
    user,
    user1,
    user2,
    defaultFeeReceiver,
    ZERO_ADDRESS: ZeroAddress,
  };
}

export async function deployFixtures() {
  return deploy();
}