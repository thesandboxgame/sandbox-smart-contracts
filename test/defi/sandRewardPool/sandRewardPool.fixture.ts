import {getUnnamedAccounts} from 'hardhat';
import {setupUsers, toWei, withSnapshot} from '../../utils';
import {BigNumber, BigNumberish, Contract} from 'ethers';

export const setupSandRewardPoolTest = withSnapshot([], async function (hre) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('RewardCalculatorMock', {from: deployer});
  const rewardCalculatorMock = await ethers.getContract(
    'RewardCalculatorMock',
    deployer
  );
  await deployments.deploy('RewardToken', {
    from: deployer,
    contract: 'ERC20Mintable',
    args: ['RewardToken', 'RTK'],
  });
  const rewardToken = await ethers.getContract('RewardToken', deployer);
  await deployments.deploy('StakeToken', {
    from: deployer,
    contract: 'ERC20Mintable',
    args: ['StakeToken', 'STK'],
  });
  const stakeToken = await ethers.getContract('StakeToken', deployer);

  await deployments.deploy('TestMetaTxForwarder', {
    from: deployer,
  });
  const trustedForwarder = await ethers.getContract('TestMetaTxForwarder');

  await deployments.deploy('SandRewardPool', {
    from: deployer,
    args: [stakeToken.address, rewardToken.address, trustedForwarder.address],
  });
  const contract = await ethers.getContract('SandRewardPool', deployer);
  await contract.setRewardCalculator(rewardCalculatorMock.address, false);
  const totalRewardMinted = toWei(10000);
  await rewardToken.mint(contract.address, totalRewardMinted);
  const others = await getUnnamedAccounts();

  const getUsers = async (cant: number, initialStake = 1000000) => {
    const users = await setupUsers(others.slice(0, cant), {
      reward: rewardToken,
      stake: stakeToken,
      pool: contract,
    });
    for (const o of users) {
      await o.stake.mint(o.address, initialStake);
      await o.stake.approve(contract.address, initialStake);
    }
    return users;
  };

  return {
    totalRewardMinted,
    contract,
    stakeToken,
    rewardToken,
    rewardCalculatorMock,
    deployer,
    setRewardAndStake: async (
      reward: BigNumberish,
      contract: Contract,
      stake: BigNumberish
    ) => {
      await rewardCalculatorMock.setReward(reward);
      await contract.stake(stake);
    },
    balances: async (
      user: string,
      prev: {stake: BigNumberish; reward: BigNumberish} = {stake: 0, reward: 0}
    ) => {
      return {
        stake: BigNumber.from(await stakeToken.balanceOf(user)).sub(prev.stake),
        reward: BigNumber.from(await rewardToken.balanceOf(user)).sub(
          prev.reward
        ),
      };
    },
    getUsers,
    getUser: async () => {
      const users = await getUsers(1);
      return users[0];
    },
    getEarnings: async (users: {pool: Contract; address: string}[]) => {
      const earnings = await Promise.all(
        users.map((u) => u.pool.earned(u.address))
      );
      return earnings.map((x) => BigNumber.from(x).toNumber());
    },
  };
});
