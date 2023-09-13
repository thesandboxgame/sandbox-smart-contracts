// TODO: This is the same as the root folder scripts... fix it
const ethUtil = require('ethereumjs-util');
const Web3 = require('web3');

function id(str) {
  return `0x${ethUtil
    .keccak256(Buffer.from(str))
    .toString('hex')
    .substring(0, 8)}`;
}

function enc(token, tokenId) {
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

function encBundle(erc20, erc721, erc1155) {
  const web3 = new Web3();
  return web3.eth.abi.encodeParameters(
    [
      {
        name: 'ERC20Details',
        type: 'tupple[]',
        components: [
          {
            name: 'token',
            type: 'address',
          },
          {
            name: 'value',
            type: 'uint256',
          },
        ],
      },
      {
        name: 'ERC721Details',
        type: 'tupple[]',
        components: [
          {
            name: 'token',
            type: 'address',
          },
          {
            name: 'id',
            type: 'uint256',
          },
          {
            name: 'value',
            type: 'uint256',
          },
        ],
      },
      {
        name: 'ERC1155Details',
        type: 'tupple[]',
        components: [
          {
            name: 'token',
            type: 'address',
          },
          {
            name: 'id',
            type: 'uint256',
          },
          {
            name: 'value',
            type: 'uint256',
          },
        ],
      },
    ],
    [erc20, erc721, erc1155]
  );
}

function percentage(number, percentage) {
  return (number * percentage) / 10000;
}

const ETH = id('ETH');
const ERC20 = id('ERC20');
const ERC721 = id('ERC721');
const ERC721_LAZY = id('ERC721_LAZY');
const ERC1155 = id('ERC1155');
const ERC1155_LAZY = id('ERC1155_LAZY');
const BUNDLE = id('BUNDLE');
const COLLECTION = id('COLLECTION');
const ORDER_DATA_BUY = id('BUY');
const ORDER_DATA_SELL = id('SELL');
const TO_MAKER = id('TO_MAKER');
const TO_TAKER = id('TO_TAKER');
const PROTOCOL = id('PROTOCOL');
const ROYALTY = id('ROYALTY');
const ORIGIN = id('ORIGIN');
const PAYOUT = id('PAYOUT');
const LOCK = id('LOCK');
const UNLOCK = id('UNLOCK');
const TO_LOCK = id('TO_LOCK');

module.exports = {
  id,
  ETH,
  ERC20,
  ERC721,
  ERC721_LAZY,
  ERC1155,
  ERC1155_LAZY,
  BUNDLE,
  ORDER_DATA_SELL,
  ORDER_DATA_BUY,
  TO_MAKER,
  TO_TAKER,
  PROTOCOL,
  ROYALTY,
  ORIGIN,
  PAYOUT,
  COLLECTION,
  LOCK,
  UNLOCK,
  TO_LOCK,
  enc,
  encBundle,
  percentage,
};
