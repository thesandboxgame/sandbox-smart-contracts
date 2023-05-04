type Message = {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
};

type Contract = {
  address: string;
};

type Data712Upgradeable = {
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
    Permit: [
      {
        name: 'owner';
        type: 'address';
      },
      {
        name: 'spender';
        type: 'address';
      },
      {
        name: 'value';
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
  primaryType: 'Permit';
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: Message;
};

export const data712Upgradeable = function (
  name: string,
  version: string,
  chainId: number,
  verifyingContract: Contract,
  message: Message
): Data712Upgradeable {
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
      Permit: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'spender',
          type: 'address',
        },
        {
          name: 'value',
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
    primaryType: 'Permit',
    domain: {
      name: name,
      version: version,
      chainId: chainId,
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
