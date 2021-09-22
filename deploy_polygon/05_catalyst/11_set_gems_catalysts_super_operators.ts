import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const AssetMinter = await deployments.get('PolygonAssetMinter');
  const {gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  const isAssetMinterSuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'isSuperOperator',
    AssetMinter.address
  );

  if (!isAssetMinterSuperOperator) {
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: gemsCatalystsRegistryAdmin, log: true},
      'setSuperOperator',
      AssetMinter.address,
      true
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
func.skip = skipUnlessTest; // disabled for now
