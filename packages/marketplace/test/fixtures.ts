import {ethers, upgrades} from 'hardhat';
import {ZeroAddress} from 'ethers';

// keccak256("TSB_ROLE")
const TSBRole =
  '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
// keccak256("PARTNER_ROLE")
const PartnerRole =
  '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';
// keccak256("ERC20_ROLE")
const ERC20Role =
  '0x839f6f26c78a3e8185d8004defa846bd7b66fef8def9b9f16459a6ebf2502162';

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

  const Royalties2981ImplMock = await ethers.getContractFactory(
    'Royalties2981ImplMock'
  );

  const OrderValidatorFactory = await ethers.getContractFactory(
    'OrderValidator'
  );
  const OrderValidatorAsDeployer = await upgrades.deployProxy(
    OrderValidatorFactory,
    [
      admin.address,
      [TSBRole, PartnerRole, ERC20Role],
      [false, false, false],
      false,
    ],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );
  const OrderValidatorUpgradeMock = await ethers.getContractFactory(
    'OrderValidatorUpgradeMock'
  );
  const OrderValidatorAsUser = await OrderValidatorAsDeployer.connect(user);
  const OrderValidatorAsAdmin = await OrderValidatorAsDeployer.connect(admin);
  const protocolFeePrimary = 123;
  const protocolFeeSecondary = 250;
  const matchOrdersLimit = 50;
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
      matchOrdersLimit,
    ],
    {
      initializer: '__Exchange_init',
    }
  );

  const ExchangeUpgradeMock = await ethers.getContractFactory(
    'ExchangeUpgradeMock'
  );

  const ExchangeContractAsUser = await ExchangeContractAsDeployer.connect(user);
  const ExchangeContractAsAdmin = await ExchangeContractAsDeployer.connect(
    admin
  );

  const LibAssetFactory = await ethers.getContractFactory('LibAssetMock');
  const AssetMatcherAsDeployer = await LibAssetFactory.deploy();
  const AssetMatcherAsUser = AssetMatcherAsDeployer.connect(user);

  const ERC721WithRoyaltyV2981Factory = await ethers.getContractFactory(
    'ERC721WithRoyaltyV2981MultiMock'
  );
  const ERC721WithRoyaltyV2981 = await upgrades.deployProxy(
    ERC721WithRoyaltyV2981Factory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyaltyV2981.waitForDeployment();

  const ERC721WithRoyaltyFactory = await ethers.getContractFactory(
    'ERC721WithRoyaltyV2981Mock'
  );
  const ERC721WithRoyalty = await upgrades.deployProxy(
    ERC721WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyalty.waitForDeployment();

  const ERC1155WithRoyaltyFactory = await ethers.getContractFactory(
    'ERC1155WithRoyaltyV2981Mock'
  );
  const ERC1155WithRoyalty = await upgrades.deployProxy(
    ERC1155WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC1155WithRoyalty.waitForDeployment();

  const ERC721WithRoyaltyWithoutIROYALTYUGCFactory =
    await ethers.getContractFactory('ERC721WithRoyaltyWithoutIROYALTYUGCMock');
  const ERC721WithRoyaltyWithoutIROYALTYUGC = await upgrades.deployProxy(
    ERC721WithRoyaltyWithoutIROYALTYUGCFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyaltyWithoutIROYALTYUGC.waitForDeployment();

  const RoyaltyInfoFactory = await ethers.getContractFactory('RoyaltyInfoMock');
  const RoyaltyInfo = await RoyaltyInfoFactory.deploy();
  await RoyaltyInfo.waitForDeployment();

  const ERC20ContractFactory = await ethers.getContractFactory('ERC20Mock');
  const ERC20Contract = await ERC20ContractFactory.deploy();
  await ERC20Contract.waitForDeployment();

  const ERC20Contract2 = await ERC20ContractFactory.deploy();
  await ERC20Contract2.waitForDeployment();

  const ERC721ContractFactory = await ethers.getContractFactory('ERC721Mock');
  const ERC721Contract = await ERC721ContractFactory.deploy();
  await ERC721Contract.waitForDeployment();

  const ERC1155ContractFactory = await ethers.getContractFactory('ERC1155Mock');
  const ERC1155Contract = await ERC1155ContractFactory.deploy();
  await ERC1155Contract.waitForDeployment();

  const RoyaltiesProviderFactory = await ethers.getContractFactory(
    'RoyaltiesProviderMock'
  );
  const RoyaltiesProvider = await RoyaltiesProviderFactory.deploy();
  await RoyaltiesProvider.waitForDeployment();

  const ERC1271ContractFactory = await ethers.getContractFactory('ERC1271Mock');
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
    ExchangeUpgradeMock,
    AssetMatcherAsUser,
    TrustedForwarder,
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC1155Contract,
    OrderValidatorAsDeployer,
    OrderValidatorAsAdmin,
    OrderValidatorAsUser,
    OrderValidatorUpgradeMock,
    RoyaltiesRegistryAsDeployer,
    RoyaltiesRegistryAsUser,
    Royalties2981ImplMock,
    ERC721WithRoyaltyV2981,
    ERC721WithRoyalty,
    ERC1155WithRoyalty,
    ERC721WithRoyaltyWithoutIROYALTYUGC,
    RoyaltyInfo,
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
