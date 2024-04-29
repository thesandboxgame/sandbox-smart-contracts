import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, catchUnknownSigner, execute} = deployments;

  const {deployer, sandAdmin} = await getNamedAccounts();

  // Operator filter subscription
  await deploy('OperatorFilterLandSubscription', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFilterSubscription.sol:OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const owner = await read('OperatorFilterLandSubscription', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'OperatorFilterLandSubscription',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};
export default func;
func.tags = [
  'OperatorFilterLandSubscription',
  'OperatorFilterLandSubscription_deploy',
  'L2',
];
