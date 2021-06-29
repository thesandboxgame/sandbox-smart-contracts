import {ethers, deployments, getUnnamedAccounts} from 'hardhat';

import {setupUsers} from '../../utils';

export const setupSand = deployments.createFixture(async () => {
  await deployments.fixture('PolygonSand');
  const Sand = await ethers.getContract('PolygonSand');
  const unnamedAccounts = await getUnnamedAccounts();
  const users = await setupUsers(unnamedAccounts, {Sand});
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  return {Sand, users, childChainManager};
});
