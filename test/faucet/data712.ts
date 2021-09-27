type Message = {
  owner: string;
  amount: string;
  nonce: string;
  deadline: string;
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
        name: 'verifyingContract';
        type: 'address';
      }
    ];
    Faucet: [
      {
        name: 'owner';
        type: 'address';
      },
      {
        name: 'amount';
        type: 'uint256';
      },
      {
        name: 'nonce';
        type: 'uint256';
      },
      {
        name: 'deadline';
        type: 'uint256';
      }
    ];
  };
  primaryType: 'Faucet';
  domain: {
    name: 'The Sandbox';
    version: '1';
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
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Faucet: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'amount',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'deadline',
          type: 'uint256',
        },
      ],
    },
    primaryType: 'Faucet',
    domain: {
      name: 'The Sandbox',
      version: '1',
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
