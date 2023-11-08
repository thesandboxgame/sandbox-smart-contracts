import {ethers} from 'hardhat';
import {ZeroAddress} from 'ethers';

import {exchangeSetup} from './exchange';
import {mockAssetsSetup} from './assets';

async function deploy() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  const {
    RoyaltiesRegistryAsUser,
    Royalties2981ImplMock,
    RoyaltiesRegistryAsDeployer,
    OrderValidatorAsAdmin,
    OrderValidatorAsDeployer,
    OrderValidatorAsUser,
    OrderValidatorUpgradeMock,
    ExchangeUpgradeMock,
    ExchangeContractAsUser,
    ExchangeContractAsAdmin,
    protocolFeePrimary,
    protocolFeeSecondary,
    ExchangeContractAsDeployer,
    AssetMatcherAsDeployer,
    AssetMatcherAsUser,
    TrustedForwarder,
  } = await exchangeSetup();

  const {
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC1155Contract,
    ERC721WithRoyaltyV2981,
    ERC721WithRoyalty,
    ERC1155WithRoyalty,
    ERC721WithRoyaltyWithoutIROYALTYUGC,
    RoyaltyInfo,
    RoyaltiesProvider,
    ERC1271Contract,
  } = await mockAssetsSetup();

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
    AssetMatcherAsDeployer,
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
