import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import MerkleTree from '../../lib/merkleTree';
import helpers, {MultiClaim} from '../../lib/merkleTreeHelper';

const {
  createDataArrayMultiClaim,
  saltMultiClaim,
} = helpers;

export function createClaimMerkleTree(
  hre: HardhatRuntimeEnvironment,
  claimData: Array<MultiClaim>,
  claimContract: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const secretPath = `./secret/multi-giveaway/.${claimContract.toLowerCase()}_secret${hre.network.live ? ('.' + hre.network.name) : ''}`;
  let secret;
  try {
    secret = fs.readFileSync(secretPath);
  } catch (e) {
    if (hre.network.live) {
      throw e;
    }
    secret =
      '0x4467363716526536535425451427798982881775318563547751090997863683';
  }

  const saltedClaims = saltMultiClaim(claimData, secret);
  const tree = new MerkleTree(
    createDataArrayMultiClaim(saltedClaims)
  );
  const merkleRootHash = tree.getRoot().hash;

  return {
    claims: hre.network.live ? claimData : saltedClaims,
    merkleRootHash,
    saltedClaims,
    tree,
  };
}
