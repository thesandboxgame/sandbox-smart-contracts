import {setupContract, setupERC721Test, setupOperatorFilter} from '../fixtures';
import {ethers} from 'hardhat';

export async function setupLand() {
  return setupContract('LandMock');
}

export async function setupLandOperatorFilter() {
  return setupOperatorFilter(await setupLand());
}

export async function setupLandForERC721Tests() {
  return setupERC721Test(await setupLand());
}

export async function setupLandMock() {
  const LandFactory = await ethers.getContractFactory('LandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
