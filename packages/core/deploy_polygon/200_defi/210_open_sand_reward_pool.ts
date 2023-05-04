import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const Sand = await deployments.get('PolygonSand');

  await deployments.deploy('OpenSandRewardPool', {
    from: deployer,
    contract: 'SandRewardPool',
    args: [Sand.address, Sand.address, TRUSTED_FORWARDER_V2.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2', 'PolygonSand_deploy'];
