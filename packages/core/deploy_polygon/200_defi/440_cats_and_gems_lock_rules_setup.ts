import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from 'ethers';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;

  const loop = async (
    CatOrGems: typeof catalysts | typeof gems,
    contractName: string
  ) => {
    for (const i of CatOrGems) {
      const contract = `${contractName}_${i.symbol}`;

      const pool = await ethers.getContract(contract);

      const antiCompound = await deployments.read(contract, 'timeLockClaim');

      // check who has Admin role: deployer or sandAdmin
      const currentAdmin = await pool.owner();

      const lockPeriodInSecs = BigNumber.from(604800); // 7 days

      // initialize setAmountLockClaim disabled
      const amountLockClaim = 0;
      const isEnabled = false;

      if (!antiCompound.eq(lockPeriodInSecs)) {
        await deployments.catchUnknownSigner(
          deployments.execute(
            contract,
            {from: currentAdmin, log: true},
            'setTimelockClaim',
            lockPeriodInSecs
          )
        );
      }

      await deployments.catchUnknownSigner(
        deployments.execute(
          contract,
          {from: currentAdmin, log: true},
          'setTimelockDeposit',
          lockPeriodInSecs
        )
      );

      await deployments.catchUnknownSigner(
        deployments.execute(
          contract,
          {from: currentAdmin, log: true},
          'setTimeLockWithdraw',
          lockPeriodInSecs
        )
      );

      await deployments.catchUnknownSigner(
        deployments.execute(
          contract,
          {from: currentAdmin, log: true},
          'setAmountLockClaim',
          amountLockClaim,
          isEnabled
        )
      );
    }
  };

  await loop(catalysts, 'CatalystRewardPool');

  await loop(gems, 'GemRewardPool');
};

export default func;
func.tags = ['CatsGemsRewardPool', 'CatsGemsRewardPool_setup'];
func.dependencies = ['CatsGemsRewardPool_deploy'];
