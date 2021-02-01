import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {createAssetLandAndSandClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1_with_erc20/getClaims';

import helpers, {Claim} from '../../lib/merkleTreeHelper';
const {calculateClaimableAssetLandAndSandHash} = helpers;

const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';

const LAND_HOLDER = '0x0000000000000000000000000000000000000000';
const SAND_HOLDER = '0x0000000000000000000000000000000000000000';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  let claimData: Claim[];
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

  const {
    claims,
    merkleRootHash,
    saltedClaims,
    tree,
  } = createAssetLandAndSandClaimMerkleTree(network.live, chainId, claimData);

  const assetContract = await deployments.get('Asset');
  const landContract = await deployments.get('Land');
  const sandContract = await deployments.get('Sand');

  await deploy('Multi_Giveaway_1_with_ERC20', {
    contract: 'MultiGiveawayWithERC20',
    from: deployer,
    linkedData: claims,
    log: true,
    args: [
      assetContract.address,
      landContract.address,
      sandContract.address,
      deployer,
      merkleRootHash,
      ASSETS_HOLDER,
      LAND_HOLDER,
      SAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ], // TODO: expiryTime
  });

  const claimsWithProofs: (Claim & {proof: string[]})[] = [];
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
func.tags = ['Multi_Giveaway_1_deploy_with_ERC20'];
func.dependencies = ['Land_deploy', 'Asset_deploy', 'Sand_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
