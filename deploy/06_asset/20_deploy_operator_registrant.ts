import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('OperatorFilterSubscription', {
    from: deployer,
    contract: 'OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['operatorFilterSubscription', 'operatorFilterSubscription_deploy'];
