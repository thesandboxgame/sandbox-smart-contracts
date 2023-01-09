import {BigNumber} from 'ethers';
const bn32 = BigNumber.from(32);
const base32Alphabet = 'abcdefghijklmnopqrstuvwxyz234567';

export function toHash(ipfsUri: string): string {
  const {ipfsBase} = extractIpfsString(ipfsUri);
  const hashUri = ipfsBase.substring(7);
  const numCharacters = hashUri.length;
  let bn = BigNumber.from(0);
  let counter = 0;
  for (let i = numCharacters - 1; i >= 0; i--) {
    const char = hashUri.charAt(i);
    let val = base32Alphabet.indexOf(char);
    if (counter == 0) {
      val = val >> 2;
      bn = bn.add(val);
    } else {
      bn = bn.add(
        BigNumber.from(val)
          .mul(bn32.pow(counter - 1))
          .mul(8)
      );
    }
    counter++;
  }
  return bn.toHexString();
}

export function extractIpfsString(
  tokenURI: string
): {
  ipfsBase: string;
  counter: number;
} {
  const uri = tokenURI.substring(7);
  const split = uri.split('/');
  const ipfsBase = split[0];
  const counter = parseInt(split[1].split('.')[0]);
  return {ipfsBase, counter};
}
