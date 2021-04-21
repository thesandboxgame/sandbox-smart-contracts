import {getChainId} from 'hardhat';

type Message = {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: number;
  data: string;
};

type Contract = {
  address: string;
};

type Data712 = {
  types: {
    EIP712Domain: [
      {
        name: 'name';
        type: 'string';
      },
      {
        name: 'version';
        type: 'string';
      },
      {
        name: 'chainId';
        type: 'uint256';
      },
      {
        name: 'verifyingContract';
        type: 'address';
      }
    ];
    ForwardRequest: [
      {name: 'from'; type: 'address'},
      {name: 'to'; type: 'address'},
      {name: 'value'; type: 'uint256'},
      {name: 'gas'; type: 'uint256'},
      {name: 'nonce'; type: 'uint256'},
      {name: 'data'; type: 'bytes'}
    ];
  };
  primaryType: 'ForwardRequest';
  domain: {
    name: 'The Sandbox';
    version: '1';
    chainId: number;
    verifyingContract: string;
  };
  message: Message;
};

export const data712 = async function (
  verifyingContract: Contract,
  message: Message
): Promise<Data712> {
  return {
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
      ForwardRequest: [
        {name: 'from', type: 'address'},
        {name: 'to', type: 'address'},
        {name: 'value', type: 'uint256'},
        {name: 'gas', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
        {name: 'data', type: 'bytes'},
      ],
    },
    primaryType: 'ForwardRequest',
    domain: {
      name: 'The Sandbox',
      version: '1',
      chainId: Number(await getChainId()),
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
