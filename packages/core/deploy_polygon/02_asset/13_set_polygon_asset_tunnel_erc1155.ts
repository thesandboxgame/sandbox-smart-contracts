import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read} = deployments;
  const {deployer} = await getNamedAccounts();

  const PolygonAssetERC1155Tunnel = await deployments.get(
    'PolygonAssetERC1155Tunnel'
  );

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

    if (fxRootTunnel == constants.AddressZero) {
      await deployments.execute(
        'PolygonAssetERC1155Tunnel',
        {from: deployer, log: true},
        'setFxRootTunnel',
        AssetERC1155Tunnel.address
      );
    }

    if (fxChildTunnel == constants.AddressZero) {
      await hre.companionNetworks['l1'].deployments.execute(
        'AssetERC1155Tunnel',
        {from: deployerOnL1, log: true},
        'setFxChildTunnel',
        PolygonAssetERC1155Tunnel.address
      );
    }
  }
};

export default func;
func.tags = [
  'PolygonAssetERC1155Tunnel',
  'PolygonAssetERC1155Tunnel_setup',
  'L2',
  'PolygonAsset',
];
func.dependencies = ['PolygonAssetERC1155Tunnel_deploy'];
func.skip = skipUnlessTestnet;
func.runAtTheEnd = true;
