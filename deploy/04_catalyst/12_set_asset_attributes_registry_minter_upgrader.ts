import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAttributesRegistryAdmin} = await getNamedAccounts();

  const registryMinter = await read('AssetAttributesRegistry', 'getMinter');
  const registryUpgrader = await read('AssetAttributesRegistry', 'getUpgrader');
  const AssetMinter = await deployments.get('AssetMinter');
  const AssetUpgrader = await deployments.get('AssetUpgrader');

  if (registryMinter !== AssetMinter.address) {
    await execute(
      'AssetAttributesRegistry',
      {from: assetAttributesRegistryAdmin, log: true},
      'changeMinter',
      AssetMinter.address
    );
  }

  if (registryUpgrader !== AssetUpgrader.address) {
    await execute(
      'AssetAttributesRegistry',
      {from: assetAttributesRegistryAdmin, log: true},
      'changeUpgrader',
      AssetUpgrader.address
    );
  }
};
export default func;
func.tags = ['AssetAttributesRegistry', 'AssetAttributesRegistry_setup'];
func.dependencies = [
  'AssetAttributesRegistry_deploy',
  'AssetMinter_deploy',
  'AssetUpgrader_deploy',
];
