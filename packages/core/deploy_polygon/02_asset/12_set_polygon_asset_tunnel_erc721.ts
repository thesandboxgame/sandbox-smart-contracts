import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read} = deployments;
  const {deployer} = await getNamedAccounts();

  const PolygonAssetERC721Tunnel = await deployments.get(
    'PolygonAssetERC721Tunnel'
  );

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

    if (fxRootTunnel == constants.AddressZero) {
      await deployments.execute(
        'PolygonAssetERC721Tunnel',
        {from: deployer, log: true},
        'setFxRootTunnel',
        AssetERC721Tunnel.address
      );
    }

    if (fxChildTunnel == constants.AddressZero) {
      await hre.companionNetworks['l1'].deployments.execute(
        'AssetERC721Tunnel',
        {from: deployerOnL1, log: true},
        'setFxChildTunnel',
        PolygonAssetERC721Tunnel.address
      );
    }
  }
};

export default func;
func.tags = [
  'PolygonAssetERC721Tunnel',
  'PolygonAssetERC721Tunnel_setup',
  'L2',
  'PolygonAsset',
];
func.dependencies = ['PolygonAssetERC721Tunnel_deploy'];
func.skip = skipUnlessTestnet;
func.runAtTheEnd = true;
