import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const AssetERC1155 = await deployments.get('Asset');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const MockAssetERC1155Tunnel = await deploy('MockAssetERC1155Tunnel', {
    from: deployer,
    contract: 'MockAssetERC1155Tunnel',
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      AssetERC1155.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const MockPolygonAssetERC1155Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('MockPolygonAssetERC1155Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (MockPolygonAssetERC1155Tunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'MockPolygonAssetERC1155Tunnel',
      {from: deployerOnL2},
      'setFxRootTunnel',
      MockAssetERC1155Tunnel.address
    );

    await deployments.execute(
      'MockAssetERC1155Tunnel',
      {from: deployer},
      'setFxChildTunnel',
      MockPolygonAssetERC1155Tunnel.address
    );
  }

  // setting up predicate on L1
  await deployments.execute(
    'Asset',
    {from: deployer},
    'setPredicate',
    MockAssetERC1155Tunnel.address
  );
};

export default func;
func.tags = ['MockAssetERC1155Tunnel', 'MockAssetERC1155Tunnel_deploy', 'L1'];
func.dependencies = [
  'AssetERC1155Tunnel',
  'AssetERC1155',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
