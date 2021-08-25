import {ethers} from 'hardhat';
import {Receipt} from 'hardhat-deploy/types';
import {Contract} from 'ethers';
import {data712} from './forwardRequestData712';

export async function sendMetaTx(
  to = '',
  forwarder: Contract,
  data = '',
  signer: string,
  gas = '100000',
  value = '0'
): Promise<Receipt> {
  const message = {
    from: signer,
    to: to,
    value: value,
    gas: gas,
    nonce: Number(await forwarder.getNonce(signer)),
    data: data,
  };
  const forwardRequestData = await data712(forwarder, message);
  const signedData = await ethers.provider.send('eth_signTypedData_v4', [
    signer,
    forwardRequestData,
  ]);

  const tx = await forwarder.execute(message, signedData);
  return tx.wait();
}
