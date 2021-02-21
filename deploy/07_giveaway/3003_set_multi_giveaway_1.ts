import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {createClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1/getClaims';
import helpers, {MultiClaim} from '../../lib/merkleTreeHelper';
const {calculateMultiClaimHash} = helpers;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, network, getChainId} = hre;
  const {execute, read, log} = deployments;
  const chainId = await getChainId();

  let claimData: MultiClaim[];
  try {
    claimData = JSON.parse(
      fs
        .readFileSync(
          `data/giveaways/multi_giveaway_1/claims_${hre.network.name}.json`
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

  await execute(
    'Multi_Giveaway_1',
    {from: currentAdmin, log: true},
    'addNewGiveaway',
    merkleRootHash,
    1615194000 // Sunday, 08-Mar-21 09:00:00 UTC
  );
  // TODO: separate script to be used whenever a new giveaway is added to the reusable multigiveaway contract
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
func.runAtTheEnd = true;
func.tags = ['Multi_Giveaway_1', 'Multi_Giveaway_1_setup'];
func.dependencies = [
  'Multi_Giveaway_1_deploy',
  'Asset_deploy',
  'Land_deploy',
  'Sand_deploy',
];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
