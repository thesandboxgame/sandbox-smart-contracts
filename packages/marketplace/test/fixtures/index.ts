import {ethers} from 'hardhat';
import {ZeroAddress} from 'ethers';

import {exchangeSetup} from './exchange';
import {mockAssetsSetup} from './assets';

export async function simpleDeployFixtures() {
  const contracts = await deployFixtures();
  return {...contracts};
}
export async function deployFixturesGrantRoleERC20() {
  const contracts = await deployFixtures();
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
async function deployFixtures() {
  const [deployer, admin, user, defaultFeeReceiver, user1, user2] =
    await ethers.getSigners();

  const exchange = await exchangeSetup();

  const mockAssets = await mockAssetsSetup();

  const {ExchangeContractAsAdmin} = exchange;

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
