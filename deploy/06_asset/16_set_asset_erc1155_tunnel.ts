import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const AssetERC1155Tunnel = await deployments.get('AssetERC1155Tunnel');
  const currentAdmin = await read('Asset', 'getAdmin');
  await catchUnknownSigner(
    execute(
      'Asset',
      {from: currentAdmin, log: true},
      'setPredicate',
      AssetERC1155Tunnel.address
    )
  );
};

export default func;
func.tags = ['AssetERC1155Tunnel_setup', 'L1'];
func.runAtTheEnd = true;
func.dependencies = [
  'Asset',
  'Asset_ERC1155',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
