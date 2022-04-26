import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const AssetERC1155 = await deployments.get('Asset');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const AssetERC1155Tunnel = await deploy('AssetERC1155Tunnel', {
    from: deployer,
    contract: 'AssetERC1155Tunnel',
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      AssetERC1155.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const PolygonAssetERC1155Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonAssetERC1155Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (PolygonAssetERC1155Tunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'PolygonAssetERC1155Tunnel',
      {from: deployerOnL2},
      'setFxRootTunnel',
      AssetERC1155Tunnel.address
    );
    await deployments.execute(
      'AssetERC1155Tunnel',
      {from: deployer},
      'setFxChildTunnel',
      PolygonAssetERC1155Tunnel.address
    );
  }

  // setting up predicate on L1
  await deployments.execute(
    'Asset',
    {from: deployer},
    'setPredicate',
    AssetERC1155Tunnel.address
  );
};

export default func;
func.tags = ['AssetERC1155Tunnel', 'AssetERC1155Tunnel_deploy', 'L1'];
func.dependencies = [
  'Asset',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
