import {BigNumber, Contract} from 'ethers';
import {ethers} from 'hardhat';
import {signTypedData_v4} from 'eth-sig-util';

export const PRIVATE_KEY =
  '0x4242424242424242424242424242424242424242424242424242424242424242';

export const BAD_KEY =
  '0x46645ef191d0174397d5d281e6b2fd93f4a29006ed326e8e7d9a512871686e5c';

export const NAME = 'Sandbox StarterPack';
export const VERSION = '1.0';

type Message = {
  buyer: string;
  catalystIds: number[];
  catalystQuantities: number[];
  gemIds: number[];
  gemQuantities: number[];
  nonce: number | BigNumber | string;
};

export const starterPack712Signature = async function (
  verifyingContract: Contract,
  message: Message,
  useBadKey?: boolean // set to true to test incorrect signature with BAD_KEY
): Promise<string> {
  const chainId = BigNumber.from(await verifyingContract.getChainId());

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
      Purchase: [
        {name: 'buyer', type: 'address'},
        {name: 'catalystIds', type: 'uint16[]'},
        {name: 'catalystQuantities', type: 'uint256[]'},
        {name: 'gemIds', type: 'uint16[]'},
        {name: 'gemQuantities', type: 'uint256[]'},
        {name: 'nonce', type: 'uint256'},
      ],
    },
    primaryType: 'Purchase',
    domain: {
      name: NAME,
      version: VERSION,
      chainId: chainId.toString(),
      verifyingContract: verifyingContract.address,
    },
    message,
  } as never;
  return await signTypedData_v4(
    ethers.utils.arrayify(useBadKey ? BAD_KEY : PRIVATE_KEY) as Buffer,
    {
      data,
    }
  );
};
