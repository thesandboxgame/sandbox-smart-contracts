import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const Sand = await deployments.get('PolygonSand');

  const contract = await deployments.getOrNull('OpenSandRewardPool');
  if (contract) {
    console.warn('reusing OpenSandRewardPool', contract.address);
  } else {
    await deployments.deploy('OpenSandRewardPool', {
      from: deployer,
      contract: 'SandRewardPool',
      args: [Sand.address, Sand.address, TRUSTED_FORWARDER.address],
      log: true,
    });
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_deploy'];
func.dependencies = ['TRUSTED_FORWARDER', 'PolygonSand_deploy'];
func.skip = async () => !isInTags(hre, 'L2');
