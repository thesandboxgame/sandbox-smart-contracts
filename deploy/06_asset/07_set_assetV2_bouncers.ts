import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetBouncerAdmin} = await getNamedAccounts();
  const assetMinter = await deployments.get('AssetMinter');
  const catalystMinter = await deployments.get('OldCatalystMinter');
  const isAssetMinterBouncer = await read(
    'Asset',
    'isBouncer',
    assetMinter.address
  );
  const isCatalystMinterBouncer = await read(
    'Asset',
    'isBouncer',
    catalystMinter.address
  );

  if (!isAssetMinterBouncer) {
    await execute(
      'Asset',
      {from: assetBouncerAdmin, log: true},
      'setBouncer',
      assetMinter.address,
      true
    );
  }
  // @review do we want this on new asset, or just for testing?
  // probably need to set up a dummy-asset on hardhat network
  if (!isCatalystMinterBouncer) {
    await execute(
      'Asset',
      {from: assetBouncerAdmin, log: true},
      'setBouncer',
      catalystMinter.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['AssetV2', 'AssetV2_setup'];
func.dependencies = ['AssetV2_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // disabled for now
// TODO should move it as part of catalyst deploy scripts folder
