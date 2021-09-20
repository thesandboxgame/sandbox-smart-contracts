import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read} = deployments;

  const AssetUpgrader = await deployments.get('AssetUpgrader');

  const isAssetUpgraderSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderSandSuperOperator) {
    const currentAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: currentAdmin, log: true},
      'setSuperOperator',
      AssetUpgrader.address,
      true
    );
  }

  const isAssetUpgraderGemsCatalystsRegistrySuperOperator = await read(
    'GemsCatalystsRegistry',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderGemsCatalystsRegistrySuperOperator) {
    const currentAdmin = await read('GemsCatalystsRegistry', 'getAdmin');
    await execute(
      'GemsCatalystsRegistry',
      {from: currentAdmin, log: true},
      'setSuperOperator',
      AssetUpgrader.address,
      true
    );
  }
};
export default func;
func.tags = ['AssetUpgrader', 'AssetUpgrader_setup', 'L2'];
func.dependencies = [
  'AssetUpgrader_deploy',
  'PolygonSand_deploy',
  'GemsCatalystsRegistry_deploy',
];
func.skip = skipUnlessTest; // disabled for now
