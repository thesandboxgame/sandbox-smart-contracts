import fs from 'fs';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

import {createClaimMerkleTree} from '../data/giveaways/multi_giveaway_1/getClaims';
import helpers, {MultiClaim} from '../lib/merkleTreeHelper';
const {calculateMultiClaimHash} = helpers;

const func: DeployFunction = async function () {
  const {deployments, network, getChainId} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const chainId = await getChainId();

  let claimData: MultiClaim[];
  try {
    claimData = JSON.parse(
      fs
        .readFileSync(
          `data/giveaways/multi_giveaway_1/claims_${hre.network.name}.json` // TODO: update for each claim file
        )
        .toString()
    );
  } catch (e) {
    return;
  }

  const {merkleRootHash, saltedClaims, tree} = createClaimMerkleTree(
    network.live,
    chainId,
    claimData
  );

  const giveawayContract = await deployments.getOrNull('Multi_Giveaway_1');
  if (!giveawayContract) {
    return;
  }

  // Add a new giveaway
  const currentAdmin = await read('Multi_Giveaway_1', 'getAdmin');

  await catchUnknownSigner(
    execute(
      'Multi_Giveaway_1',
      {from: currentAdmin, log: true},
      'addNewGiveaway',
      merkleRootHash,
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' // do not expire
    )
  );

  const claimsWithProofs: (MultiClaim & {proof: string[]})[] = [];
  for (const claim of saltedClaims) {
    claimsWithProofs.push({
      ...claim,
      proof: tree.getProof(calculateMultiClaimHash(claim)),
    });
  }
  fs.writeFileSync(
    `./secret/.multi_claims_proofs_${chainId}.json`,
    JSON.stringify(claimsWithProofs, null, '  ')
  );
};
export default func;

if (require.main === module) {
  func(hre);
}
