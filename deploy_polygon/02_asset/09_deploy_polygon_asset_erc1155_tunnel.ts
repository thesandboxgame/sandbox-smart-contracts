import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const FXCHILD = await deployments.get('FXCHILD');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const MAX_TRANSFER_LIMIT = 20;

  const PolygonAssetERC1155Tunnel = await deploy('PolygonAssetERC1155Tunnel', {
    from: deployer,
    contract: 'PolygonAssetERC1155Tunnel',
    args: [
      FXCHILD.address,
      PolygonAssetERC1155.address,
      TRUSTED_FORWARDER.address,
      MAX_TRANSFER_LIMIT,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const AssetERC1155Tunnel = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('AssetERC1155Tunnel');
  // get deployer on l1
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  // Note: if redeploy, delete tunnels

  if (AssetERC1155Tunnel) {
    const fxChildTunnel = await hre.companionNetworks['l1'].deployments.read(
      'AssetERC1155Tunnel',
      'fxChildTunnel'
    );
    const fxRootTunnel = await read(
      'PolygonAssetERC1155Tunnel',
      'fxRootTunnel'
    );

    if (
      fxRootTunnel !== PolygonAssetERC1155Tunnel.address &&
      fxRootTunnel == constants.AddressZero
    ) {
      await deployments.execute(
        'PolygonAssetERC1155Tunnel',
        {from: deployer},
        'setFxRootTunnel',
        AssetERC1155Tunnel.address
      );
    }

    if (
      fxChildTunnel !== PolygonAssetERC1155Tunnel.address &&
      fxChildTunnel == constants.AddressZero
    ) {
      await hre.companionNetworks['l1'].deployments.execute(
        'AssetERC1155Tunnel',
        {from: deployerOnL1},
        'setFxChildTunnel',
        PolygonAssetERC1155Tunnel.address
      );
    }
  }
};

export default func;
func.tags = [
  'PolygonAssetERC1155Tunnel',
  'PolygonAssetERC1155Tunnel_deploy',
  'L2',
  'PolygonAsset',
];
func.dependencies = [
  'PolygonAssetERC1155',
  'FXCHILD',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
