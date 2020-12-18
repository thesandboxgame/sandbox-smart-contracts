import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {createAssetLandAndSandClaimMerkleTree} from '../data/giveaways/multi_giveaway_1_with_erc20/getClaims';
import {default as claimData} from '../data/giveaways/multi_giveaway_1_with_erc20/claims.json';
const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';

const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, getChainId} = hre;
  const {deploy} = deployments;
  const chainId = await getChainId();
  const {deployer} = await getNamedAccounts();

  const {lands, merkleRootHash} = createAssetLandAndSandClaimMerkleTree(
    network.live,
    chainId,
    claimData
  );

  const assetContract = await deployments.get('Asset');
  const landContract = await deployments.get('Land');

  await deploy('Multi_Giveaway_1_with_ERC20', {
    contract: 'MultiGiveawayWithERC20',
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
func.tags = [
  'Multi_Giveaway_1_with_ERC20',
  'Multi_Giveaway_1_deploy_with_ERC20',
];
func.dependencies = ['Land_deploy', 'Asset_deploy'];
