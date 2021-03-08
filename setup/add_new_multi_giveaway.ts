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
          'data/giveaways/multi_giveaway_1/claims_0_hardhat.json' // TODO: update for each claim file
        )
        .toString()
    );
  } catch (e) {
    console.log('Error', e);
    return;
  }

  const {merkleRootHash, saltedClaims, tree} = createClaimMerkleTree(
    network.live,
    chainId,
    claimData
  );

  const giveawayContract = await deployments.getOrNull('Multi_Giveaway_1');
  if (!giveawayContract) {
    console.log('No Multi_Giveaway_1 deployment');
    return;
  }

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

  console.log(`New giveaway added with merkleRootHash: ${merkleRootHash}`);

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
  console.log(`Proofs at: ./secret/.multi_claims_proofs_${chainId}.json`);
};
export default func;

if (require.main === module) {
  func(hre);
}
