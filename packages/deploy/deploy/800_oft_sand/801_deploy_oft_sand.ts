import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const SandboxForwarder = await deployments.get('SandboxForwarder');
  const EndpointV2 = await deployments.get('EndpointV2');

  await deploy('OFTSand', {
    from: deployer,
    contract: 'OFTSand',
    args: [
      SandboxForwarder.address,
      sandAdmin,
      sandExecutionAdmin,
      EndpointV2.address,
      deployer,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OFTSand', 'OFTSand_deploy'];
func.dependencies = ['SandboxForwarder', 'EndpointV2'];
