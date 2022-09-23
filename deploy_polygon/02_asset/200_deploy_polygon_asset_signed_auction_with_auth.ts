import {DeployFunction} from 'hardhat-deploy/types';
import {fee10000th} from '../../data/assetSignedAuction';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();
  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const authValidatorContract = await deployments.get('PolygonAuthValidator');

  await deploy('PolygonAssetERC1155SignedAuctionWithAuth', {
    from: deployer,
    args: [
      PolygonAssetERC1155.address,
      assetAuctionAdmin,
      TRUSTED_FORWARDER_V2.address,
      assetAuctionFeeCollector,
      fee10000th,
      authValidatorContract.address,
    ],
    contract: 'AssetSignedAuctionWithAuth',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonAssetERC1155SignedAuctionWithAuth',
  'PolygonAssetERC1155SignedAuctionWithAuth_deploy',
];
func.dependencies = [
  'PolygonAssetERC1155_deploy',
  'PolygonAuthValidator_deploy',
];
func.skip = skipUnlessTestnet;
