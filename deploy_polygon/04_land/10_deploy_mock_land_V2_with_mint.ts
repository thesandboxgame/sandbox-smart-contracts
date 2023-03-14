import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('MockLandV2WithMint', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockLandV2WithMint', 'MockLandV2WithMint_deploy', 'L2'];
func.skip = skipUnlessTest;
