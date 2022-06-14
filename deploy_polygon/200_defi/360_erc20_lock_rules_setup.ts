import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;

  const sandPool = await ethers.getContract('ERC20RewardPool');

  const antiCompound = await deployments.read(
    'ERC20RewardPool',
    'timeLockClaim'
  );

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = await sandPool.owner();

  const lockPeriodInSecs = BigNumber.from(604800); // 7 days

  const lockPeriodInSecsTest = BigNumber.from(86400); // 1 days

  if (!antiCompound.eq(lockPeriodInSecs)) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPool',
        {from: currentAdmin, log: true},
        'setTimelockClaim',
        lockPeriodInSecs
      )
    );
  }

  //TODO: add missing locks
  await deployments.catchUnknownSigner(
    deployments.execute(
      'ERC20RewardPool',
      {from: currentAdmin, log: true},
      'setTimelockDeposit',
      lockPeriodInSecsTest
    )
  );

  await deployments.catchUnknownSigner(
    deployments.execute(
      'ERC20RewardPool',
      {from: currentAdmin, log: true},
      'setTimeLockWithdraw',
      lockPeriodInSecsTest
    )
  );
};

export default func;
func.tags = ['ERC20RewardPool', 'ERC20RewardPool_setup'];
func.dependencies = ['ERC20RewardPool_deploy'];
