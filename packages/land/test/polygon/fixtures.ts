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
    return ret.TrustedForwarderContract.execute(
      typeof from === 'string' ? from : await from.getAddress(),
      typeof to === 'string' ? to : await to.getAddress(),
      data,
    );
  }

  return {sendMetaTx, ...ret};
}

export async function setupPolygonLandMock() {
  const LandFactory = await ethers.getContractFactory('PolygonLandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
