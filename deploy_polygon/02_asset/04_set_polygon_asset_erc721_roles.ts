import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const adminRole = sandAdmin;
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');
  // Grant roles.
  const childChainManagerRole = await deployments.read(
    'PolygonAssetERC721',
    'CHILD_MANAGER_ROLE'
  );
  // Admin role need enough balance!!!
  await deployments.execute(
    'PolygonAssetERC721',
    {from: adminRole, log: true},
    'grantRole',
    childChainManagerRole,
    CHILD_CHAIN_MANAGER.address
  );
};

export default func;
func.tags = ['PolygonAssetERC721', 'PolygonAssetERC721_role_setup'];
func.dependencies = ['CHILD_CHAIN_MANAGER', 'PolygonAssetERC721_deploy'];
func.skip = skipUnlessTestnet;
