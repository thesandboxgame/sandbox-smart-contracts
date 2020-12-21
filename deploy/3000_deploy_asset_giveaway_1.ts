import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {
  createAssetClaimMerkleTree,
  AssetClaim,
} from '../data/asset_giveaway_1/getAssets';
import {AddressZero} from '@ethersproject/constants';

import helpers from '../lib/merkleTreeHelper';
const {calculateAssetHash} = helpers;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  let assetData: AssetClaim[];
  try {
    assetData = JSON.parse(
      fs
        .readFileSync(`data/asset_giveaway_1/assets_${hre.network.name}.json`)
        .toString()
    );
  } catch (e) {
    return;
  }

  const {
    assets,
    merkleRootHash,
    saltedAssets,
    tree,
  } = createAssetClaimMerkleTree(network.live, chainId, assetData);

  const assetContract = await deployments.get('Asset');

  await deploy('Asset_Giveaway_1', {
    contract: 'AssetGiveaway',
    from: deployer,
    linkedData: assets,
    log: true,
    args: [
      assetContract.address,
      AddressZero, // no admin needed
      merkleRootHash,
      AddressZero, // owns the assets
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', // do not expire
    ],
  });

  const claimsWithProofs: (AssetClaim & {proof: string[]})[] = [];
  for (const claim of saltedAssets) {
    claimsWithProofs.push({
      ...claim,
      proof: tree.getProof(calculateAssetHash(claim)),
    });
  }
  fs.writeFileSync(
    `./secret/.asset_claims_proofs_${chainId}.json`,
    JSON.stringify(claimsWithProofs, null, '  ')
  );
};
export default func;
func.tags = ['Asset_Giveaway_1', 'Asset_Giveaway_1_deploy'];
func.dependencies = ['Asset_deploy'];
