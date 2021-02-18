import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { execute, read } = deployments;
  const { assetAttributesRegistryAdmin } = await getNamedAccounts();
  const currentMigrationContract = await read('AssetAttributesRegistry', 'migrationContract');
  const MigrationContract = await deployments.get('CollectionCatalystMigrations');

  if (currentMigrationContract.toLowerCase() !== MigrationContract.address.toLowerCase()) {
    await execute(
      'AssetAttributesRegistry',
      { from: assetAttributesRegistryAdmin, log: true },
      'setMigrationContract',
      MigrationContract.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['AssetAttributesRegistry', 'AssetAttributesRegistry_setup'];
func.dependencies = ['AssetAttributesRegistry_deploy'];
