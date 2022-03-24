import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');
  const maxGasLimit = 500;
  const limits = [5, 10, 20, 90, 340];

  const PolygonAssetERC721Tunnel = await deploy('PolygonAssetERC721Tunnel', {
    from: deployer,
    contract: 'PolygonAssetERC721Tunnel',
    args: [
      FXCHILD.address,
      PolygonAssetERC721.address,
      TRUSTED_FORWARDER.address,
      maxGasLimit,
      limits,
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

  if (AssetERC721Tunnel) {
    await hre.companionNetworks['l1'].deployments.execute(
      'AssetERC721Tunnel',
      {from: deployerOnL1},
      'setFxChildTunnel',
      PolygonAssetERC721Tunnel.address
    );
    await deployments.execute(
      'PolygonAssetERC721Tunnel',
      {from: deployer},
      'setFxRootTunnel',
      AssetERC721Tunnel.address
    );
  }

  // TODO: add MINTER_ROLE on L2
};

export default func;
func.tags = [
  'PolygonAssetERC721Tunnel',
  'PolygonAssetERC721Tunnel_deploy',
  'L2',
];
func.dependencies = ['PolygonAssetERC721', 'FXCHILD'];
func.skip = skipUnlessTestnet;
