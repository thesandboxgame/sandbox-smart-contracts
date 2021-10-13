type Message = {
  from: string;
  to: string;
  sizes: string;
  xs: string;
  ys: string;
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
        name: 'verifyingContract';
        type: 'address';
      }
    ];
    BatchTransferQuadII: [
      {
        name: 'from';
        type: 'address';
      },
      {
        name: 'to';
        type: 'address';
      },
      {
        name: 'sizes';
        type: 'bytes';
      },
      {
        name: 'xs';
        type: 'bytes';
      },
      {
        name: 'ys';
        type: 'bytes';
      },
      {
        name: 'data';
        type: 'bytes';
      }
    ];
  };

  primaryType: 'BatchTransferQuadII';
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
      BatchTransferQuadII: [
        {
          name: 'from',
          type: 'address',
        },
        {
          name: 'to',
          type: 'address',
        },
        {
          name: 'sizes',
          type: 'bytes',
        },
        {
          name: 'xs',
          type: 'bytes',
        },
        {
          name: 'ys',
          type: 'bytes',
        },
        {
          name: 'data',
          type: 'bytes',
        },
      ],
    },
    primaryType: 'BatchTransferQuadII',
    domain: {
      name: 'The Sandbox',
      version: '1',
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
