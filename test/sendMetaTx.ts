import {ethers} from 'hardhat';
import {Receipt} from 'hardhat-deploy/types';
import {Contract} from 'ethers';
import {data712} from './forwardRequestData712';
import {expectEventWithArgsFromReceipt} from './utils';
import {arrayify, defaultAbiCoder, hexlify} from 'ethers/lib/utils';

export async function sendMetaTx(
  to = '',
  forwarder: Contract,
  data = '',
  signer: string,
  gas = '200000',
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
  const receipt = tx.wait();
  const txEvent = await expectEventWithArgsFromReceipt(
    forwarder,
    receipt,
    'TXResult'
  );
  if (!txEvent.args.success) {
    const errData = arrayify(txEvent.args.returndata);
    if (hexlify(errData.slice(0, 4)) === '0x08c379a0') {
      console.error(
        'META TX CALL Error:',
        defaultAbiCoder.decode(['string'], errData.slice(4))[0]
      );
    } else {
      console.error('META TX CALL Error:', errData);
    }
  }
  return receipt;
}
