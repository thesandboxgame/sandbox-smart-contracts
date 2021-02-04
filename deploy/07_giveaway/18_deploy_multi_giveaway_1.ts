import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {createClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1_with_erc20/getClaims';

import helpers, {MultiClaim} from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetLandAndSandHash} = helpers;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  let claimData: MultiClaim[];
  try {
    claimData = JSON.parse(
      fs
        .readFileSync(
          `data/giveaways/multi_giveaway_1_with_erc20/claims_${hre.network.name}.json`
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

  await deploy('Multi_Giveaway_1', {
    contract: 'MultiGiveawayWithERC20',
    from: deployer,
    log: true,
    args: [
      deployer,
      merkleRootHash, // TODO: remove ?
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ], // TODO: expiryTime
  });

  // TODO: separate script to be used whenever a new giveaway is sent to the reusable multigiveaway contract
  const claimsWithProofs: (MultiClaim & {proof: string[]})[] = [];
  for (const claim of saltedClaims) {
    claimsWithProofs.push({
      ...claim,
      proof: tree.getProof(calculateClaimableAssetLandAndSandHash(claim)),
    });
  }
  fs.writeFileSync(
    `./secret/.multi_claims_proofs_${chainId}.json`,
    JSON.stringify(claimsWithProofs, null, '  ')
  );
};
export default func;
func.tags = ['Multi_Giveaway_1_deploy'];
func.dependencies = ['Land_deploy', 'Asset_deploy', 'Sand_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
