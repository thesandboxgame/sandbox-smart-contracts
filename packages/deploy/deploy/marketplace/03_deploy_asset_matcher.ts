import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // TODO: to be fetched from env?
  const deployMeta = process.env.DEPLOY_META;
  const exchangeContract = deployMeta ? 'ExchangeMeta' : 'Exchange';

  const assetMatcher = await deploy('AssetMatcher', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace/src/exchange/AssetMatcher.sol:AssetMatcher',
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await deployments.execute(
    exchangeContract,
    {from: deployer},
    'setAssetMatcherContract',
    assetMatcher.address
  );
};
export default func;
func.tags = ['AssetMatcher', 'AssetMatcher_deploy'];
func.dependencies = ['Exchange'];
