const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {mine} = require("local-utils");
const {contribution} = require("./testContributionEquation");

const STAKE_TOKEN = "UNI_SAND_ETH";
const REWARD_TOKEN = "Sand";
const MULTIPLIER_NFToken = "MockLand";
const POOL = "LandWeightedSANDRewardPoolNFTTest";
const REWARD_DURATION = 2592000; // 30 days in seconds
const REWARD_AMOUNT = BigNumber.from(1500000).mul("1000000000000000000");
const PRECISION_INCREMENT = BigNumber.from(1);
const ACTUAL_REWARD_AMOUNT = REWARD_AMOUNT.div(REWARD_DURATION).mul(REWARD_DURATION);

const NEW_REWARD_AMOUNT = BigNumber.from(2000000).mul("1000000000000000000");
const STAKE_AMOUNT = BigNumber.from(10000).mul("1000000000000000000");
const SMALL_STAKE_AMOUNT = BigNumber.from(10).mul("1000000000000000000");

let startTimestamp;

describe("MockSANDRewardPool", function () {
  let deployer;
  let others;
  let sandAdmin;
  let landAdmin;
  let rewardPool;
  let rewardPoolAsUser;
  let rewardPoolAsAdmin;
  let stakeToken;
  let stakeTokenAsAdmin;
  let stakeTokenAsUser;
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

    // Deploy mock contracts
    rewardToken = await ethers.getContract(REWARD_TOKEN);
    await deployments.deploy(MULTIPLIER_NFToken, {from: deployer, args: [rewardToken.address, landAdmin]});
    multiplierNFToken = await ethers.getContract(MULTIPLIER_NFToken);
    stakeToken = await ethers.getContract(STAKE_TOKEN);
    await deployments.deploy(POOL, {
      from: deployer,
      args: [stakeToken.address, rewardToken.address, multiplierNFToken.address, 2592000],
    });
    const latestBlock = await ethers.provider.getBlock("latest");
    startTimestamp = latestBlock.timestamp;
    rewardPool = await ethers.getContract(POOL);

    // Define token admins
    const rewardTokenAdmin = sandAdmin;
    const stakeTokenAdmin = deployer;
    const multiplierNFTokenAdmin = landAdmin;

    // Get contract roles
    rewardPoolAsAdmin = rewardPool.connect(ethers.provider.getSigner(liquidityRewardAdmin));
    rewardPoolAsUser = {
      0: rewardPool.connect(ethers.provider.getSigner(others[0])),
      1: rewardPool.connect(ethers.provider.getSigner(others[1])),
      2: rewardPool.connect(ethers.provider.getSigner(others[2])),
    };
    stakeTokenAsAdmin = stakeToken.connect(ethers.provider.getSigner(stakeTokenAdmin));
    multiplierNFTokenAsAdmin = multiplierNFToken.connect(ethers.provider.getSigner(multiplierNFTokenAdmin));
    stakeTokenAsUser = {
      0: stakeToken.connect(ethers.provider.getSigner(others[0])),
      1: stakeToken.connect(ethers.provider.getSigner(others[1])),
      2: stakeToken.connect(ethers.provider.getSigner(others[2])),
    };
    const rewardPoolAsDeployer = rewardPool.connect(ethers.provider.getSigner(deployer));
    const rewardTokenAsAdmin = rewardToken.connect(ethers.provider.getSigner(rewardTokenAdmin));
    // const rewardTokenAsUser = rewardToken.connect(ethers.provider.getSigner(others[0]));
    // const multiplierNFTokenAsUser = multiplierNFToken.connect(ethers.provider.getSigner(others[0]));

    // Send reward to pool
    await rewardPoolAsDeployer.setRewardDistribution(liquidityRewardAdmin);
    await rewardTokenAsAdmin.transfer(rewardPool.address, REWARD_AMOUNT);
    await rewardPoolAsAdmin.notifyRewardAmount(REWARD_AMOUNT);

    // Give users some stakeTokens
    for (let i = 0; i < 3; i++) {
      await stakeTokenAsAdmin.transfer(others[i], STAKE_AMOUNT.mul(10));
      await stakeTokenAsUser[i].approve(rewardPool.address, STAKE_AMOUNT.mul(10));
    }
  }

  async function setUpUserWithNfts(user, min, max) {
    // Set up users with NFTs (mockLands)
    for (let i = min; i < max; i++) {
      await multiplierNFTokenAsAdmin.mint(user, i);
    }
  }

  it("Pool contains reward tokens", async function () {
    await createFixture();
    await ethers.getContract(POOL);
    let balance = await rewardToken.balanceOf(rewardPool.address);
    expect(balance).to.equal(REWARD_AMOUNT);
  });

  it("User with stakeTokens can stake", async function () {
    await createFixture();
    let balance = await stakeToken.balanceOf(others[0]);
    expect(balance).to.equal(STAKE_AMOUNT.mul(10));
    const receipt = await rewardPoolAsUser[0].stake(STAKE_AMOUNT).then((tx) => tx.wait());
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    const eventsMatching = receipt.events.filter((event) => event.event === "Staked");
    expect(eventsMatching.length).to.equal(1);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    balance = await stakeToken.balanceOf(others[0]);
    expect(balance).to.equal(STAKE_AMOUNT.mul(10).sub(STAKE_AMOUNT));
  });

  // Single staker with no LANDs receive rewards
  // Total rewards add up to 100% of reward available

  it("User earnings for 0 NFTs match expected reward", async function () {
    await createFixture();
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("User earnings for 0 NFTs match expected reward with 1 stake", async function () {
    await createFixture();
    await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("User earnings for 0 NFTs match expected reward with 2 stakes", async function () {
    await createFixture();
    for (let i = 0; i < 2; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(2));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("User earnings for 0 NFTs match expected reward with 3 stakes", async function () {
    await createFixture();
    for (let i = 0; i < 3; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(3));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("User earnings for 0 NFTs match expected reward with 4 stakes", async function () {
    await createFixture();
    for (let i = 0; i < 4; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(4));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 0 NFTs match expected reward with 10 stakes", async function () {
    await createFixture();
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(10));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(4)));
  });

  // Single staker with LANDs receive rewards
  // Total rewards add up to 100% of reward available

  it("User earnings for 1 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 1 NFTs match expected reward with 10 stakes", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(10));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(10)));
  });

  it("User earnings for 2 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 2);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 3 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 3);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 3 NFTs match expected reward with 10 stakes", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 3);
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(10));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(10)));
  });

  it("User earnings for 89 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 89);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 89 NFTs match expected reward with 10 stakes", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 89);
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(10));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(10)));
  });

  it("User earnings for 500 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 500);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("User earnings for 10000 NFTs match expected reward", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 10000);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  // Multiple stakers with no LANDs receive rewards
  // Total rewards add up to 100% of reward available

  it("Multiple Users' earnings for 0 NFTs match expected reward: 2 users", async function () {
    await createFixture();
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT.mul(2));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    expect(earned0.add(earned1)).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it("Multiple Users' earnings for 0 NFTs match expected reward: 2 users, 10 stakes each", async function () {
    await createFixture();
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
      await rewardPoolAsUser[1].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(20));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(10)));
  });

  it("Multiple Users' earnings for 0 NFTs match expected reward: 3 users, 1 stake each", async function () {
    await createFixture();
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[2].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT.mul(3));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned2 = await rewardPoolAsUser[2].earned(others[2]);
    expect(earned0.add(earned1).add(earned2)).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  // Multiple stakers with LANDs receive rewards
  // Total contributions add up to 100% of reward available

  it("Multiple Users' earnings for 1 NFTs match expected reward: 2 users, 1 stake each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    await setUpUserWithNfts(others[1], 1, 2);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT.mul(2));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(2)));
  });

  it("Multiple Users' earnings for 1 NFTs match expected reward: 2 users, 10 stakes each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    await setUpUserWithNfts(others[1], 1, 2);
    for (let i = 0; i < 10; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
      await rewardPoolAsUser[1].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(20));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(11)));
  });

  it("Multiple Users' earnings for 3 NFTs match expected reward: 2 users, 1 stake each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 3);
    await setUpUserWithNfts(others[1], 3, 6);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT.mul(2));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(2)));
  });

  it("Multiple Users' earnings for 100 NFTs match expected reward: 2 users, 1 stake each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 100);
    await setUpUserWithNfts(others[1], 100, 200);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(STAKE_AMOUNT.mul(2));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(2)));
  });

  it("Staking with STAKE_AMOUNT plus an extra amount equivalent to 2 NFTs", async function () {
    await createFixture();
    const numNfts = 2;
    const contributionNoNfts = contribution(STAKE_AMOUNT, 0);
    const contributionWithNfts = contribution(STAKE_AMOUNT, numNfts);
    const stakeAmount = STAKE_AMOUNT.add(contributionWithNfts.sub(contributionNoNfts));
    await rewardPoolAsUser[0].stake(stakeAmount);
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(stakeAmount);

    const userContribution = await rewardPool.contributionOf(others[0]);
    expect(userContribution).to.equal(contribution(stakeAmount, 0));

    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser[0].earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT)); // same precision loss as for 2 NFTs
  });

  it("Earlier staker gets more rewards with same NFT amount - small NFT number", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    await setUpUserWithNfts(others[1], 1, 2);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    expect(earned0).to.be.gte(earned1);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(2)));
  });

  it("Earlier staker gets more rewards with same NFT amount - large NFT number", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 100);
    await setUpUserWithNfts(others[1], 100, 200);
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    expect(earned0).to.be.gte(earned1);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(2)));
  });

  it("More lands give more rewards than earlier staker when NFT amounts are smaller", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 1);
    await setUpUserWithNfts(others[1], 1, 3); // has extra NFT
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    expect(earned1).to.be.gte(earned0);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("More lands do not give more rewards than earlier staker with large NFT amounts", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 100);
    await setUpUserWithNfts(others[1], 100, 201); // has extra NFT
    await rewardPoolAsUser[0].stake(STAKE_AMOUNT);
    await rewardPoolAsUser[1].stake(STAKE_AMOUNT);
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    expect(earned0).to.be.gte(earned1);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT));
  });

  it("Multiple Users' earnings for 0 NFTs match expected reward: 2 users, 100 stakes each", async function () {
    await createFixture();
    for (let i = 0; i < 100; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
      await rewardPoolAsUser[1].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(200));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(99)));
  });

  it("Multiple Users' earnings for 100 NFTs match expected reward: 2 users, 100 stakes each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 100);
    await setUpUserWithNfts(others[1], 100, 200);
    for (let i = 0; i < 100; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
      await rewardPoolAsUser[1].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(200));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(100)));
  });

  it("Multiple Users' earnings for 100 NFTs match expected reward: 2 users, 1000 stakes each", async function () {
    await createFixture();
    await setUpUserWithNfts(others[0], 0, 100);
    await setUpUserWithNfts(others[1], 100, 200);
    for (let i = 0; i < 1000; i++) {
      await rewardPoolAsUser[0].stake(SMALL_STAKE_AMOUNT);
      await rewardPoolAsUser[1].stake(SMALL_STAKE_AMOUNT);
    }
    const stakedBalance = await stakeToken.balanceOf(rewardPool.address);
    expect(stakedBalance).to.equal(SMALL_STAKE_AMOUNT.mul(2000));
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned0 = await rewardPoolAsUser[0].earned(others[0]);
    const earned1 = await rewardPoolAsUser[1].earned(others[1]);
    const earned = earned0.add(earned1);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT.sub(PRECISION_INCREMENT.mul(1015)));
  });
});
