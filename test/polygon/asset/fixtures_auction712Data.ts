type Message = {
  from: string;
  token: string;
  auctionData: string;
  ids: string;
  amounts: string;
};

type Contract = {
  address: string;
};

type AuctionData = {
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
    Auction: [
      {name: 'from'; type: 'address'},
      {name: 'token'; type: 'address'},
      {name: 'auctionData'; type: 'bytes'},
      {name: 'ids'; type: 'bytes'},
      {name: 'amounts'; type: 'bytes'}
    ];
  };
  primaryType: 'Auction';
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  message: Message;
};

export const auction712Data = function (
  name: string,
  version: string,
  chainId: number,
  verifyingContract: Contract,
  message: Message
): AuctionData {
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
      Auction: [
        {name: 'from', type: 'address'},
        {name: 'token', type: 'address'},
        {name: 'auctionData', type: 'bytes'},
        {name: 'ids', type: 'bytes'},
        {name: 'amounts', type: 'bytes'},
      ],
    },
    primaryType: 'Auction',
    domain: {
      name: name,
      version: version,
      chainId: chainId,
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};

export const messageTypes = [
  'bytes32',
  'address',
  'address',
  'uint256[]',
  'bytes',
  'bytes',
];
