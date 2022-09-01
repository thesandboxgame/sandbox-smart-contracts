import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');
  const MAX_TRANSFER_LIMIT = 20;

  await deploy('MockPolygonAssetERC721Tunnel', {
    from: deployer,
    contract: 'PolygonAssetERC721Tunnel',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          FXCHILD.address,
          PolygonAssetERC721.address,
          TRUSTED_FORWARDER.address,
          MAX_TRANSFER_LIMIT,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const MockPolygonAssetERC721Tunnel = await deployments.get(
    'MockPolygonAssetERC721Tunnel'
  );

  // get deployer on l1

  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  const MockAssetERC721Tunnel = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('MockAssetERC721Tunnel');

  if (MockAssetERC721Tunnel) {
    await hre.companionNetworks['l1'].deployments.execute(
      'MockAssetERC721Tunnel',
      {from: deployerOnL1},
      'setFxChildTunnel',
      MockPolygonAssetERC721Tunnel.address
    );
    await deployments.execute(
      'MockPolygonAssetERC721Tunnel',
      {from: deployer},
      'setFxRootTunnel',
      MockAssetERC721Tunnel.address
    );
  }
};

export default func;
func.tags = [
  'MockPolygonAssetERC721Tunnel',
  'MockPolygonAssetERC721Tunnel_deploy',
  'L2',
  'PolygonAsset',
];
func.dependencies = [
  'PolygonAssetERC721',
  'FXCHILD',
  'PolygonAssetERC721Tunnel',
];
func.skip = skipUnlessTest;
