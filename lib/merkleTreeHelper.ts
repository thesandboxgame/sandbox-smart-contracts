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

export type AssetClaim = {
  reservedAddress: string;
  assetIds: Array<string>;
  assetValues: Array<number>;
  salt?: string;
};

export type MultiClaim = {
  reservedAddress: string;
  assetIds: Array<string>;
  assetValues: Array<number>;
  landIds: Array<number>;
  assetContractAddress: string;
  landContractAddress: string;
  erc20Amounts: Array<number>;
  erc20ContractAddresses: Array<string>;
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

// Multi Giveaway

function calculateClaimableAssetLandAndSandHash(
  claim: MultiClaim,
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
  if (claim.assetContractAddress) {
    types.push('address');
    values.push(claim.assetContractAddress);
  }
  if (claim.landIds) {
    types.push('uint256[]');
    values.push(claim.landIds);
  }
  if (claim.landContractAddress) {
    types.push('address');
    values.push(claim.landContractAddress);
  }
  if (claim.erc20Amounts) {
    types.push('uint256[]');
    values.push(claim.erc20ContractAddresses);
  }
  if (claim.erc20ContractAddresses) {
    types.push('address[]');
    values.push(claim.erc20ContractAddresses);
  }
  types.push('bytes32');
  values.push(claim.salt || salt);

  return solidityKeccak256(types, values);
}

function saltClaimableAssetsLandsAndSand(
  claims: MultiClaim[],
  secret?: string | Buffer
): Array<MultiClaim> {
  return claims.map((claim) => {
    const salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      const newClaim: MultiClaim = {
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
  claims: MultiClaim[],
  secret?: string
): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: string[] = [];

  claims.forEach((claim: MultiClaim) => {
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
