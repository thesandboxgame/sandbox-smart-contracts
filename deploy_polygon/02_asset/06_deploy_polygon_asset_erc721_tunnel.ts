import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');

  const MAX_TRANSFER_LIMIT = 20;

  const PolygonAssetERC721Tunnel = await deploy('PolygonAssetERC721Tunnel', {
    from: deployer,
    contract: 'PolygonAssetERC721Tunnel',
    args: [
      FXCHILD.address,
      PolygonAssetERC721.address,
      TRUSTED_FORWARDER.address,
      MAX_TRANSFER_LIMIT,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const AssetERC721Tunnel = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('AssetERC721Tunnel');
  // get deployer on l1
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  // Note: if redeploy, delete tunnels

  if (AssetERC721Tunnel) {
    const fxChildTunnel = await hre.companionNetworks['l1'].deployments.read(
      'AssetERC721Tunnel',
      'fxChildTunnel'
    );
    const fxRootTunnel = await read('PolygonAssetERC721Tunnel', 'fxRootTunnel');

    if (
      fxRootTunnel !== PolygonAssetERC721Tunnel.address &&
      fxRootTunnel == constants.AddressZero
    ) {
      await deployments.execute(
        'PolygonAssetERC721Tunnel',
        {from: deployer},
        'setFxRootTunnel',
        AssetERC721Tunnel.address
      );
    }

    if (
      fxChildTunnel !== PolygonAssetERC721Tunnel.address &&
      fxChildTunnel == constants.AddressZero
    ) {
      await hre.companionNetworks['l1'].deployments.execute(
        'AssetERC721Tunnel',
        {from: deployerOnL1},
        'setFxChildTunnel',
        PolygonAssetERC721Tunnel.address
      );
    }
  }
};

export default func;
func.tags = [
  'PolygonAssetERC721Tunnel',
  'PolygonAssetERC721Tunnel_deploy',
  'L2',
  'PolygonAsset',
];
func.dependencies = ['PolygonAssetERC721', 'FXCHILD'];
func.skip = skipUnlessTestnet;
