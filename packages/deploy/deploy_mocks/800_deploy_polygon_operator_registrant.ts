import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const OperatorFilterSubscription = await deploy(
    'PolygonOperatorFilterSubscription',
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

  const defaultSubscription = await deployments.read(
    'PolygonOperatorFilterSubscription',
    'DEFAULT_SUBSCRIPTION'
  );
  await deployments.execute(
    'PolygonOperatorFilterRegistry',
    {from: deployer},
    'registerAndCopyEntries',
    OperatorFilterSubscription.address,
    defaultSubscription
  );
};
export default func;
func.tags = [
  'OperatorFilterLandSubscription',
  'OperatorFilterLandSubscription_deploy',
];
func.dependencies = ['PolygonOperatorFilterRegistry'];
