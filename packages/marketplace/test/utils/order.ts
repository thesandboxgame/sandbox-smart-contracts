/* eslint-disable @typescript-eslint/no-explicit-any */

export const DEFAULT_ORDER_TYPE = '0xffffffff';
export const UINT256_MAX_VALUE =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

export function AssetType(assetClass: string, data: string) {
  return {assetClass, data};
}

export function createAsset(
  assetClass: string,
  assetData: string,
  value: number
) {
  return {assetType: AssetType(assetClass, assetData), value};
}

export function createOrder(
  maker: string,
  makeAsset: any,
  taker: string,
  takeAsset: any,
  salt: number,
  start: number,
  end: number,
  dataType: string,
  data: string
) {
  return {maker, makeAsset, taker, takeAsset, salt, start, end, dataType, data};
}

// const Types = {
//   AssetType: [
//     {name: 'assetClass', type: 'bytes4'},
//     {name: 'data', type: 'bytes'},
//   ],
//   Asset: [
//     {name: 'assetType', type: 'AssetType'},
//     {name: 'value', type: 'uint256'},
//   ],
//   Order: [
//     {name: 'maker', type: 'address'},
//     {name: 'makeAsset', type: 'Asset'},
//     {name: 'taker', type: 'address'},
//     {name: 'takeAsset', type: 'Asset'},
//     {name: 'salt', type: 'uint256'},
//     {name: 'start', type: 'uint256'},
//     {name: 'end', type: 'uint256'},
//     {name: 'dataType', type: 'bytes4'},
//     {name: 'data', type: 'bytes'},
//   ],
// };

// async function sign(order, account, verifyingContract) {
//   const chainId = config.network_id;
//   const data = EIP712.createTypeData(
//     {
//       name: 'Exchange',
//       version: '1',
//       chainId,
//       verifyingContract,
//     },
//     'Order',
//     order,
//     Types
//   );
//   return (await EIP712.signTypedData(web3, account, data)).sig;
// }
