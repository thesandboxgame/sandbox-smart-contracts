import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy('SandboxForwarder', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/sandbox-forwarder/contracts/SandboxForwarder.sol:SandboxForwarder',
    log: true,
  });
};
export default func;
func.tags = ['SandboxForwarder'];
