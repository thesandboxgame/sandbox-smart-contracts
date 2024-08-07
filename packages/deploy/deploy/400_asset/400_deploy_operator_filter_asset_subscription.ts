import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, catchUnknownSigner, execute} = deployments;

  const {deployer, sandAdmin} = await getNamedAccounts();

  // Operator filter subscription
  await deploy('OperatorFilterAssetSubscription', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFilterSubscription.sol:OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const owner = await read('OperatorFilterAssetSubscription', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'OperatorFilterAssetSubscription',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};
export default func;
func.tags = [
  'OperatorFilterAssetSubscription',
  'OperatorFilterAssetSubscription_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
