const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {mine} = require("local-utils");
const {replicateContribution, replicateEarned, replicateRewardPerToken} = require("./_testHelper");

const STAKE_TOKEN = "UNI_SAND_ETH";
const REWARD_TOKEN = "Sand";
const MULTIPLIER_NFToken = "Land";
const POOL = "LandWeightedSANDRewardPool";
const REWARD_DURATION = 2592000; // 30 days in seconds
const REWARD_AMOUNT = BigNumber.from(1500000).mul("1000000000000000000");
const ACTUAL_REWARD_AMOUNT = REWARD_AMOUNT.div(REWARD_DURATION).mul(REWARD_DURATION);

const NEW_REWARD_AMOUNT = BigNumber.from(2000000).mul("1000000000000000000");
const STAKE_AMOUNT = BigNumber.from(10000).mul("1000000000000000000");

const ONE_DAY = 86400;

describe("ActualSANDRewardPool", function () {
  let deployer;
  let others;
  let sandAdmin;
  let landAdmin;
  let rewardPool;
  let rewardPoolAsUser;
  let rewardPoolAsAdmin;
  let stakeToken;
  let stakeTokenAsUser;
  let stakeTokenAsAdmin;
  let rewardToken;
  let multiplierNFToken;
  let multiplierNFTokenAsAdmin;

  async function createFixture() {
    await deployments.fixture();
    ({
      deployer,
      sandAdmin,
      others,
      liquidityRewardAdmin,
      liquidityRewardProvider,
      landAdmin,
    } = await getNamedAccounts());

    // Define token admins
    const rewardTokenAdmin = sandAdmin;
    const stakeTokenAdmin = deployer;
    const multiplierNFTokenAdmin = landAdmin;

    // Contracts
    rewardToken = await ethers.getContract(REWARD_TOKEN);
    multiplierNFToken = await ethers.getContract(MULTIPLIER_NFToken);
    stakeToken = await ethers.getContract(STAKE_TOKEN);

    // Get contract roles
    rewardPool = await ethers.getContract(POOL);
    rewardPoolAsAdmin = rewardPool.connect(ethers.provider.getSigner(liquidityRewardAdmin));
    rewardPoolAsUser = rewardPool.connect(ethers.provider.getSigner(others[0]));
    stakeTokenAsAdmin = stakeToken.connect(ethers.provider.getSigner(stakeTokenAdmin));
    stakeTokenAsUser = stakeToken.connect(ethers.provider.getSigner(others[0]));
    multiplierNFTokenAsAdmin = multiplierNFToken.connect(ethers.provider.getSigner(multiplierNFTokenAdmin));
    const rewardTokenAsAdmin = rewardToken.connect(ethers.provider.getSigner(rewardTokenAdmin));
    const rewardTokenAsUser = rewardToken.connect(ethers.provider.getSigner(others[0]));
    const multiplierNFTokenAsUser = multiplierNFToken.connect(ethers.provider.getSigner(others[0]));

    // Give user some stakeTokens
    await stakeTokenAsAdmin.transfer(others[0], STAKE_AMOUNT);
    await stakeTokenAsUser.approve(rewardPool.address, STAKE_AMOUNT);

    // Enable minting of LANDs
    await multiplierNFTokenAsAdmin.setMinter(landAdmin, true).then((tx) => tx.wait());
  }

  // To set up LANDs
  let counter = 0;
  async function mintLandQuad(to) {
    await multiplierNFTokenAsAdmin.mintQuad(to, 1, counter, counter, "0x");
    counter++;
  }

  it("Contract should exist", async function () {
    await createFixture();
    await ethers.getContract(POOL);
  });

  it("Pool contains reward tokens", async function () {
    await createFixture();
    await ethers.getContract(POOL);
    let balance = await rewardToken.balanceOf(rewardPool.address);
    expect(balance).to.equal(REWARD_AMOUNT);
  });

  it("User with stakeTokens can stake", async function () {
    await createFixture();
    let balance = await stakeToken.balanceOf(others[0]);
    expect(balance).to.equal(STAKE_AMOUNT);
    const receipt = await rewardPoolAsUser.stake(STAKE_AMOUNT).then((tx) => tx.wait());
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    const eventsMatching = receipt.events.filter((event) => event.event === "Staked");
    expect(eventsMatching.length).to.equal(1);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    balance = await stakeToken.balanceOf(others[0]);
    expect(balance).to.equal(0);
  });

  it("User can earn rewardTokens if pool has been notified of reward", async function () {
    await createFixture();
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const userContribution = await rewardPool.contributionOf(others[0]);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
    expect(userContribution).to.equal(replicateContribution(STAKE_AMOUNT, 0));
  });

  it("admin can notifyRewardAmount and start a new reward process (without sending more reward tokens)", async function () {
    await createFixture();
    const receipt = await rewardPoolAsAdmin.notifyRewardAmount(NEW_REWARD_AMOUNT).then((tx) => tx.wait());
    const eventsMatching = receipt.events.filter((event) => event.event === "RewardAdded");
    expect(eventsMatching.length).to.equal(1);
    let balance = await rewardToken.balanceOf(rewardPool.address);
    expect(balance).to.equal(REWARD_AMOUNT);
  });

  it("User cannot earn rewardTokens if they stake after the end time", async function () {
    await createFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]); // fast forward to after the end of current reward period
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    await mine();
    const rewardPerToken = await rewardPool.rewardPerToken();
    expect(rewardPerToken).to.equal(0);
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(0);
  });

  it("User earns full reward amount if they are the only staker after 1 day", async function () {
    await createFixture();
    await ethers.provider.send("evm_increaseTime", [ONE_DAY]);
    await mine();
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION - ONE_DAY]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("User earns full reward amount if they are the only staker after 29 days", async function () {
    await createFixture();
    await ethers.provider.send("evm_increaseTime", [ONE_DAY * 29]);
    await mine();
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION - ONE_DAY * 29]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  // Using LAND contract

  it("User with 1 LAND earns correct reward amount", async function () {
    await createFixture();
    await mintLandQuad(others[0]);
    const landCount = await multiplierNFToken.balanceOf(others[0]);
    expect(landCount).to.equal(1);
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    const userContribution = await rewardPool.contributionOf(others[0]);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
    expect(userContribution).to.equal(replicateContribution(STAKE_AMOUNT, 1));
  });

  it("User with 3 LANDs earns correct reward amount", async function () {
    await createFixture();
    for (let i = 0; i < 3; i++) {
      await mintLandQuad(others[0]);
    }
    const landCount = await multiplierNFToken.balanceOf(others[0]);
    expect(landCount).to.equal(3);
    const receipt = await rewardPoolAsUser.stake(STAKE_AMOUNT).then(tx => tx.wait());
    const stakeBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const stakeTimestamp = stakeBlock.timestamp;
    const earnedAfterStake = await rewardPoolAsUser.earned(others[0]);
    const userContribution = await rewardPool.contributionOf(others[0]);
    await ethers.provider.send("evm_setNextBlockTimestamp", [stakeTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(userContribution).to.equal(replicateContribution(STAKE_AMOUNT, 3));
    const rewardRate = REWARD_AMOUNT.div(REWARD_DURATION);

    // STEPS
    // 1 -  Admin initiate by calling notifyRewardAmount:
    // a) updateReward is called: rewardPerTokenStored is 0. lastUpdateTime is not set.
    // b) rewardRate is set.
    // c) lastUpdateTime is set to start time.
    // 2 - User stakes:
    // a) updateReward is called: rewardPerTokenStored is still 0 because contributions are stll 0
    // b) lastUpdateTime is NOT updated because contributions are stll 0
    // c) User rewards are updated (but they are 0)
    // d) amount is staked and contribution is calculated
    // 3 - User earns: contribution x 0.add(time since start.mul(rewardRate).mul(1e30).div(contribution)).div(1e30)

    const expectedRewardPerToken = replicateRewardPerToken(
      BigNumber.from(0),
      BigNumber.from(stakeTimestamp),
      BigNumber.from(stakeTimestamp - 76), // 76s between notifyRewardAmount and stakeTimestamp
      rewardRate,
      replicateContribution(STAKE_AMOUNT, 3)
    );
    const expectedReward = replicateEarned(replicateContribution(STAKE_AMOUNT, 3), expectedRewardPerToken);
    expect(expectedReward).to.equal(earnedAfterStake);
    // 43981481481481481427 last output
    // 43402777777777777724 expected
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT); // AssertionError: Expected "1499999999999999998175999" to be equal "1499999999999999998176000"
  });

  it("User with 10 LANDs earns correct reward amount", async function () {
    await createFixture();
    for (let i = 0; i < 10; i++) {
      await mintLandQuad(others[0]);
    }
    const landCount = await multiplierNFToken.balanceOf(others[0]);
    expect(landCount).to.equal(10);
    await rewardPoolAsUser.stake(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT); // AssertionError: Expected "1499999999999999998175999" to be equal "1499999999999999998176000"
  });

  // TODO:
  // Multiple users
  // Test what happens if rewardToken in pool is less than amount notified
  // Test what happens if pool is notified before end of current reward period
});
