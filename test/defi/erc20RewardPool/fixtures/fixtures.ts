import {getUnnamedAccounts} from 'hardhat';
import {setupUsers, toWei, withSnapshot} from '../../../utils';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import {randomBigNumber} from '../../sandRewardPool/utils';

export const ContributionRulesSetup = withSnapshot([], async function (hre) {
  const contractName = 'ContributionRules';
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const [admin, other] = await getUnnamedAccounts();

  await deployments.deploy('ERC721Token', {
    from: deployer,
    contract: 'ERC721Mintable',
    args: ['ERC721Token', 'LTK'],
  });

  const ERC721Token = await ethers.getContract('ERC721Token', deployer);

  await deployments.deploy('ERC1155Token', {
    from: deployer,
    contract: 'ERC1155Mintable',
    args: ['asset.sandbox.game'],
  });

  const ERC1155Token = await ethers.getContract('ERC1155Token', deployer);

  await deployments.deploy(contractName, {
    from: deployer,
  });
  const contract = await ethers.getContract(contractName, deployer);
  await contract.transferOwnership(admin);
  const contractAsAdmin = await ethers.getContract(contractName, admin);
  const contractAsOther = await ethers.getContract(contractName, other);
  return {
    contract,
    contractAsAdmin,
    contractAsOther,
    ERC721Token,
    ERC1155Token,
    deployer,
    admin,
    other,
  };
});

export const setupERC20RewardPoolTest = withSnapshot([], async function (hre) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('RewardCalculatorMock', {from: deployer});
  const rewardCalculatorMock = await ethers.getContract(
    'RewardCalculatorMock',
    deployer
  );
  await deployments.deploy('ContributionRulesMock', {from: deployer});
  const contributionRulesMock = await ethers.getContract(
    'ContributionRulesMock',
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

  await deployments.deploy('ERC20RewardPool', {
    from: deployer,
    args: [stakeToken.address, rewardToken.address, trustedForwarder.address],
  });
  const contract = await ethers.getContract('ERC20RewardPool', deployer);
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
      await contributionRulesMock.setContribution(u.address, u.contributed);
    }
    return users;
  };

  const contractAsOther = await ethers.getContract(
    'ERC20RewardPool',
    others[1]
  );

  return {
    totalRewardMinted,
    contract,
    stakeToken,
    rewardToken,
    rewardCalculatorMock,
    contributionRulesMock,
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
