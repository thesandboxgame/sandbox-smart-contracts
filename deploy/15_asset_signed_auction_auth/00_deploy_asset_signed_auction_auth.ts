import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, assetAdmin, assetAuctionFeeCollector} = await getNamedAccounts();
	const others = await getUnnamedAccounts();

  const assetContract = await deployments.get('Asset');

  await deploy('AssetSignedAuctionAuth', {
    from: deployer,
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
func.tags = ['AssetSignedAuctionAuth', 'AssetSignedAuctionAuth_deploy'];
