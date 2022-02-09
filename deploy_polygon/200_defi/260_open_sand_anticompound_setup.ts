import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const antiCompound = await deployments.read(
    'OpenSandRewardPool',
    'antiCompound'
  );

  const lockPeriodInSecs = BigNumber.from(300);

  if (!antiCompound.eq(lockPeriodInSecs)) {
    await deployments.execute(
      'OpenSandRewardPool',
      {from: deployer, log: true},
      'setAntiCompoundLockPeriod',
      lockPeriodInSecs
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_setup', 'L2'];
func.dependencies = ['OpenSandRewardPool_deploy'];
