import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const AssetUpgrader = await deployments.get('PolygonAssetUpgrader');

  const isAssetUpgraderSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderSandSuperOperator) {
<<<<<<< HEAD
=======
    const currentAdmin = await read('PolygonSand', 'getAdmin');
>>>>>>> fixing deployments
    await execute(
      'PolygonSand',
      {from: deployer, log: true},
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
    //const currentAdmin = await read('PolygonGemsCatalystsRegistry', 'getAdmin');
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
