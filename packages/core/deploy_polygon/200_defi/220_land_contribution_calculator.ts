import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Land = await deployments.get('PolygonLand');
  await deployments.deploy('LandContributionCalculator', {
    from: deployer,
    args: [Land.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['LandContributionCalculator', 'LandContributionCalculator_deploy'];
func.dependencies = ['PolygonLand_deploy'];
