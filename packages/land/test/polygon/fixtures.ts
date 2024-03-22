import {setupPolygonLandContract} from '../fixtures';
import {Addressable} from 'ethers';
import {ethers} from 'hardhat';

export async function setupPolygonLand() {
  const ret = await setupPolygonLandContract();

  async function sendMetaTx(
    from: Addressable | string,
    to: Addressable | string,
    data = '',
  ) {
    return ret.TrustedForwarderContract.execute(from, to, data);
  }

  return {sendMetaTx, ...ret};
}

export async function setupPolygonLandMock() {
  const LandFactory = await ethers.getContractFactory('PolygonLandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
