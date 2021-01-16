import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAttributesRegistryAdmin} = await getNamedAccounts();

  const registryMinter = await read('AssetAttributesRegistry', 'getMinter');
  const AssetMinter = await deployments.get('AssetMinter');
  const assetUpgraderContract = await deployments.get('AssetUpgrader');

  // if (registryMinter !== AssetMinter.address) {
  //   await execute(
  //     'AssetAttributesRegistry',
  //     {from: assetAttributesRegistryAdmin, log: true},
  //     'changeMinter',
  //     assetUpgraderContract.address
  //   );
  // }
};
export default func;
func.tags = ['AssetAttributesRegistry', 'AssetAttributesRegistry_setup'];
func.dependencies = ['AssetAttributesRegistry_deploy'];
