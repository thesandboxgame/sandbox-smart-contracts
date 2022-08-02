type Message = {
  from: string;
  token: string;
  offerId: string;
  startingPrice: string;
  endingPrice: string;
  startedAt: number;
  duration: number;
  packs: number;
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
        name: 'verifyingContract';
        type: 'address';
      }
    ];
    Auction: [
      {name: 'from'; type: 'address'},
      {name: 'token'; type: 'address'},
      {name: 'offerId'; type: 'uint256'},
      {name: 'startingPrice'; type: 'uint256'},
      {name: 'endingPrice'; type: 'uint256'},
      {name: 'startedAt'; type: 'uint256'},
      {name: 'duration'; type: 'uint256'},
      {name: 'packs'; type: 'uint256'},
      {name: 'ids'; type: 'bytes'},
      {name: 'amounts'; type: 'bytes'}
    ];
  };
  primaryType: 'Auction';
  domain: {
    name: string;
    version: string;
    verifyingContract: string;
  };
  message: Message;
};

export const auction712Data = function (
  name: string,
  version: string,
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
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      Auction: [
        {name: 'from', type: 'address'},
        {name: 'token', type: 'address'},
        {name: 'offerId', type: 'uint256'},
        {name: 'startingPrice', type: 'uint256'},
        {name: 'endingPrice', type: 'uint256'},
        {name: 'startedAt', type: 'uint256'},
        {name: 'duration', type: 'uint256'},
        {name: 'packs', type: 'uint256'},
        {name: 'ids', type: 'bytes'},
        {name: 'amounts', type: 'bytes'},
      ],
    },
    primaryType: 'Auction',
    domain: {
      name: name,
      version: version,
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};

export const messageTypes = [
  'bytes32',
  'address',
  'address',
  'uint256',
  'uint256',
  'uint256',
  'uint256',
  'uint256',
  'uint256',
  'bytes',
  'bytes',
];
