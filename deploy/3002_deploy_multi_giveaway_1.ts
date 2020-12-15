import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {createAssetAndLandClaimMerkleTree} from '../data/multi_giveaway_1/getClaims';
import {default as claimData} from '../data/multi_giveaway_1/claims.json';
const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';

const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  const {lands, merkleRootHash} = createAssetAndLandClaimMerkleTree(
    network.live,
    chainId,
    claimData
  );

  const assetContract = await deployments.get('Asset');
  const landContract = await deployments.get('Land');

  await deploy('Multi_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    linkedData: lands,
    log: true,
    args: [
      assetContract.address,
      landContract.address,
      deployer,
      merkleRootHash,
      ASSETS_HOLDER,
      LAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ], // TODO: expiryTime
  });
};
export default func;
func.tags = ['Multi_Giveaway_1', 'Multi_Giveaway_1_deploy'];
func.dependencies = ['Land_deploy', 'Asset_deploy'];
