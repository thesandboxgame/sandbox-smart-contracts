import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const AssetERC721Tunnel = await deployments.get('AssetERC721Tunnel');

  const PolygonAssetERC721Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonAssetERC721Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (PolygonAssetERC721Tunnel) {
    const fxChildTunnel = await deployments.read(
      'AssetERC721Tunnel',
      'fxChildTunnel'
    );
    const fxRootTunnel = await hre.companionNetworks['l2'].deployments.read(
      'PolygonAssetERC721Tunnel',
      'fxRootTunnel'
    );
    if (fxRootTunnel == constants.AddressZero) {
      await hre.companionNetworks['l2'].deployments.execute(
        'PolygonAssetERC721Tunnel',
        {from: deployerOnL2, log: true},
        'setFxRootTunnel',
        AssetERC721Tunnel.address
      );
    }
    if (fxChildTunnel == constants.AddressZero) {
      await deployments.execute(
        'AssetERC721Tunnel',
        {from: deployer, log: true},
        'setFxChildTunnel',
        PolygonAssetERC721Tunnel.address
      );
    }
  }
};

export default func;
func.tags = ['AssetERC721Tunnel', 'AssetERC721Tunnel_setup', 'L1'];
func.dependencies = ['AssetERC721Tunnel_deploy'];
func.skip = skipUnlessTestnet;
func.runAtTheEnd = true;
