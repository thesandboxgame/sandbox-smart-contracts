import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {execute, read} = deployments;

  const DeployerBatch = await deployments.get('DeployerBatch');

  let currentBouncerAdmin;
  try {
    currentBouncerAdmin = await read('Asset', 'getBouncerAdmin');
  } catch (e) {
    // no admin
  }

  let deployerBatchIsBouncer;
  try {
    deployerBatchIsBouncer = await read(
      'Asset',
      'isBouncer',
      DeployerBatch.address
    );
  } catch (e) {
    //
  }
  if (deployerBatchIsBouncer) {
    await execute(
      'Asset',
      {from: currentBouncerAdmin, log: true},
      'setBouncer',
      DeployerBatch.address,
      true
    );
  }

  // PREDICATE

  let currentAdmin;
  try {
    currentAdmin = await read('Asset', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    await execute(
      'Asset',
      {from: currentAdmin, log: true},
      'setPredicate',
      DeployerBatch.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['DeployerBatch', 'DeployerBatch_setup'];
func.dependencies = ['Asset', 'DeployerBatch_deploy'];

func.skip = async () => true; // TODO
