import {utils} from 'ethers';
const {solidityKeccak256, defaultAbiCoder, keccak256} = utils;
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

export type SaltedProofSaleLandInfo = SaltedSaleLandInfo & {
  proof: string[];
};

export type AssetHash = {[assetId: string]: number};

export type AssetClaim = {
  reservedAddress: string;
  assetIds: Array<string>;
  assetValues: Array<number>;
  salt?: string;
};

export type MultiClaim = {
  to: string;
  erc1155: Array<ERC1155Claim>;
  erc721: Array<ERC721Claim>;
  erc20: {
    amounts: Array<number>;
    contractAddresses: Array<string>;
  };
  salt?: string;
};

export type ERC1155Claim = {
  ids: Array<string>;
  values: Array<number>;
  contractAddress: string;
};

export type ERC721Claim = {
  ids: Array<number>;
  contractAddress: string;
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

// Asset Giveaway

function calculateClaimableAssetHash(claim: AssetClaim, salt?: string): string {
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
  types.push('bytes32');
  values.push(claim.salt || salt);

  return solidityKeccak256(types, values);
}

function saltClaimableAssets(
  claims: AssetClaim[],
  secret?: string | Buffer
): Array<AssetClaim> {
  return claims.map((claim) => {
    const salt = claim.salt;
    if (!salt) {
      if (!secret) {
        throw new Error('Claim need to have a salt or be generated via secret');
      }
      const newClaim: AssetClaim = {
        ...claim,
        salt:
          '0x' +
          crypto
            .createHmac('sha256', secret)
            .update(
              calculateClaimableAssetHash(
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

function createDataArrayClaimableAssets(
  claims: AssetClaim[],
  secret?: string
): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: string[] = [];

  claims.forEach((claim: AssetClaim) => {
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
            calculateClaimableAssetHash(
              claim,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateClaimableAssetHash(claim, salt));
  });

  return data;
}

// Multi Giveaway

function calculateMultiClaimHash(claim: MultiClaim, salt?: string): string {
  const types = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any = [];
  if (!claim.salt) claim.salt = salt; // Ensure that a salt is included in the claim object to be hashed
  types.push(
    'tuple(address to, tuple(uint256[] ids, uint256[] values, address contractAddress)[] erc1155, tuple(uint256[] ids, address contractAddress)[] erc721, tuple(uint256[] amounts, address[] contractAddresses) erc20, bytes32 salt)'
  );
  values.push(claim);
  return keccak256(defaultAbiCoder.encode(types, values));
}

function saltMultiClaim(
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
              calculateMultiClaimHash(
                claim,
                '0x' + crypto.randomBytes(32).toString('hex')
              )
            )
            .digest('hex'),
      };
      return newClaim;
    } else return claim;
  });
}

function createDataArrayMultiClaim(
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
            calculateMultiClaimHash(
              claim,
              '0x0000000000000000000000000000000000000000000000000000000000000000'
            )
          )
          .digest('hex');
    }
    data.push(calculateMultiClaimHash(claim, salt));
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
  calculateMultiClaimHash,
  saltMultiClaim,
  createDataArrayMultiClaim,
};

export default helpers;
