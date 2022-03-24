import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const AssetMinter = await deployments.get('PolygonAssetMinter');
  const {gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  const superOperatorRole = await read(
    'PolygonGemsCatalystsRegistry',
    'SUPER_OPERATOR_ROLE'
  );

  const isAssetMinterSuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    superOperatorRole,
    AssetMinter.address
  );

  if (!isAssetMinterSuperOperator) {
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: gemsCatalystsRegistryAdmin, log: true},
      'grantRole',
      superOperatorRole,
      AssetMinter.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_setup',
  'L2',
];
func.dependencies = [
  'PolygonGemsCatalystsRegistry_deploy',
  'PolygonAssetMinter_deploy',
];
