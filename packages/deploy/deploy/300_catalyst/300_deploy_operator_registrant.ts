import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  // TODO: review subscriptions for Catalyst and Asset

  // Operator filter subscription
  await deploy('OperatorFilterRegistrant', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/asset/contracts/OperatorFilter/OperatorFilterRegistrant.sol:OperatorFilterRegistrant',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OperatorFilterRegistrant', 'L2'];
