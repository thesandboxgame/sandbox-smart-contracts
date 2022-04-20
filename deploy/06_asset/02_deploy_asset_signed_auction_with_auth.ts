import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, assetAdmin, assetAuctionFeeCollector} =
    await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const assetContract = await deployments.get('Asset');
  const authValidatorContract = await deployments.get('AuthValidator');

  await deploy('AssetSignedAuctionWithAuth', {
    from: deployer,
    contract: 'AssetSignedAuctionWithAuth',
    args: [
      assetContract.address,
      assetAdmin,
      others[0],
      assetAuctionFeeCollector,
      200,
      authValidatorContract.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['AssetSignedAuctionWithAuth', 'AssetSignedAuctionWithAuth_deploy'];
func.dependencies = ['Asset_deploy', 'AuthValidator_deploy'];
func.skip = skipUnlessTest;
