// TODO: This is the same as the root folder scripts... fix it
const EIP712 = require('./EIP712');

function AssetType(assetClass, data) {
  return {assetClass, data};
}

function Asset(assetClass, assetData, value) {
  return {assetType: AssetType(assetClass, assetData), value};
}

function Order(
  maker,
  makeAsset,
  taker,
  takeAsset,
  salt,
  start,
  end,
  dataType,
  data
) {
  return {maker, makeAsset, taker, takeAsset, salt, start, end, dataType, data};
}

function OrderBack(
  buyer,
  maker,
  makeAsset,
  taker,
  takeAsset,
  salt,
  start,
  end,
  dataType,
  data
) {
  return {
    buyer,
    maker,
    makeAsset,
    taker,
    takeAsset,
    salt,
    start,
    end,
    dataType,
    data,
  };
}

const Types = {
  AssetType: [
    {name: 'assetClass', type: 'bytes4'},
    {name: 'data', type: 'bytes'},
  ],
  Asset: [
    {name: 'assetType', type: 'AssetType'},
    {name: 'value', type: 'uint256'},
  ],
  Order: [
    {name: 'maker', type: 'address'},
    {name: 'makeAsset', type: 'Asset'},
    {name: 'taker', type: 'address'},
    {name: 'takeAsset', type: 'Asset'},
    {name: 'salt', type: 'uint256'},
    {name: 'start', type: 'uint256'},
    {name: 'end', type: 'uint256'},
    {name: 'dataType', type: 'bytes4'},
    {name: 'data', type: 'bytes'},
  ],
};

const TypesBack = {
  AssetType: [
    {name: 'assetClass', type: 'bytes4'},
    {name: 'data', type: 'bytes'},
  ],
  Asset: [
    {name: 'assetType', type: 'AssetType'},
    {name: 'value', type: 'uint256'},
  ],
  OrderBack: [
    {name: 'buyer', type: 'address'},
    {name: 'maker', type: 'address'},
    {name: 'makeAsset', type: 'Asset'},
    {name: 'taker', type: 'address'},
    {name: 'takeAsset', type: 'Asset'},
    {name: 'salt', type: 'uint256'},
    {name: 'start', type: 'uint256'},
    {name: 'end', type: 'uint256'},
    {name: 'dataType', type: 'bytes4'},
    {name: 'data', type: 'bytes'},
  ],
};

async function sign(web3, order, account, verifyingContract) {
  const chainId = config.network_id;
  const data = EIP712.createTypeData(
    {
      name: 'Exchange',
      version: '1',
      chainId,
      verifyingContract,
    },
    'Order',
    order,
    Types
  );
  return (await EIP712.signTypedData(web3, account, data)).sig;
}

async function signBack(web3, order, account, verifyingContract) {
  const chainId = config.network_id;
  const data = EIP712.createTypeData(
    {
      name: 'Exchange',
      version: '1',
      chainId,
      verifyingContract,
    },
    'OrderBack',
    order,
    TypesBack
  );
  return (await EIP712.signTypedData(web3, account, data)).sig;
}

module.exports = {AssetType, Asset, Order, OrderBack, sign, signBack};
