import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const AssetERC721 = await deployments.get('AssetERC721');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const MAX_TRANSFER_LIMIT = 20;

  await deploy('MockAssetERC721Tunnel', {
    from: deployer,
    contract: 'MockAssetERC721Tunnel',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          CHECKPOINTMANAGER.address,
          FXROOT.address,
          AssetERC721.address,
          TRUSTED_FORWARDER.address,
          MAX_TRANSFER_LIMIT,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const MockAssetERC721Tunnel = await deployments.get('MockAssetERC721Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  const MockPolygonAssetERC721Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('MockPolygonAssetERC721Tunnel');

  if (MockPolygonAssetERC721Tunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'MockPolygonAssetERC721Tunnel',
      {from: deployerOnL2},
      'setFxRootTunnel',
      MockAssetERC721Tunnel.address
    );

    await deployments.execute(
      'MockAssetERC721Tunnel',
      {from: deployer},
      'setFxChildTunnel',
      MockPolygonAssetERC721Tunnel.address
    );
  }
};

export default func;
func.tags = ['MockAssetERC721Tunnel', 'MockAssetERC721Tunnel_deploy', 'L1'];
func.dependencies = [
  'AssetERC721Tunnel',
  'AssetERC721',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
