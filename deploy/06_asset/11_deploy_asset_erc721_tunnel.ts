import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const AssetERC721 = await deployments.get('AssetERC721');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const AssetERC721Tunnel = await deploy('AssetERC721Tunnel', {
    from: deployer,
    contract: 'AssetERC721Tunnel',
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      AssetERC721.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const PolygonAssetERC721Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonAssetERC721Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (PolygonAssetERC721Tunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'PolygonAssetERC721Tunnel',
      {from: deployerOnL2},
      'setFxRootTunnel',
      AssetERC721Tunnel.address
    );
    await deployments.execute(
      'AssetERC721Tunnel',
      {from: deployer},
      'setFxChildTunnel',
      PolygonAssetERC721Tunnel.address
    );
  }
};

export default func;
func.tags = ['AssetERC721Tunnel', 'AssetERC721Tunnel_deploy', 'L1'];
func.dependencies = [
  'AssetERC721',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
