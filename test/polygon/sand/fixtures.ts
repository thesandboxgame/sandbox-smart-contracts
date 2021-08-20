import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {setupUsers, setupUser} from '../../utils';
import {Contract} from 'ethers';

type User = {address: string; Sand: Contract; TrustedForwarder: Contract};
export type Fixtures = {
  Sand: Contract;
  users: User[];
  sandBeneficiary: User;
  ChildChainManager: Contract;
  TrustedForwarder: Contract;
};
export const setupSand = deployments.createFixture(async () => {
  await deployments.fixture('PolygonSand');
  const Sand = await ethers.getContract('PolygonSand');
  const accounts = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const ChildChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  const TrustedForwarder = await ethers.getContract('TRUSTED_FORWARDER');
  const users = await setupUsers(unnamedAccounts, {
    Sand,
    TrustedForwarder,
  });
  const sandBeneficiary = await setupUser(accounts.sandBeneficiary, {
    Sand,
    TrustedForwarder,
  });
  return {Sand, users, sandBeneficiary, ChildChainManager, TrustedForwarder};
});
