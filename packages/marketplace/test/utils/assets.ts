// TODO: This is the same as the root folder scripts... fix it
import ethUtil from 'ethereumjs-util';
import Web3 from 'web3';

export const ETH_ASSET_CLASS = '0xaaaebeba';
export const ERC20_ASSET_CLASS = '0x8ae85d84';
export const ERC721_ASSET_CLASS = '0x73ad2146';

export async function id(str: string) {
  return `0x${ethUtil
    .keccak256(Buffer.from(str))
    .toString('hex')
    .substring(0, 8)}`;
}

export async function enc(token: string, tokenId: number) {
  const web3 = new Web3();
  if (tokenId) {
    return web3.eth.abi.encodeParameters(
      ['address', 'uint256'],
      [token, tokenId]
    );
  } else {
    return web3.eth.abi.encodeParameter('address', token);
  }
}
