type Message = {
  to: string | undefined;
  data: string | undefined;
  value: number;
  from: string;
  nonce: number;
  gas: number;
};

type Contract = {
  address: string;
};

type Data712 = {
  types: {
    EIP712DomainType: [
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
      {
        name: 'from';
        type: 'address';
      },
      {
        name: 'to';
        type: 'address';
      },
      {
        name: 'value';
        type: 'uint256';
      },
      {
        name: 'gas';
        type: 'uint256';
      },
      {
        name: 'nonce';
        type: 'uint256';
      },
      {
        name: 'data';
        type: 'bytes';
      }
    ];
  };
  primaryType: 'ForwardRequest';
  domain: {
    name: 'The Sandbox';
    version: '1';
    chainId: '1234';
    verifyingContract: string;
  };
  message: Message;
};

export const data712 = function (
  verifyingContract: Contract,
  message: Message
): Data712 {
  return {
    types: {
      EIP712DomainType: [
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
        {
          name: 'from',
          type: 'address',
        },
        {
          name: 'to',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'gas',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'data',
          type: 'bytes',
        },
      ],
    },
    primaryType: 'ForwardRequest',
    domain: {
      name: 'The Sandbox',
      version: '1',
      chainId: '1234',
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
