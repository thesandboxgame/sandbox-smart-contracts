import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer, sandAdmin} = await getNamedAccounts();

  const sandPool = await ethers.getContract('OpenSandRewardPool');
  const ADMIN_ROLE = await sandPool.DEFAULT_ADMIN_ROLE();

  const antiCompound = await deployments.read(
    'OpenSandRewardPool',
    'antiCompound'
  );

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = (await sandPool.hasRole(ADMIN_ROLE, deployer))
    ? deployer
    : (await sandPool.hasRole(ADMIN_ROLE, sandAdmin))
    ? sandAdmin
    : deployer;

  const lockPeriodInSecs = BigNumber.from(604800); // 7 days

  if (!antiCompound.eq(lockPeriodInSecs)) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'OpenSandRewardPool',
        {from: currentAdmin, log: true},
        'setAntiCompoundLockPeriod',
        lockPeriodInSecs
      )
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_setup'];
func.dependencies = ['OpenSandRewardPool_deploy'];
