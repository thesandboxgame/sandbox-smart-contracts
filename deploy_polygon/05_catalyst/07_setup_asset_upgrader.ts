import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const sandCurrentAdmin = await read('PolygonSand', 'getAdmin');
  const AssetUpgrader = await deployments.get('PolygonAssetUpgrader');

  const isAssetUpgraderSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderSandSuperOperator) {
    await execute(
      'PolygonSand',
      {from: sandCurrentAdmin, log: true},
      'setSuperOperator',
      AssetUpgrader.address,
      true
    );
  }

  const superOperatorRole = await read(
    'PolygonGemsCatalystsRegistry',
    'SUPER_OPERATOR_ROLE'
  );

  const isAssetUpgraderGemsCatalystsRegistrySuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    superOperatorRole,
    AssetUpgrader.address
  );

  if (!isAssetUpgraderGemsCatalystsRegistrySuperOperator) {
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: deployer, log: true},
      'grantRole',
      superOperatorRole,
      AssetUpgrader.address
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
