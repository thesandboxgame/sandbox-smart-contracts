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

interface claim {
  reservedAddress: string;
  assetIds?: Array<BigNumber> | Array<string> | Array<number>;
  assetValues?: Array<number>;
  landIds?: Array<number>;
  ids?: Array<BigNumber> | Array<string> | Array<number>;
  sand?: number | BigNumber;
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

// Multi Giveaway With ERC20 (Assets, Lands and SAND)

function calculateClaimableAssetLandAndSandHash(
  claim: claim,
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
  claims: claim[],
  secret?: string | Buffer
): Array<claim> {
  return claims.map((claim) => {
    const salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      const newClaim: claim = {
        reservedAddress: claim.reservedAddress,
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
      if (claim.assetIds) newClaim.assetIds = claim.assetIds;
      if (claim.assetValues) newClaim.assetValues = claim.assetValues;
      if (claim.landIds) newClaim.landIds = claim.landIds;
      if (claim.ids) newClaim.ids = claim.ids;
      if (claim.sand) newClaim.sand = claim.sand;
      return newClaim;
    } else return claim;
  });
}

function createDataArrayClaimableAssetsLandsAndSand(
  claims: claim[],
  secret?: string
): Array<claim> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = [];

  claims.forEach((claim: claim) => {
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
