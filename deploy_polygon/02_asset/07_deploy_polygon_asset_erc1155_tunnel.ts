import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const FXROOT = await deployments.get('FXROOT');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const PolygonAssetERC1155Tunnel = await deploy('PolygonAssetERC1155Tunnel', {
    from: deployer,
    contract: 'PolygonAssetERC1155Tunnel',
    args: [
      FXROOT.address,
      PolygonAssetERC1155.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const AssetERC1155Tunnel = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('AssetERC1155Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  if (AssetERC1155Tunnel) {
    await hre.companionNetworks['l1'].deployments.execute(
      'AssetERC1155Tunnel',
      {from: deployerOnL1},
      'setFxChildTunnel',
      PolygonAssetERC1155Tunnel.address
    );
    await deployments.execute(
      'PolygonAssetERC1155Tunnel',
      {from: deployer},
      'setFxRootTunnel',
      AssetERC1155Tunnel.address
    );
  }
};

export default func;
func.tags = ['PolygonAssetERC1155Tunnel', 'PolygonAssetERC1155Tunnel_deploy', 'L1'];
func.dependencies = [
  'PolygonAssetERC1155',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
