import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const Sand = await deployments.get('PolygonSand');
  await deployments.deploy('LandOwnersSandRewardPool', {
    from: deployer,
    contract: 'SandRewardPool',
    args: [Sand.address, Sand.address, TRUSTED_FORWARDER.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['LandOwnersSandRewardPool', 'LandOwnersSandRewardPool_deploy'];
func.dependencies = ['TRUSTED_FORWARDER', 'PolygonSand_deploy'];
