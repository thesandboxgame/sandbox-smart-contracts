import {ethers, upgrades} from 'hardhat';

export async function deployFixtures() {
  const [deployer, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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
  const OrderValidator = await upgrades.deployProxy(
    OrderValidatorFactory,
    [false, false, true, false],
    {
      initializer: '__OrderValidator_init_unchained',
    }
  );
  const ExchangeFactory = await ethers.getContractFactory('Exchange');
  const ExchangeContractAsDeployer = await upgrades.deployProxy(
    ExchangeFactory,
    [
      await TrustedForwarder.getAddress(),
      0,
      250,
      defaultFeeReceiver.address,
      await RoyaltyRegistry.getAddress(),
      await OrderValidator.getAddress(),
      true,
      true,
    ],
    {
      initializer: '__Exchange_init',
    }
  );

  const ExchangeContractAsUser = await ExchangeContractAsDeployer.connect(user);

  const ERC20ContractFactory = await ethers.getContractFactory('TestERC20');
  // TODO figure out to pass argument or use deploy proxy
  const ERC20Contract = await ERC20ContractFactory.deploy();

  const ERC721ContractFactory = await ethers.getContractFactory('TestERC721');
  const ERC721Contract = await ERC721ContractFactory.deploy();

  return {
    assetMatcherAsDeployer,
    assetMatcherAsUser,
    ExchangeContractAsDeployer,
    ExchangeContractAsUser,
    TrustedForwarder,
    ERC20Contract,
    ERC721Contract,
    deployer,
    user,
    ZERO_ADDRESS,
    user1,
    user2,
  };
}
