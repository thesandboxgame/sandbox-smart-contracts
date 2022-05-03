import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    assetAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const assetContract = await deployments.get('PolygonAssetERC1155');

  await deploy('AssetSignedAuctionAuth', {
    from: deployer,
    contract: 'AssetSignedAuctionAuth',
    args: [
      assetContract.address,
      assetAdmin,
      others[0],
      assetAuctionFeeCollector,
      200,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'AssetSignedAuctionAuth',
  'AssetSignedAuctionAuth_deploy',
  'PolygonAsset',
  'L2',
];
func.dependencies = ['PolygonAssetERC1155_deploy'];
func.skip = skipUnlessTestnet;
