import fs from 'fs';
import {BigNumber} from 'ethers';
import MerkleTree from '../../../lib/merkleTree';
import helpers, {Claim} from '../../../lib/merkleTreeHelper';

const {
  createDataArrayClaimableAssetsLandsAndSand,
  saltClaimableAssetsLandsAndSand,
} = helpers;

type LandClaim = {
  reservedAddress: string;
  ids: Array<BigNumber> | Array<string> | Array<number>;
};

export function createLandClaimMerkleTree(
  isDeploymentChainId: boolean,
  chainId: string,
  landData: Array<LandClaim>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): {
  lands: Claim[];
  merkleRootHash: string;
  saltedLands: Claim[];
  tree: MerkleTree;
} {
  let secretPath = './secret/.land_giveaway_1_secret';
  if (BigNumber.from(chainId).toString() === '1') {
    console.log('MAINNET secret');
    secretPath = './secret/.land_giveaway_1_secret.mainnet';
  }

  let expose = false;
  let secret;
  try {
    secret = fs.readFileSync(secretPath);
  } catch (e) {
    if (isDeploymentChainId) {
      throw e;
    }
    secret =
      '0x4467363716526536535425451427798982881775318563547751090997863683';
  }

  if (!isDeploymentChainId) {
    expose = true;
  }

  const saltedLands = saltClaimableAssetsLandsAndSand(landData, secret);
  const tree = new MerkleTree(
    createDataArrayClaimableAssetsLandsAndSand(saltedLands)
  );
  const merkleRootHash = tree.getRoot().hash;

  return {
    lands: expose ? saltedLands : landData,
    merkleRootHash,
    saltedLands,
    tree,
  };
}
