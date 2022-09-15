import {DeployFunction} from 'hardhat-deploy/types';
import {fee10000th} from '../../data/assetSignedAuction';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();

  const asset = await deployments.get('Asset');
  const sandContract = await deployments.get('Sand');

  await deploy('AssetSignedAuction', {
    from: deployer,
    args: [
      asset.address,
      assetAuctionAdmin,
      sandContract.address,
      assetAuctionFeeCollector,
      fee10000th,
    ],
    contract: 'AssetSignedAuction',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['AssetSignedAuction', 'AssetSignedAuction_deploy'];
func.dependencies = ['Asset_deploy', 'Sand_deploy'];
