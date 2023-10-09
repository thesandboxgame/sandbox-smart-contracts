import {ethers, upgrades} from 'hardhat';
import {ZeroAddress} from 'ethers';

async function deploy() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  const TrustedForwarderFactory = await ethers.getContractFactory(
    'TrustedForwarderMock'
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();
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
  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidator'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [admin.address, false, false, true, false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );

  const OrderValidatorAsUser = await OrderValidatorAsDeployer.connect(user);
  const OrderValidatorAsAdmin = await OrderValidatorAsDeployer.connect(admin);
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
      await RoyaltiesRegistryAsDeployer.getAddress(),
      await OrderValidatorAsAdmin.getAddress(),
    ],
    {
      initializer: '__Exchange_init',
    }
  );

  const ExchangeContractAsUser = await ExchangeContractAsDeployer.connect(user);
  const ExchangeContractAsAdmin = await ExchangeContractAsDeployer.connect(
    admin
  );

  const TestERC721WithRoyaltyV2981Factory = await ethers.getContractFactory(
    'TestERC721WithRoyaltyV2981Multi'
  );
  const ERC721WithRoyaltyV2981 = await upgrades.deployProxy(
    TestERC721WithRoyaltyV2981Factory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyaltyV2981.waitForDeployment();

  const TestERC721WithRoyaltyFactory = await ethers.getContractFactory(
    'TestERC721WithRoyaltyV2981'
  );
  const ERC721WithRoyalty = await upgrades.deployProxy(
    TestERC721WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyalty.waitForDeployment();

  const TestERC1155WithRoyaltyFactory = await ethers.getContractFactory(
    'TestERC1155WithRoyaltyV2981'
  );
  const ERC1155WithRoyalty = await upgrades.deployProxy(
    TestERC1155WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC1155WithRoyalty.waitForDeployment();

  const TestERC721WithRoyaltyWithoutIROYALTYUGCFactory =
    await ethers.getContractFactory('TestERC721WithRoyaltyWithoutIROYALTYUGC');
  const TestERC721WithRoyaltyWithoutIROYALTYUGC = await upgrades.deployProxy(
    TestERC721WithRoyaltyWithoutIROYALTYUGCFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await TestERC721WithRoyaltyWithoutIROYALTYUGC.waitForDeployment();

  const TestRoyaltyInfoFactory = await ethers.getContractFactory(
    'TestRoyaltyInfo'
  );
  const TestRoyaltyInfo = await TestRoyaltyInfoFactory.deploy();
  await TestRoyaltyInfo.waitForDeployment();

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

  const RoyaltiesProviderFactory = await ethers.getContractFactory(
    'RoyaltiesProviderTest'
  );
  const RoyaltiesProvider = await RoyaltiesProviderFactory.deploy();
  await RoyaltiesProvider.waitForDeployment();

  const ERC1271ContractFactory = await ethers.getContractFactory('TestERC1271');
  const ERC1271Contract = await ERC1271ContractFactory.deploy();
  await ERC1271Contract.waitForDeployment();

  const EXCHANGE_ADMIN_ROLE =
    await ExchangeContractAsAdmin.EXCHANGE_ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await ExchangeContractAsAdmin.DEFAULT_ADMIN_ROLE();
  const ERC1776_OPERATOR_ROLE =
    await ExchangeContractAsAdmin.ERC1776_OPERATOR_ROLE();
  const PAUSER_ROLE = await ExchangeContractAsAdmin.PAUSER_ROLE();
  return {
    protocolFeePrimary,
    protocolFeeSecondary,
    EXCHANGE_ADMIN_ROLE,
    DEFAULT_ADMIN_ROLE,
    ERC1776_OPERATOR_ROLE,
    PAUSER_ROLE,
    ExchangeContractAsDeployer,
    ExchangeContractAsAdmin,
    ExchangeContractAsUser,
    TrustedForwarder,
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC1155Contract,
    OrderValidatorAsAdmin,
    OrderValidatorAsUser,
    RoyaltiesRegistryAsDeployer,
    RoyaltiesRegistryAsUser,
    ERC721WithRoyaltyV2981,
    ERC721WithRoyalty,
    ERC1155WithRoyalty,
    TestERC721WithRoyaltyWithoutIROYALTYUGC,
    TestRoyaltyInfo,
    RoyaltiesProvider,
    ERC1271Contract,
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
