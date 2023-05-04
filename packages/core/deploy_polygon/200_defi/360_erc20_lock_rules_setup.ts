import {BigNumber} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;

  const sandPool = await ethers.getContract('ERC20RewardPoolV2');

  const antiCompound = await deployments.read(
    'ERC20RewardPoolV2',
    'timeLockClaim'
  );

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = await sandPool.owner();

  const lockPeriodInSecs = BigNumber.from(604800); // 7 days

  // initialize setAmountLockClaim disabled
  const amountLockClaim = 0;
  const isEnabled = false;

  if (!antiCompound.eq(lockPeriodInSecs)) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPoolV2',
        {from: currentAdmin, log: true},
        'setTimelockClaim',
        lockPeriodInSecs
      )
    );
  }

  await deployments.catchUnknownSigner(
    deployments.execute(
      'ERC20RewardPoolV2',
      {from: currentAdmin, log: true},
      'setTimelockDeposit',
      lockPeriodInSecs
    )
  );

  await deployments.catchUnknownSigner(
    deployments.execute(
      'ERC20RewardPoolV2',
      {from: currentAdmin, log: true},
      'setTimeLockWithdraw',
      lockPeriodInSecs
    )
  );

  await deployments.catchUnknownSigner(
    deployments.execute(
      'ERC20RewardPoolV2',
      {from: currentAdmin, log: true},
      'setAmountLockClaim',
      amountLockClaim,
      isEnabled
    )
  );
};

export default func;
func.tags = ['ERC20RewardPool', 'ERC20RewardPool_setup'];
func.dependencies = ['ERC20RewardPool_deploy'];
func.skip = skipUnlessTestnet;
