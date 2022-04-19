import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const Asset = await deployments.get('Asset');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const OldCatalystRegistry = await deployments.get('OldCatalystRegistry');

  const {deployer, collectionCatalystMigrationsAdmin} =
    await getNamedAccounts();
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
func.tags = ['CollectionCatalystMigrations', 'CollectionCatalystMigrations'];
func.dependencies = [
  'OldCatalystRegistry_deploy',
  'Asset_deploy',
  'AssetAttributesRegistry_deploy',
];
