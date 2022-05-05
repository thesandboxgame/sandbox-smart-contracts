import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {upgradeAdmin} = await getNamedAccounts();

  const AssetERC1155Tunnel = await deployments.get('AssetERC1155Tunnel');

  let currentAdmin;
  try {
    currentAdmin = await read('Asset', 'getAdmin');
  } catch (e) {
    // no admin
  }

  // setting up predicate on L1
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== upgradeAdmin.toLowerCase()) {
      await execute(
        'Asset',
        {from: currentAdmin},
        'setPredicate',
        AssetERC1155Tunnel.address
      );
    }
  }
};

export default func;
func.tags = ['AssetERC1155Tunnel_setup', 'L1'];
func.runAtTheEnd = true;
func.dependencies = [
  'Asset', // Will pick up old 'Asset'
  'Asset_ERC1155', // Will ensure to pick up 'Asset' upgrade to ERC1155
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
