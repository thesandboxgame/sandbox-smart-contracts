import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('AssetMatcher', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace/contracts/exchange/AssetMatcher.sol:AssetMatcher',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['AssetMatcher', 'AssetMatcher_deploy'];
