import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

<<<<<<< HEAD
  const AssetMinter = await deployments.get('PolygonAssetMinter');
=======
  const AssetMinter = await deployments.get('AssetMinter');
>>>>>>> fixes in deployments
  const {gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  const isAssetMinterSuperOperator = await read(
    'GemsCatalystsRegistry',
    'isSuperOperator',
    AssetMinter.address
  );

  if (!isAssetMinterSuperOperator) {
    await execute(
      'GemsCatalystsRegistry',
      {from: gemsCatalystsRegistryAdmin, log: true},
      'setSuperOperator',
      AssetMinter.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
<<<<<<< HEAD
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_setup',
  'L2',
];
func.dependencies = [
  'PolygonGemsCatalystsRegistry_deploy',
  'PolygonAssetMinter_deploy',
];
=======
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_setup', 'L2'];
func.dependencies = ['GemsCatalystsRegistry_deploy', 'AssetMinter_deploy'];
>>>>>>> fixes in deployments
