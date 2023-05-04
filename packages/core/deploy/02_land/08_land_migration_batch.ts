import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, landMigrationBatchExecutor} = await getNamedAccounts();

  await deploy('LandMigrationBatch', {
    from: deployer,
    contract: 'Batch',
    args: [landMigrationBatchExecutor],
    skipIfAlreadyDeployed: true,
    log: true,
  });
};

export default func;
func.tags = ['LandMigrationBatch', 'LandMigrationBatch_deploy'];
func.dependencies = [];
