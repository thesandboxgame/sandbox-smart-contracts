import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAttributesRegistryAdmin} = await getNamedAccounts();

  const registryMinter = await read(
    'PolygonAssetAttributesRegistry',
    'getMinter'
  );
  const registryUpgrader = await read(
    'PolygonAssetAttributesRegistry',
    'getUpgrader'
  );
  const AssetMinter = await deployments.get('PolygonAssetMinter');
  const AssetUpgrader = await deployments.getOrNull('PolygonAssetUpgrader');

  if (registryMinter !== AssetMinter.address) {
    await execute(
      'PolygonAssetAttributesRegistry',
      {from: assetAttributesRegistryAdmin, log: true},
      'changeMinter',
      AssetMinter.address
    );
  }
  if (AssetUpgrader) {
    if (registryUpgrader !== AssetUpgrader.address) {
      await execute(
        'PolygonAssetAttributesRegistry',
        {from: assetAttributesRegistryAdmin, log: true},
        'changeUpgrader',
        AssetUpgrader.address
      );
    }
  }
};
export default func;
func.tags = [
  'PolygonAssetAttributesRegistry',
  'PolygonAssetAttributesRegistry_setup',
  'L2',
];
func.dependencies = [
  'PolygonAssetAttributesRegistry_deploy',
  'PolygonAssetMinter_deploy',
];
