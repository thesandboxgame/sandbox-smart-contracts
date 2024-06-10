import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const EndpointV2 = await deployments.get('EndpointV2');

  await deploy('OFTSand', {
    from: deployer,
    contract: 'OFTSand',
    args: [
      TRUSTED_FORWARDER_V2.address,
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
func.dependencies = ['TRUSTED_FORWARDER_V2', 'EndpointV2'];
