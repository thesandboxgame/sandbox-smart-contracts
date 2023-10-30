import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ethers, upgrades} from 'hardhat';
import {runOrderValidatorSetup} from './orderValidatorFixtures';
import {runRoyaltyRegistrySetup} from './royaltiesRegistryFixture';
import {runSignerSetup} from './signerFixtures';

export async function runExchangeSetup() {
  const {admin, user, defaultFeeReceiver} = await loadFixture(runSignerSetup);
  const {OrderValidatorAsAdmin} = await loadFixture(runOrderValidatorSetup);
  const {RoyaltiesRegistryAsDeployer} = await loadFixture(
    runRoyaltyRegistrySetup
  );

  const TrustedForwarderFactory = await ethers.getContractFactory(
    'TrustedForwarderMock'
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();

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

  const EXCHANGE_ADMIN_ROLE =
    await ExchangeContractAsAdmin.EXCHANGE_ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await ExchangeContractAsAdmin.DEFAULT_ADMIN_ROLE();
  const ERC1776_OPERATOR_ROLE =
    await ExchangeContractAsAdmin.ERC1776_OPERATOR_ROLE();
  const PAUSER_ROLE = await ExchangeContractAsAdmin.PAUSER_ROLE();

  return {
    TrustedForwarder,
    protocolFeePrimary,
    protocolFeeSecondary,
    ExchangeContractAsDeployer,
    ExchangeContractAsAdmin,
    ExchangeContractAsUser,
    ExchangeUpgradeMock,
    EXCHANGE_ADMIN_ROLE,
    DEFAULT_ADMIN_ROLE,
    ERC1776_OPERATOR_ROLE,
    PAUSER_ROLE,
  };
}
