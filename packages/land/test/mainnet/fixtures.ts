import {setupLandContract} from '../fixtures';
import {ethers} from 'hardhat';

export async function setupLand() {
  return setupLandContract();
}

export async function setupLandMock() {
  const LandFactory = await ethers.getContractFactory('LandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
