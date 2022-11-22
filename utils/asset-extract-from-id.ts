import {BigNumber} from 'ethers';
const bn2 = BigNumber.from(2);

export function extractFromId(
  tokenID: string
): {
  packID: number;
  creator: string;
  numFTTypes: number;
} {
  const bn = BigNumber.from(tokenID);
  return {
    packID: bn.shr(23).mod(bn2.pow(40)).toNumber(), // packId length 40 bits
    creator: bn.shr(96).toHexString(),
    numFTTypes: bn.shr(11).mod(bn2.pow(12)).toNumber(), // numFTs length 12 bits
  };
}
