import {setupMainContract, setupOperatorFilter} from '../fixtures';
import {Addressable} from 'ethers';

export async function setupPolygonLand() {
  const ret = await setupMainContract('PolygonLandV2');

  async function sendMetaTx(
    from: Addressable | string,
    to: Addressable | string,
    data = '',
  ) {
    return ret.trustedForwarder.execute(
      typeof from === 'string' ? from : await from.getAddress(),
      typeof to === 'string' ? to : await to.getAddress(),
      data,
    );
  }

  return {sendMetaTx, ...ret};
}

export async function setupPolygonLandOperatorFilter() {
  return setupOperatorFilter('PolygonLandV2');
}
