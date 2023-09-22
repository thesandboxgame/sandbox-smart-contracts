// TODO: This is the same as the root folder scripts... fix it
import {ethers} from 'hardhat';
import {AbiCoder} from 'ethers';

export const ETH_ASSET_CLASS = '0xaaaebeba';
export const ERC20_ASSET_CLASS = '0x8ae85d84';
export const ERC721_ASSET_CLASS = '0x73ad2146';

export async function id(str: string) {
  return `0x${ethers
    .keccak256(Buffer.from(str))
    .toString('hex')
    .substring(0, 8)}`;
}

export async function enc(token: string, tokenId: number) {
  if (tokenId) {
    return AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [token, tokenId]
    );
  } else {
    return AbiCoder.defaultAbiCoder().encode(['address'], [token]);
  }
}
