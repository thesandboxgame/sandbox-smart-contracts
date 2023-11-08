import {ethers, upgrades} from 'hardhat';

import {signerSetup} from './signers';
import {orderValidatorSetup} from './orderValidator';
import {royaltiesRegistrySetup} from './royaltiesRegistry';
import {TrustedForwarderSetup} from './TrustedForwarderMock';

export async function exchangeSetup() {
  const {admin, user, defaultFeeReceiver} = await signerSetup();

  const {TrustedForwarder} = await TrustedForwarderSetup();
  const {
    RoyaltiesRegistryAsUser,
    Royalties2981ImplMock,
    RoyaltiesRegistryAsDeployer,
  } = await royaltiesRegistrySetup();

  const {
    OrderValidatorAsAdmin,
    OrderValidatorAsDeployer,
    OrderValidatorAsUser,
    OrderValidatorUpgradeMock,
  } = await orderValidatorSetup();

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

  return {
    RoyaltiesRegistryAsUser,
    Royalties2981ImplMock,
    RoyaltiesRegistryAsDeployer,
    OrderValidatorAsDeployer,
    OrderValidatorUpgradeMock,
    OrderValidatorAsUser,
    OrderValidatorAsAdmin,
    protocolFeePrimary,
    protocolFeeSecondary,
    ExchangeUpgradeMock,
    ExchangeContractAsUser,
    ExchangeContractAsAdmin,
    ExchangeContractAsDeployer,
    AssetMatcherAsDeployer,
    AssetMatcherAsUser,
    TrustedForwarder,
  };
}
