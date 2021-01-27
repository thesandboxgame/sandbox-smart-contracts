import fs from 'fs';
import {BigNumber} from 'ethers';
import MerkleTree from '../../lib/merkleTree';
import helpers, { Claim } from '../../lib/merkleTreeHelper';

const {
  createDataArrayClaimableAssetsLandsAndSand,
  saltClaimableAssetsLandsAndSand,
} = helpers;

export function createAssetClaimMerkleTree(
  isDeploymentChainId: boolean,
  chainId: string,
  assetData: Array<Claim>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): {
  assets: Claim[];
  merkleRootHash: string;
  saltedAssets: Claim[];
  tree: MerkleTree;
} {
  let secretPath = './secret/.asset_giveaway_2_secret';
  if (BigNumber.from(chainId).toString() === '1') {
    console.log('MAINNET secret');
    secretPath = './secret/.asset_giveaway_2_secret.mainnet';
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

  const saltedAssets = saltClaimableAssetsLandsAndSand(assetData, secret);
  const tree = new MerkleTree(createDataArrayClaimableAssetsLandsAndSand(saltedAssets));
  const merkleRootHash = tree.getRoot().hash;

  return {
    assets: expose ? saltedAssets : assetData,
    merkleRootHash,
    saltedAssets,
    tree,
  };
}
