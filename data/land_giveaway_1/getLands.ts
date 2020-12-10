import fs from 'fs';
import {BigNumber} from 'ethers';
import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';

const {createDataArrayClaimableLands, saltClaimableLands} = helpers;

type LandClaim = {
  reservedAddress: string;
  ids: Array<BigNumber> | Array<string> | Array<number>;
};

export function createLandClaimMerkleTree(
  isDeploymentChainId: boolean,
  chainId: string,
  landData: Array<LandClaim>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let secretPath = './.land_giveaway_1_secret';
  if (BigNumber.from(chainId).toString() === '1') {
    console.log('MAINNET secret');
    secretPath = './.land_giveaway_1_secret.mainnet';
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

  const saltedLands = saltClaimableLands(landData, secret);
  const tree = new MerkleTree(createDataArrayClaimableLands(saltedLands));
  const merkleRootHash = tree.getRoot().hash;

  return {
    lands: expose ? saltedLands : landData,
    merkleRootHash,
    saltedLands,
    tree,
  };
}
