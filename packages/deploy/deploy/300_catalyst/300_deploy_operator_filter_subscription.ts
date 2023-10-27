import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, catchUnknownSigner, execute} = deployments;

  const {deployer, sandAdmin} = await getNamedAccounts();

  // TODO: review subscriptions for Catalyst and Asset

  // Operator filter subscription
  await deploy('OperatorFilterSubscription', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFilterSubscription.sol:OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const owner = await read('OperatorFilterSubscription', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'OperatorFilterSubscription',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};
export default func;
func.tags = [
  'OperatorFilterSubscription',
  'OperatorFilterSubscription_deploy',
  'L2',
];
