import {utils} from 'ethers';
const {solidityKeccak256} = utils;
import crypto from 'crypto';

export type SaleLandInfo = {
  x: number;
  y: number;
  size: number;
  price: string;
  reserved: string;
  salt?: string;
  assetIds?: Array<string>;
};

export type SaltedSaleLandInfo = SaleLandInfo & {
  salt: string;
};

export type AssetGiveawayInfo = {
  reservedAddress: string;
  assetIds: Array<string>;
  assetValues: Array<number>;
  salt?: string;
};

function calculateLandHash(
  land: SaleLandInfo | SaltedSaleLandInfo,
  salt?: string
): string {
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

function saltLands(
  lands: SaleLandInfo[],
  secret?: string
): Array<SaltedSaleLandInfo> {
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

function createDataArray(
  lands: SaltedSaleLandInfo[],
  secret?: string
): string[] {
  const data: string[] = [];

  lands.forEach((land: SaltedSaleLandInfo) => {
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

function calculateAssetHash(asset: AssetGiveawayInfo, salt?: string): string {
  const types = ['address', 'uint256[]', 'uint256[]', 'bytes32'];
  const values = [
    asset.reservedAddress,
    asset.assetIds,
    asset.assetValues,
    asset.salt || salt,
  ];
  return solidityKeccak256(types, values);
}

function saltAssets(
  assets: AssetGiveawayInfo[],
  secret?: string | Buffer
): Array<AssetGiveawayInfo> {
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

function createDataArrayAssets(
  assets: AssetGiveawayInfo[],
  secret?: string
): Array<string> {
  const data: string[] = [];

  assets.forEach((asset: AssetGiveawayInfo) => {
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
