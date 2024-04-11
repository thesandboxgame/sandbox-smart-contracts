import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const OperatorFilterSubscription = await deploy(
    'PolygonOperatorFilterSubscription',
    {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFilterSubscription.sol:OperatorFilterSubscription',
      log: true,
      skipIfAlreadyDeployed: true,
    }
  );

  const isRegistered = await deployments.read(
    'PolygonOperatorFilterRegistry',
    'isRegistered',
    OperatorFilterSubscription.address
  );

  if (!isRegistered) {
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
  }
};
export default func;
func.tags = [
  'PolygonOperatorFilterSubscription',
  'PolygonOperatorFilterSubscription_deploy',
];
func.dependencies = ['PolygonOperatorFilterRegistry'];
