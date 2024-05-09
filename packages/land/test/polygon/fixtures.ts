import {setupContract} from '../fixtures';
import {Addressable} from 'ethers';
import {ethers} from 'hardhat';

export async function setupPolygonLand() {
  const ret = await setupContract('PolygonLandMock');
  const TrustedForwarderContractFactory = await ethers.getContractFactory(
    'MetaTxForwarderMock',
  );
  const TrustedForwarderContract =
    await TrustedForwarderContractFactory.deploy();
  await ret.LandAsAdmin.setTrustedForwarder(TrustedForwarderContract);

  async function sendMetaTx(
    from: Addressable | string,
    to: Addressable | string,
    data = '',
  ) {
    return TrustedForwarderContract.execute(from, to, data);
  }

  return {...ret, TrustedForwarderContract, sendMetaTx};
}

export async function setupPolygonLandMock() {
  const LandFactory = await ethers.getContractFactory('PolygonLandMock');
  const landContract = await LandFactory.deploy();
  return {landContract};
}
