import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const OperatorFilterLandSubscription = await deploy(
    'OperatorFilterLandSubscription',
    {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/core/src/solc_0.8/OperatorFilterer/contracts/OperatorFilterRegistrant.sol:OperatorFilterSubscription',
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
    OperatorFilterLandSubscription.address
  );

  if (!isRegistered) {
    const defaultSubscription = await deployments.read(
      'OperatorFilterLandSubscription',
      'DEFAULT_SUBSCRIPTION'
    );
    await deployments.execute(
      'OperatorFilterRegistry',
      {from: deployer},
      'registerAndCopyEntries',
      OperatorFilterLandSubscription.address,
      defaultSubscription
    );
  }
};
export default func;
func.tags = [
  'OperatorFilterLandSubscription',
  'OperatorFilterLandSubscription_deploy',
];
func.dependencies = ['OperatorFilterRegistry'];
