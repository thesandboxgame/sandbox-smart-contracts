import {setupContract} from '../fixtures';
import {ethers} from 'hardhat';

export async function setupLand() {
  return setupContract('LandMock');
}

export async function setupLandMock() {
  const LandFactory = await ethers.getContractFactory('LandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
