import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer, gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  const sandCurrentAdmin = await read('PolygonSand', 'getAdmin');
  const AssetUpgrader = await deployments.get('PolygonAssetUpgrader');

  const isAssetUpgraderSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    AssetUpgrader.address
  );

  if (!isAssetUpgraderSandSuperOperator) {
    await catchUnknownSigner(
      execute(
        'PolygonSand',
        {from: sandCurrentAdmin, log: true},
        'setSuperOperator',
        AssetUpgrader.address,
        true
      )
    );
  }

  const superOperatorRole = await read(
    'PolygonGemsCatalystsRegistry',
    'SUPER_OPERATOR_ROLE'
  );

  // see if already has role
  const isAssetUpgraderGemsCatalystsRegistrySuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    superOperatorRole,
    AssetUpgrader.address
  );

  // if does not have role, get someone with the DEFAULT_ADMIN_ROLE to grantRole to AssetUpgrader
  let admin = deployer;
  const defaultAdminRole = await read(
    'PolygonGemsCatalystsRegistry',
    'DEFAULT_ADMIN_ROLE'
  );

  const isDeployerAdmin = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    defaultAdminRole,
    deployer
  );

  if (!isDeployerAdmin) {
    const isNewAdmin = await read(
      'PolygonGemsCatalystsRegistry',
      'hasRole',
      defaultAdminRole,
      gemsCatalystsRegistryAdmin
    );
    if (isNewAdmin) {
      admin = gemsCatalystsRegistryAdmin;
    }
  }

  if (!isAssetUpgraderGemsCatalystsRegistrySuperOperator) {
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: admin, log: true},
      'grantRole',
      superOperatorRole,
      AssetUpgrader.address
    );
  }
};
export default func;
func.tags = ['PolygonAssetUpgrader_setup', 'L2'];
func.runAtTheEnd = true;
func.dependencies = [
  'PolygonAssetUpgrader_deploy',
  'PolygonSand_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
];
