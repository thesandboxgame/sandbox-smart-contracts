import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestOrL2} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('MockLandWithMint', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockLandWithMint', 'MockLandWithMint_deploy', 'L2'];
func.skip = skipUnlessTestOrL2;
