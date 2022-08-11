import {constants} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');

  const MAX_TRANSFER_LIMIT = 20;

  await deploy('PolygonAssetERC721Tunnel', {
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
