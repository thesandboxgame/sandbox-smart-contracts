import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  // TODO: review subscriptions for Catalyst and Asset

  // Operator filter subscription
  await deploy('OperatorFilterSubscription', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/operator-filter/contracts/OperatorFilterSubscription.sol:OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'OperatorFilterSubscription',
  'OperatorFilterSubscription_deploy',
  'L2',
];
