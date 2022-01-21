import {getUnnamedAccounts} from 'hardhat';
import {setupUsers, toWei, withSnapshot} from '../../../utils';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import {randomBigNumber} from '../utils';
import {AbiCoder} from 'ethers/lib/utils';

export const setupLandOwnersSandRewardPool = withSnapshot(
  ['LandOwnersSandRewardPool'],
  async function (hre) {
    const {deployments, getNamedAccounts, ethers} = hre;
    const {deployer} = await getNamedAccounts();
    const [other, other2] = await getUnnamedAccounts();
    const initialBalance = toWei(10);
    const sandAsOther = await ethers.getContract('PolygonSand', other);
    const sandAsOther2 = await ethers.getContract('PolygonSand', other2);
    const landAsOther = await ethers.getContract('PolygonLand', other);

    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

    const contractAsOther = await ethers.getContract(
      'LandOwnersSandRewardPool',
      other
    );
    const contractAsOther2 = await ethers.getContract(
      'LandOwnersSandRewardPool',
      other2
    );
    const abiCoder = new AbiCoder();
    const data = abiCoder.encode(['uint256'], [initialBalance]);
    await childChainManager.callSandDeposit(sandAsOther.address, other, data);
    await childChainManager.callSandDeposit(sandAsOther.address, other2, data);

    // TODO: Remove it when we have a way to mint L2 Land
    async function useMockInsteadOfL2Land() {
      // This changes the land for a mock because we still don't have it...
      const contributionCalculator = await ethers.getContract(
        'LandOwnersAloneContributionCalculator',
        deployer
      );
      await deployments.deploy('MockLandWithMint', {from: deployer});
      const mockLandWithMint = await ethers.getContract(
        'MockLandWithMint',
        deployer
      );
      const mockLandWithMintAsOther = await ethers.getContract(
        'MockLandWithMint',
        other
      );
      await contributionCalculator.setNFTMultiplierToken(
        mockLandWithMint.address
      );
      return {mockLandWithMint, mockLandWithMintAsOther};
    }
    return {
      useMockInsteadOfL2Land,
      deployer,
      contractAsOther,
      contractAsOther2,
      other,
      other2,
      childChainManager,
      sandAsOther,
      sandAsOther2,
      landAsOther,
    };
  }
);

export const setupSandRewardPoolTest = withSnapshot([], async function (hre) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('RewardCalculatorMock', {from: deployer});
  const rewardCalculatorMock = await ethers.getContract(
    'RewardCalculatorMock',
    deployer
  );
  await deployments.deploy('ContributionCalculatorMock', {from: deployer});
  const contributionCalculatorMock = await ethers.getContract(
    'ContributionCalculatorMock',
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
  const totalRewardMinted = toWei(10000);
  await rewardToken.mint(contract.address, totalRewardMinted);
  const others = await getUnnamedAccounts();

  const getUsers = async (
    cant: number,
    initialStake: BigNumberish = 1000000
  ) => {
    const users = (
      await setupUsers(others.slice(0, cant), {
        reward: rewardToken,
        stake: stakeToken,
        pool: contract,
      })
    ).map((u) => ({
      ...u,
      contributed: randomBigNumber(toWei(100)),
      staked: randomBigNumber(initialStake),
    }));
    for (const u of users) {
      await u.stake.mint(u.address, initialStake);
      await u.stake.approve(contract.address, initialStake);
      await contributionCalculatorMock.setContribution(
        u.address,
        u.contributed
      );
    }
    return users;
  };

  const contractAsOther = await ethers.getContract('SandRewardPool', others[1]);

  return {
    totalRewardMinted,
    contract,
    stakeToken,
    rewardToken,
    rewardCalculatorMock,
    contributionCalculatorMock,
    deployer,
    contractAsOther,
    trustedForwarder,
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

export const sum = (arr: BigNumberish[]): BigNumber =>
  arr.reduce((acc: BigNumber, val) => acc.add(val), BigNumber.from(0));
