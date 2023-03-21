import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const OperatorFilterSubscription = await deploy(
    'OperatorFilterSubscription',
    {
      from: deployer,
      contract: 'OperatorFilterSubscription',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [],
        },
        upgradeIndex: 0,
      },
      log: true,
      skipIfAlreadyDeployed: true,
    }
  );

  const isRegistered = await deployments.read(
    'OperatorFilterRegistry',
    'isRegistered',
    OperatorFilterSubscription.address
  );

  if (!isRegistered) {
    const defaultSubscription = await deployments.read(
      'OperatorFilterSubscription',
      'DEFAULT_SUBSCRIPTION'
    );
    await deployments.execute(
      'OperatorFilterRegistry',
      {from: deployer},
      'registerAndCopyEntries',
      OperatorFilterSubscription.address,
      defaultSubscription
    );
  }
};
export default func;
func.tags = ['operatorFilterSubscription', 'operatorFilterSubscription_deploy'];
func.dependencies = ['OperatorFilterRegistry'];
