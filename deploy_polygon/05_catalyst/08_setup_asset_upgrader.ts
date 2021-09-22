import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read} = deployments;

  const AssetUpgrader = await deployments.get('PolygonAssetUpgrader');

  const isAssetUpgraderSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderSandSuperOperator) {
    const currentAdmin = await read('PolygonSand', 'getAdmin');
    await execute(
      'PolygonSand',
      {from: currentAdmin, log: true},
      'setSuperOperator',
      AssetUpgrader.address,
      true
    );
  }

  const isAssetUpgraderGemsCatalystsRegistrySuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderGemsCatalystsRegistrySuperOperator) {
    const currentAdmin = await read('PolygonGemsCatalystsRegistry', 'getAdmin');
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: currentAdmin, log: true},
      'setSuperOperator',
      AssetUpgrader.address,
      true
    );
  }
};
export default func;
func.tags = ['PolygonAssetUpgrader', 'PolygonAssetUpgrader_setup', 'L2'];
func.dependencies = [
  'PolygonAssetUpgrader_deploy',
  'PolygonSand_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
];
func.skip = skipUnlessTest; // disabled for now
