import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {assetAdmin, assetBouncerAdmin} = await getNamedAccounts();

  const DeployerBatch = await deployments.get('DeployerBatch');

  let currentAdmin;
  try {
    currentAdmin = await read('NewAsset', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
      await execute(
        'NewAsset',
        {from: currentAdmin, log: true},
        'changeAdmin',
        assetAdmin
      );
    }
  }

  let currentBouncerAdmin;
  try {
    currentBouncerAdmin = await read('NewAsset', 'getBouncerAdmin');
  } catch (e) {
    // no admin
  }
  if (currentBouncerAdmin) {
    if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
      await execute(
        'NewAsset',
        {from: currentAdmin, log: true},
        'changeBouncerAdmin',
        assetBouncerAdmin
      );
    }
  }

  let deployerBatchIsBouncer;
  try {
    deployerBatchIsBouncer = await read(
      'NewAsset',
      'isBouncer',
      DeployerBatch.address
    );
  } catch (e) {
    //
  }
  if (!deployerBatchIsBouncer) {
    // Need to execute setBouncer in order for DeployerBatch to be able to mint
    await execute(
      'NewAsset',
      {from: assetBouncerAdmin, log: true},
      'setBouncer',
      DeployerBatch.address,
      true
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['NewAsset', 'NewAsset_setup'];
func.dependencies = ['NewAsset_deploy', 'DeployerBatch_deploy '];
