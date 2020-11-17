import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {log, execute, read} = deployments;
  const {assetAdmin, assetBouncerAdmin} = await getNamedAccounts();

  const currentAdmin = await read('Asset', 'getAdmin');
  if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
    await execute(
      'Asset',
      {from: currentAdmin, log: true},
      'changeAdmin',
      assetAdmin
    );
  }

  const currentBouncerAdmin = await read('Asset', 'getBouncerAdmin');
  if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
    log('setting Sand Execution Admin');
    await execute(
      'Asset',
      {from: currentBouncerAdmin, log: true},
      'changeBouncerAdmin',
      assetBouncerAdmin
    );
  }
};

export default func;
func.runAtTheEnd = true;
func.dependencies = ['Asset'];
