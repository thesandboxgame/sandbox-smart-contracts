import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const Asset = await deployments.get('PolygonAsset');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const OldCatalystRegistry = await deployments.get('OldCatalystRegistry');

  const {
    deployer,
    collectionCatalystMigrationsAdmin,
  } = await getNamedAccounts();
  await deploy(`CollectionCatalystMigrations`, {
    from: deployer,
    log: true,
    args: [
      Asset.address,
      AssetAttributesRegistry.address,
      OldCatalystRegistry.address,
      collectionCatalystMigrationsAdmin,
    ],
  });
};
export default func;
func.tags = [
  'CollectionCatalystMigrations',
  'CollectionCatalystMigrations',
  'L2',
];
func.dependencies = [
  'OldCatalystRegistry_deploy',
  'PolygonAsset_deploy',
  'AssetAttributesRegistry_deploy',
];
func.skip = skipUnlessTest; // disabled for now
