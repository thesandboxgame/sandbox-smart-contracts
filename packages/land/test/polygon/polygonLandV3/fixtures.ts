import {setupPolygonLandV3Contract} from '../../fixtures';
import {Addressable} from 'ethers';

export async function setupPolygonLandV3() {
  const ret = await setupPolygonLandV3Contract();

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
