import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('RoyaltySplitter', {
    from: deployer,
    log: true,
    contract:
      '@sandbox-smart-contracts/royalties/contracts/RoyaltySplitter.sol:RoyaltySplitter',
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['RoyaltySplitter', 'RoyaltySplitter_deploy', 'L2'];
