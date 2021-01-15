import hre from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, getChainId, upgrades, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  const chainId = await getChainId();
};

export default func;
if (require.main === module) {
  func(hre);
}
