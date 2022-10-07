import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer} = await getNamedAccounts();

  const AssetERC1155Tunnel = await deployments.get('AssetERC1155Tunnel');
  const currentAdmin = await read('Asset', 'getAdmin');
  await catchUnknownSigner(
    execute(
      'Asset',
      {from: currentAdmin, log: true},
      'setPredicate',
      AssetERC1155Tunnel.address
    )
  );

  const PolygonAssetERC1155Tunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonAssetERC1155Tunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (PolygonAssetERC1155Tunnel) {
    const fxChildTunnel = await deployments.read(
      'AssetERC1155Tunnel',
      'fxChildTunnel'
    );
    const fxRootTunnel = await hre.companionNetworks['l2'].deployments.read(
      'PolygonAssetERC1155Tunnel',
      'fxRootTunnel'
    );
    if (fxRootTunnel == constants.AddressZero) {
      await hre.companionNetworks['l2'].deployments.execute(
        'PolygonAssetERC1155Tunnel',
        {from: deployerOnL2, log: true},
        'setFxRootTunnel',
        AssetERC1155Tunnel.address
      );
    }
    if (fxChildTunnel == constants.AddressZero) {
      await deployments.execute(
        'AssetERC1155Tunnel',
        {from: deployer, log: true},
        'setFxChildTunnel',
        PolygonAssetERC1155Tunnel.address
      );
    }
  }
};

export default func;
func.tags = ['AssetERC1155Tunnel', 'AssetERC1155Tunnel_setup', 'L1'];
func.runAtTheEnd = true;
func.dependencies = ['AssetERC1155Tunnel_deploy'];
func.skip = skipUnlessTestnet;
func.runAtTheEnd = true;
