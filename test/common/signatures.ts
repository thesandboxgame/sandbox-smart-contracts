import {BigNumber, BigNumberish, Contract} from 'ethers';
import {Signature} from '@ethersproject/bytes';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';

export const avatarSaleSignature = async function (
  avatarSale: Contract,
  signer: string,
  buyer: string,
  tokenIds: BigNumberish[],
  seller: string,
  price: BigNumberish,
  privateKey = ''
): Promise<Signature> {
  const chainId = BigNumber.from(await avatarSale.getChainId());
  const data = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      // Mint(address signer,address buyer,uint id,address seller,uint price)
      Mint: [
        {name: 'buyer', type: 'address'},
        {name: 'ids', type: 'uint256[]'},
        {name: 'seller', type: 'address'},
        {name: 'price', type: 'uint256'},
      ],
    },
    primaryType: 'Mint',
    domain: {
      name: 'Sandbox Avatar Sale',
      version: '1.0',
      chainId: chainId.toString(),
      verifyingContract: avatarSale.address,
    },
    message: {
      buyer: buyer,
      ids: tokenIds.map((x) => x.toString()),
      seller: seller,
      price: price.toString(),
    },
  } as never;

  let signature;
  if (privateKey) {
    signature = signTypedData_v4(ethers.utils.arrayify(privateKey) as Buffer, {
      data,
    });
  } else {
    signature = await ethers.provider.send('eth_signTypedData_v4', [
      signer,
      data,
    ]);
  }
  return ethers.utils.splitSignature(signature);
};
