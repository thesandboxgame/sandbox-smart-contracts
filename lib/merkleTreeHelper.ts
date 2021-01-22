import {BigNumber, utils} from 'ethers';
const {solidityKeccak256} = utils;
import crypto from 'crypto';

interface land {
  x: number;
  y: number;
  size: number;
  price: number;
  reserved: string;
  salt?: string;
  assetIds?: Array<number>;
}

interface asset {
  reservedAddress: string;
  assetIds: Array<BigNumber> | Array<string> | Array<number>;
  assetValues: Array<number>;
  salt?: string;
}

function calculateLandHash(land: land, salt?: string): string {
  const types = [
    'uint256',
    'uint256',
    'uint256',
    'uint256',
    'address',
    'bytes32',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any = [
    land.x,
    land.y,
    land.size,
    land.price,
    land.reserved || '0x0000000000000000000000000000000000000000',
    land.salt || salt,
  ];
  if (land.assetIds) {
    types.push('uint256[]');
    values.push(land.assetIds);
  }
  return solidityKeccak256(types, values);
}

function saltLands(lands: land[], secret?: string): Array<land> {
  const saltedLands = [];
  for (const land of lands) {
    let salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Land need to have a salt or be generated via secret');
      }
      salt =
        '0x' +
        crypto
          .createHmac('sha256', secret)
          .update(
            calculateLandHash(
              land,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    saltedLands.push({
      x: land.x,
      y: land.y,
      size: land.size,
      price: land.price,
      reserved: land.reserved,
      salt,
      assetIds: land.assetIds,
    });
  }
  return saltedLands;
}

function createDataArray(lands: land[], secret?: string): Array<land> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  lands.forEach((land: land) => {
    let salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Land need to have a salt or be generated via secret');
      }
      salt =
        '0x' +
        crypto
          .createHmac('sha256', secret)
          .update(
            calculateLandHash(
              land,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateLandHash(land, salt));
  });

  return data;
}

function calculateAssetHash(asset: asset, salt?: string): string {
  const types = ['address', 'uint256[]', 'uint256[]', 'bytes32'];
  const values = [
    asset.reservedAddress,
    asset.assetIds,
    asset.assetValues,
    asset.salt || salt,
  ];
  return solidityKeccak256(types, values);
}

function saltAssets(assets: asset[], secret?: string | Buffer): Array<asset> {
  return assets.map((asset) => {
    const salt = asset.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Asset need to have a salt or be generated via secret');
      }
      return {
        reservedAddress: asset.reservedAddress,
        assetIds: asset.assetIds,
        assetValues: asset.assetValues,
        salt:
          '0x' +
          crypto
            .createHmac('sha256', secret)
            .update(
              calculateAssetHash(
                asset,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              )
            )
            .digest('hex'),
      };
    } else return asset;
  });
}

function createDataArrayAssets(assets: asset[], secret?: string): Array<asset> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  assets.forEach((asset: asset) => {
    let salt = asset.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Asset need to have a salt or be generated via secret');
      }
      salt =
        '0x' +
        crypto
          .createHmac('sha256', secret)
          .update(
            calculateAssetHash(
              asset,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateAssetHash(asset, salt));
  });

  return data;
}

const helpers = {
  createDataArray,
  calculateLandHash,
  saltLands,
  calculateAssetHash,
  saltAssets,
  createDataArrayAssets,
};

export default helpers;
