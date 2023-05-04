import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {assetAdmin} = await getNamedAccounts();

  const polygonPredicate = await deployments.get('PolygonAssetERC721Tunnel');

  // Grant roles.
  const minterRole = await deployments.read(
    'PolygonAssetERC721',
    'MINTER_ROLE'
  );

  // TODO: add  'if hasRole'
  await deployments.execute(
    'PolygonAssetERC721',
    {from: assetAdmin, log: true},
    'grantRole',
    minterRole,
    polygonPredicate.address
  );
};

export default func;
func.tags = ['PolygonAssetERC721_setup', 'PolygonAsset', 'L2'];
func.runAtTheEnd = true;
func.dependencies = [
  'PolygonAssetERC721_deploy',
  'PolygonAssetERC721Tunnel_deploy',
];
func.skip = skipUnlessTestnet;
