import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const sand = await deployments.get('Sand');

  await deploy('NativeMetaTransactionProcessor', {
    from: deployer,
    args: [sand.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'NativeMetaTransactionProcessor',
  'NativeMetaTransactionProcessor_deploy',
];
func.dependencies = ['Sand'];
