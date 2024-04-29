import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {landAdmin} = await getNamedAccounts();

  const RoyaltyManager = await deployments.get('RoyaltyManager');
  const OperatorFilterLandSubscription = await deployments.get(
    'OperatorFilterLandSubscription'
  );
  const PolygonOperatorFilterRegistry = await deployments.get(
    'PolygonOperatorFilterRegistry'
  );

  await execute(
    'PolygonLand',
    {from: landAdmin, log: true},
    'setRoyaltyManager',
    RoyaltyManager.address
  );

  console.log(OperatorFilterLandSubscription.address);
  console.log(PolygonOperatorFilterRegistry.address);

  await deployments.execute(
    'PolygonLand',
    {from: landAdmin, log: true},
    'setOperatorRegistry',
    PolygonOperatorFilterRegistry.address
  );

  await deployments.execute(
    'PolygonLand',
    {from: landAdmin, log: true},
    'register',
    OperatorFilterLandSubscription.address,
    true
  );
};

export default func;

func.tags = ['PolygonLand', 'PolygonLand_setup'];
func.dependencies = [
  'OperatorFilterLandSubscription_deploy',
  'PolygonOperatorFilterRegistry',
  'PolygonLand_deploy',
  'PolygonLandV2',
  'PolygonLandV3',
];
