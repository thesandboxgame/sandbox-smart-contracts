import {BigNumber} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {deployments, getUnnamedAccounts} from 'hardhat';

export const setupPolygonSandRewardPool = deployments.createFixture(
  async function (hre) {
    const {deployments, getNamedAccounts, ethers} = hre;

    await deployments.fixture([
      'PolygonSANDRewardPool',
      'FakeLPSandMatic',
      'PolygonSand',
    ]);

    const {
      deployer,
      liquidityRewardAdmin,
      liquidityRewardProvider,
      sandBeneficiary,
    } = await getNamedAccounts();

    const others = await getUnnamedAccounts();

    // Define token admins
    const stakeTokenAdmin = deployer;
    const rewardTokenAdmin = sandBeneficiary;

    // Monthly reward 1,500,000 SAND
    const REWARD_AMOUNT = BigNumber.from(1500000).mul('1000000000000000000');
    const REWARD_TOKEN = 'PolygonSand';
    const STAKE_TOKEN = 'FakeLPSandMatic';
    const STAKE_AMOUNT = BigNumber.from(10000).mul('1000000000000000000');
    const POOL = 'PolygonSANDRewardPool';

    const rewardPool = await deployments.get(POOL);

    // Contracts
    const rewardPoolContract = await ethers.getContract(POOL);
    const sandContract = await ethers.getContract(
      REWARD_TOKEN,
      liquidityRewardProvider
    );

    const childChainManagerContract = await ethers.getContract(
      'CHILD_CHAIN_MANAGER'
    );
    const rewardTokenContract = await ethers.getContract(REWARD_TOKEN);
    const stakeTokenContract = await ethers.getContract(STAKE_TOKEN);
    const stakeTokenAsAdmin = stakeTokenContract.connect(
      ethers.provider.getSigner(stakeTokenAdmin)
    );
    const stakeTokenAsUser = stakeTokenContract.connect(
      ethers.provider.getSigner(others[0])
    );
    const rewardTokenAsAdmin = rewardTokenContract.connect(
      ethers.provider.getSigner(rewardTokenAdmin)
    );

    const abiCoder = new AbiCoder();
    const data = abiCoder.encode(['uint256'], [REWARD_AMOUNT]);

    await childChainManagerContract.callSandDeposit(
      sandContract.address,
      rewardTokenAdmin,
      data
    );

    const currentRewardDistribution = await rewardPoolContract
      .connect(ethers.provider.getSigner(deployer))
      .rewardDistribution();

    if (
      currentRewardDistribution.toLowerCase() !==
      liquidityRewardAdmin.toLowerCase()
    ) {
      await rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .setRewardDistribution(liquidityRewardAdmin);
    }

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(liquidityRewardAdmin))
      .notifyRewardAmount(REWARD_AMOUNT);

    // Pass the timestamp of notifyRewardAmount to linkedData for accurate testing
    const latestBlock = await ethers.provider.getBlock(receipt.blockNumber);
    rewardPool.linkedData = JSON.stringify(latestBlock.timestamp);
    await deployments.save('REWARD_NAME', rewardPool);

    await rewardTokenAsAdmin.transfer(rewardPool.address, REWARD_AMOUNT);
    // Give user some stakeTokens
    await stakeTokenAsAdmin.transfer(others[0], STAKE_AMOUNT);
    await stakeTokenAsUser.approve(rewardPool.address, STAKE_AMOUNT);

    return {
      rewardPool,
      rewardPoolContract,
      rewardTokenContract,
      stakeTokenContract,
      sandContract,
      deployer,
      liquidityRewardProvider,
      others,
    };
  }
);
