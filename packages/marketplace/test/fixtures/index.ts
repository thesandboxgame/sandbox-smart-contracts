import {ZeroAddress} from 'ethers';
import {ethers} from 'hardhat';

import {mockAssetsSetup} from './assets';
import {exchangeSetup} from './exchange';

export async function deployFixturesWithoutWhitelist() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  const exchange = await exchangeSetup();

  const mockAssets = await mockAssetsSetup();

  const {ExchangeContractAsAdmin} = exchange;

  const TSB_PRIMARY_MARKET_SELLER_ROLE =
    await ExchangeContractAsAdmin.TSB_PRIMARY_MARKET_SELLER_ROLE();
  const TSB_SECONDARY_MARKET_SELLER_ROLE =
    await ExchangeContractAsAdmin.TSB_SECONDARY_MARKET_SELLER_ROLE();
  const FEE_WHITELIST_ROLE = await ExchangeContractAsAdmin.FEE_WHITELIST_ROLE();
  const EXCHANGE_ADMIN_ROLE =
    await ExchangeContractAsAdmin.EXCHANGE_ADMIN_ROLE();
  const DEFAULT_ADMIN_ROLE = await ExchangeContractAsAdmin.DEFAULT_ADMIN_ROLE();
  const ERC1776_OPERATOR_ROLE =
    await ExchangeContractAsAdmin.ERC1776_OPERATOR_ROLE();
  const PAUSER_ROLE = await ExchangeContractAsAdmin.PAUSER_ROLE();

  return {
    ...exchange,
    ...mockAssets,
    EXCHANGE_ADMIN_ROLE,
    TSB_PRIMARY_MARKET_SELLER_ROLE,
    TSB_SECONDARY_MARKET_SELLER_ROLE,
    FEE_WHITELIST_ROLE,
    DEFAULT_ADMIN_ROLE,
    ERC1776_OPERATOR_ROLE,
    PAUSER_ROLE,
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
  const contracts = await deployFixturesWithoutWhitelist();
  const {OrderValidatorAsAdmin, ERC20Contract, ERC20Contract2} = contracts;

  const ERC20Role = await OrderValidatorAsAdmin.ERC20_ROLE();

  await OrderValidatorAsAdmin.grantRole(
    ERC20Role,
    await ERC20Contract.getAddress()
  );
  await OrderValidatorAsAdmin.grantRole(
    ERC20Role,
    await ERC20Contract2.getAddress()
  );
  return {...contracts};
}
