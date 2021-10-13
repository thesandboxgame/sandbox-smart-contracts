import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetMinter = await deployments.get('PolygonAssetMinter');

  const isAssetMinterBouncer = await read(
    'PolygonAsset',
    'isBouncer',
    assetMinter.address
  );

  if (!isAssetMinterBouncer) {
    await execute(
      'PolygonAsset',
      {from: assetBouncerAdmin, log: true},
      'setBouncer',
      assetMinter.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['PolygonAssetMinter', 'PolygonAssetMinter_setup'];
func.dependencies = ['PolygonAsset'];
