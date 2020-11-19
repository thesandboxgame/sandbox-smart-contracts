const {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} = require('hardhat');
const {smoddit} = require('@eth-optimism/smock');
const {BigNumber} = require('@ethersproject/bignumber');
const {expect} = require('../chai-setup');
const {mine} = require('../utils');
const {deploy} = deployments;

const STAKE_TOKEN = 'UNI_SAND_ETH';
const REWARD_TOKEN = 'Sand';
const MULTIPLIER_NFToken = 'Land';
const POOL = 'LandWeightedSANDRewardPool';
const REWARD_DURATION = 2592000; // 30 days in seconds
const REWARD_AMOUNT = BigNumber.from(1500000).mul('1000000000000000000');
const ACTUAL_REWARD_AMOUNT = REWARD_AMOUNT.div(REWARD_DURATION).mul(
  REWARD_DURATION
);

const STAKE_AMOUNT = BigNumber.from(10000).mul('1000000000000000000');

describe('SmockitSANDRewardPool', function (supplyRewardTokens, notifyReward) {
  async function createFixture() {
    await deployments.fixture(POOL);
    const {
      deployer,
      sandAdmin,
      liquidityRewardAdmin,
      landAdmin,
      sandBeneficiary,
    } = await getNamedAccounts();

    const others = await getUnnamedAccounts();

    // Get contracts
    const rewardToken = await ethers.getContract(REWARD_TOKEN);
    const multiplierNFToken = await ethers.getContract(MULTIPLIER_NFToken);
    const stakeToken = await ethers.getContract(STAKE_TOKEN);

    // Create modifiable Reward contract using Smoddit
    const modifiableRewardContractFactory = await smoddit(POOL);

    const modifiableRewardContract = await modifiableRewardContractFactory.deploy(
      stakeToken.address,
      rewardToken.address,
      multiplierNFToken.address,
      2592000
    );

    // Create modifiable MockLand contract uing Smoddit
    const modifiableLandContractFactory = await smoddit('MockLand'); // TODO: MockLand contract works here because the artifact can be found, but ideally we want this to be Land
    const modifiableLandContract = await modifiableLandContractFactory.deploy(
      rewardToken.address,
      landAdmin
    );

    // Modify user's NFT balance
    const user = others[1];
    modifiableLandContract.smodify.put({
      // TODO: fix error: Cannot read property 'storage' of undefined
      _numNFTPerAddress: {
        user: 10,
      },
    });
    console.log('user bal', await modifiableLandContract.balanceOf(user));

    const rewardPoolAsUser = {
      0: modifiableRewardContract.connect(ethers.provider.getSigner(others[0])),
      1: modifiableRewardContract.connect(ethers.provider.getSigner(others[1])),
      2: modifiableRewardContract.connect(ethers.provider.getSigner(others[2])),
    };

    const rewardTokenAdmin = sandAdmin;
    const stakeTokenAdmin = deployer;

    const stakeTokenAsAdmin = stakeToken.connect(
      ethers.provider.getSigner(stakeTokenAdmin)
    );

    const stakeTokenAsUser = {
      0: stakeToken.connect(ethers.provider.getSigner(others[0])),
      1: stakeToken.connect(ethers.provider.getSigner(others[1])),
      2: stakeToken.connect(ethers.provider.getSigner(others[2])),
    };
    const rewardTokenAsAdmin = rewardToken.connect(
      ethers.provider.getSigner(rewardTokenAdmin)
    );

    const rewardPoolAsAdmin = modifiableRewardContract.connect(
      ethers.provider.getSigner(liquidityRewardAdmin)
    );

    // Send reward to pool
    await modifiableRewardContract.setRewardDistribution(liquidityRewardAdmin);

    if (supplyRewardTokens === true) {
      await rewardTokenAsAdmin.transfer(
        modifiableRewardContract.address,
        REWARD_AMOUNT
      );
    }

    if (notifyReward === true) {
      await rewardPoolAsAdmin.notifyRewardAmount(REWARD_AMOUNT);
    }
    // Give users some stakeTokens
    for (let i = 0; i < 3; i++) {
      await stakeTokenAsAdmin.transfer(others[i], STAKE_AMOUNT.mul(10));
      await stakeTokenAsUser[i].approve(
        modifiableRewardContract.address,
        STAKE_AMOUNT.mul(10)
      );
    }

    return {
      deployer,
      sandAdmin,
      liquidityRewardAdmin,
      landAdmin,
      sandBeneficiary,
      others,
      modifiableRewardContract,
      rewardPoolAsUser,
    };
  }

  it('User earnings for 89 NFTs match expected reward', async function () {
    await createFixture(true, true);
    // change LAND balance for given user
    // calculate earnings
  });
});
