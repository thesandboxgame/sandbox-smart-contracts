import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();

  const contributionCalculator = await ethers.getContract(
    'LandContributionCalculator'
  );

  const owner = await contributionCalculator.owner();

  if (owner != sandAdmin) {
    await deployments.execute(
      'LandContributionCalculator',
      {from: owner, log: true},
      'transferOwnership',
      sandAdmin
    );
  }
};

export default func;
func.tags = ['LandContributionCalculator', 'LandContributionCalculator_setup'];
func.dependencies = ['LandContributionCalculator_deploy'];
func.runAtTheEnd = true;
