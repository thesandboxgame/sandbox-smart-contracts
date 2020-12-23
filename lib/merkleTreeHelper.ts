import {BigNumber, utils} from 'ethers';
const {solidityKeccak256} = utils;
import crypto from 'crypto';

interface Land {
  x: number;
  y: number;
  size: number;
  price: number;
  reserved: string;
  salt?: string;
  assetIds?: Array<number>;
}

export interface Claim {
  reservedAddress: string;
  assetIds?: Array<BigNumber> | Array<string> | Array<number>;
  assetValues?: Array<number>;
  landIds?: Array<number>; // multi claim
  ids?: Array<BigNumber> | Array<string> | Array<number>; // land claim only
  sand?: number | BigNumber;
  salt?: string;
}

// LAND PRESALE

function calculateLandHash(land: Land, salt?: string): string {
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

function saltLands(lands: Land[], secret?: string): Array<Land> {
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

function createDataArray(lands: Land[], secret?: string): Array<Land> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  lands.forEach((land: Land) => {
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

// Multi Giveaway With ERC20 (Assets, Lands and SAND)

function calculateClaimableAssetLandAndSandHash(
  claim: Claim,
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
  if (claim.ids) {
    types.push('uint256[]');
    values.push(claim.ids);
  }
  if (claim.sand) {
    types.push('uint256');
    values.push(claim.sand);
  }
  types.push('bytes32');
  values.push(claim.salt || salt);

  return solidityKeccak256(types, values);
}

function saltClaimableAssetsLandsAndSand(
  claims: Claim[],
  secret?: string | Buffer
): Array<Claim> {
  return claims.map((claim) => {
    const salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      const newClaim: Claim = {
        ...claim,
        salt:
          '0x' +
          crypto
            .createHmac('sha256', secret)
            .update(
              calculateClaimableAssetLandAndSandHash(
                claim,
                '0x0000000000000000000000000000000000000000000000000000000000000000'
              )
            )
            .digest('hex'),
      };
      return newClaim;
    } else return claim;
  });
}

function createDataArrayClaimableAssetsLandsAndSand(
  claims: Claim[],
  secret?: string
): Array<Claim> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  claims.forEach((claim: Claim) => {
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
            calculateClaimableAssetLandAndSandHash(
              claim,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateClaimableAssetLandAndSandHash(claim, salt));
  });

  return data;
}

const helpers = {
  createDataArray,
  calculateLandHash,
  saltLands,
  calculateClaimableAssetLandAndSandHash,
  saltClaimableAssetsLandsAndSand,
  createDataArrayClaimableAssetsLandsAndSand,
};

export default helpers;
