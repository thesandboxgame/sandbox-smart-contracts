import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {fee10000th} from '../../data/assetSignedAuction';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();

  const assetContract = await deployments.get('Asset');
  const authValidatorContract = await deployments.get('AuthValidator');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('AssetSignedAuctionWithAuth', {
    from: deployer,
    contract: 'AssetSignedAuctionWithAuth',
    args: [
      assetContract.address,
      assetAuctionAdmin,
      TRUSTED_FORWARDER.address,
      assetAuctionFeeCollector,
      fee10000th,
      authValidatorContract.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['AssetSignedAuctionWithAuth', 'AssetSignedAuctionWithAuth_deploy'];
func.dependencies = ['AssetERC1155_deploy', 'AuthValidator_deploy'];
func.skip = skipUnlessTest;
