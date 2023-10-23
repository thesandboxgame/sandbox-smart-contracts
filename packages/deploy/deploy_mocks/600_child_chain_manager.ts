import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy('CHILD_CHAIN_MANAGER', {
    from: deployer,
    contract: 'FakeChildChainManager',
    log: true,
  });
};
export default func;
func.tags = ['CHILD_CHAIN_MANAGER'];
