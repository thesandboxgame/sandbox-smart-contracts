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

interface claimableAsset {
  reservedAddress: string;
  assetIds: Array<BigNumber> | Array<string> | Array<number>;
  assetValues: Array<number>;
  salt?: string;
}

interface claimableLand {
  reservedAddress: string;
  ids: Array<BigNumber> | Array<string> | Array<number>;
  salt?: string;
}

interface claimableAssetAndLand {
  reservedAddress: string;
  assetIds?: Array<BigNumber> | Array<string> | Array<number>;
  assetValues?: Array<number>;
  landIds?: Array<number>;
  salt?: string;
}

// LAND PRESALE

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

// ASSET GIVEAWAY

function calculateClaimableAssetHash(
  asset: claimableAsset,
  salt?: string
): string {
  const types = ['address', 'uint256[]', 'uint256[]', 'bytes32'];
  const values = [
    asset.reservedAddress,
    asset.assetIds,
    asset.assetValues,
    asset.salt || salt,
  ];
  return solidityKeccak256(types, values);
}

function saltClaimableAssets(
  assets: claimableAsset[],
  secret?: string | Buffer
): Array<claimableAsset> {
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
              calculateClaimableAssetHash(
                asset,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              )
            )
            .digest('hex'),
      };
    } else return asset;
  });
}

function createDataArrayClaimableAssets(
  assets: claimableAsset[],
  secret?: string
): Array<claimableAsset> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  assets.forEach((asset: claimableAsset) => {
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
            calculateClaimableAssetHash(
              asset,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateClaimableAssetHash(asset, salt));
  });

  return data;
}

// LAND GIVEAWAY

function calculateClaimableLandHash(
  land: claimableLand,
  salt?: string
): string {
  const types = ['address', 'uint256[]', 'bytes32'];
  const values = [land.reservedAddress, land.ids, land.salt || salt];
  return solidityKeccak256(types, values);
}

function saltClaimableLands(
  lands: claimableLand[],
  secret?: string | Buffer
): Array<claimableLand> {
  return lands.map((land) => {
    const salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Asset need to have a salt or be generated via secret');
      }
      return {
        reservedAddress: land.reservedAddress,
        ids: land.ids,
        salt:
          '0x' +
          crypto
            .createHmac('sha256', secret)
            .update(
              calculateClaimableLandHash(
                land,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              )
            )
            .digest('hex'),
      };
    } else return land;
  });
}

function createDataArrayClaimableLands(
  lands: claimableLand[],
  secret?: string
): Array<claimableLand> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  lands.forEach((land: claimableLand) => {
    let salt = land.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Asset need to have a salt or be generated via secret');
      }
      salt =
        '0x' +
        crypto
          .createHmac('sha256', secret)
          .update(
            calculateClaimableLandHash(
              land,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateClaimableLandHash(land, salt));
  });

  return data;
}

// Multi Giveaway (Assets and Lands)

function calculateClaimableAssetAndLandHash(
  claim: claimableAssetAndLand,
  salt?: string
): string {
  const types = [];
  const values = [];
  types.push('address');
  values.push(claim.reservedAddress);
  if (claim.assetIds) {
    types.push('uint256[]');
    values.push(claim.assetIds);
  }
  if (claim.assetValues) {
    types.push('uint256[]');
    values.push(claim.assetValues);
  }
  if (claim.landIds) {
    types.push('uint256[]');
    values.push(claim.landIds);
  }
  types.push('bytes32');
  values.push(claim.salt || salt);

  return solidityKeccak256(types, values);
}

function saltClaimableAssetsAndLands(
  claims: claimableAssetAndLand[],
  secret?: string | Buffer
): Array<claimableAssetAndLand> {
  return claims.map((claim) => {
    const salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      const newClaim: claimableAssetAndLand = {
        reservedAddress: claim.reservedAddress,
        salt:
          '0x' +
          crypto
            .createHmac('sha256', secret)
            .update(
              calculateClaimableAssetAndLandHash(
                claim,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              )
            )
            .digest('hex'),
      };
      if (claim.assetIds) newClaim.assetIds = claim.assetIds;
      if (claim.assetValues) newClaim.assetValues = claim.assetValues;
      if (claim.landIds) newClaim.landIds = claim.landIds;
      return newClaim;
    } else return claim;
  });
}

function createDataArrayClaimableAssetsAndLands(
  claims: claimableAssetAndLand[],
  secret?: string
): Array<claimableAssetAndLand> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  claims.forEach((claim: claimableAssetAndLand) => {
    let salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      salt =
        '0x' +
        crypto
          .createHmac('sha256', secret)
          .update(
            calculateClaimableAssetAndLandHash(
              claim,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateClaimableAssetAndLandHash(claim, salt));
  });

  return data;
}

const helpers = {
  createDataArray,
  calculateLandHash,
  saltLands,
  calculateClaimableAssetHash,
  saltClaimableAssets,
  createDataArrayClaimableAssets,
  calculateClaimableLandHash,
  saltClaimableLands,
  createDataArrayClaimableLands,
  calculateClaimableAssetAndLandHash,
  saltClaimableAssetsAndLands,
  createDataArrayClaimableAssetsAndLands,
};

export default helpers;
