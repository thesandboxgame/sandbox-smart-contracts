import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetMinter = await deployments.get('PolygonAssetMinter');

  const isAssetMinterBouncer = await read(
    'PolygonAssetERC1155',
    'isBouncer',
    assetMinter.address
  );

  if (!isAssetMinterBouncer) {
    await execute(
      'PolygonAssetERC1155',
      {from: assetBouncerAdmin, log: true},
      'setBouncer',
      assetMinter.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonAssetMinter',
  'PolygonAssetMinter_setup',
  'PolygonAsset',
  'L2',
];
func.dependencies = ['PolygonAssetERC1155'];
func.skip = skipUnlessTestnet;
