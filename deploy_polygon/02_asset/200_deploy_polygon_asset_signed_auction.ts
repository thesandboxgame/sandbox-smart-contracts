import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();
  const fee10000th = 500;
  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const PolygonSand = await deployments.get('PolygonSand');

  await deploy('PolygonAssetERC1155SignedAuction', {
    from: deployer,
    args: [
      PolygonAssetERC1155.address,
      assetAuctionAdmin,
      PolygonSand.address,
      assetAuctionFeeCollector,
      fee10000th,
    ],
    contract: 'AssetSignedAuction',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonAssetERC1155SignedAuction',
  'PolygonAssetERC1155SignedAuction_deploy',
];
func.dependencies = ['PolygonAssetERC721_deploy', 'PolygonAssetERC1155_deploy', 'PolygonSand_deploy'];
func.skip = skipUnlessTestnet;
