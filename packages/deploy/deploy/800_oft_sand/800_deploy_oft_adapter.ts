import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ZeroAddress} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();

  const Sand = await deployments.get('Sand');
  const EndpointV2 = await deployments.get('EndpointV2');

  await deploy('OFTAdapterForSand', {
    from: deployer,
    contract: 'OFTAdapterForSand',
    args: [Sand.address, EndpointV2.address, deployer, ZeroAddress, sandAdmin],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OFTAdapterForSand', 'OFTAdapterForSand_deploy'];
func.dependencies = ['Sand', 'EndpointV2'];
