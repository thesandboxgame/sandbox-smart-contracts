import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  
  await deploy('CustomRoyaltySplitter', {
    from: deployer,
    contract: 'CustomRoyaltySplitter',
    skipIfAlreadyDeployed: true,
    log: true,
  });
};
export default func;
func.tags = ['CustomRoyaltySplitter'];