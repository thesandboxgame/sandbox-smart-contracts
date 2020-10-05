const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {mine} = require("local-utils");

const STAKE_TOKEN = "UNI_SAND_ETH";
const REWARD_TOKEN = "Sand";
const MULTIPLIER_NFToken = "MockLand";
const POOL = "LandWeightedSANDRewardPoolNFTTest";
const REWARD_DURATION = 2592000; // 30 days in seconds
const REWARD_AMOUNT = BigNumber.from(1500000).mul("1000000000000000000");
const ACTUAL_REWARD_AMOUNT = REWARD_AMOUNT.div(REWARD_DURATION).mul(REWARD_DURATION);

const NEW_REWARD_AMOUNT = BigNumber.from(2000000).mul("1000000000000000000");
const STAKE_AMOUNT = BigNumber.from(10000).mul("1000000000000000000");

describe("MockSANDRewardPool", function () {
  let deployer;
  let others;
  let sandAdmin;
  let landAdmin;
  let rewardPool;
  let rewardPoolAsUser;
  let stakeToken;
  let stakeTokenAsAdmin;
  let rewardToken;
  let multiplierNFToken;

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
      args: [stakeToken.address, rewardToken.address, multiplierNFToken.address, "100000", "9000000"],
    });
    rewardPool = await ethers.getContract(POOL);

    // Define token admins
    const rewardTokenAdmin = sandAdmin;
    const stakeTokenAdmin = deployer;
    const multiplierNFTokenAdmin = landAdmin;

    // Get contract roles
    rewardPoolAsDeployer = rewardPool.connect(ethers.provider.getSigner(deployer));
    rewardPoolAsAdmin = rewardPool.connect(ethers.provider.getSigner(liquidityRewardAdmin));
    rewardPoolAsUser = rewardPool.connect(ethers.provider.getSigner(others[0]));
    stakeTokenAsAdmin = stakeToken.connect(ethers.provider.getSigner(stakeTokenAdmin));
    stakeTokenAsUser = stakeToken.connect(ethers.provider.getSigner(others[0]));
    rewardTokenAsAdmin = rewardToken.connect(ethers.provider.getSigner(rewardTokenAdmin));
    rewardTokenAsUser = rewardToken.connect(ethers.provider.getSigner(others[0]));
    multiplierNFTokenAsAdmin = multiplierNFToken.connect(ethers.provider.getSigner(multiplierNFTokenAdmin));
    multiplierNFTokenAsUser = multiplierNFToken.connect(ethers.provider.getSigner(others[0]));

    // Send reward to pool
    await rewardPoolAsDeployer.setRewardDistribution(liquidityRewardAdmin);
    await rewardTokenAsAdmin.transfer(rewardPool.address, REWARD_AMOUNT);
    await rewardPoolAsAdmin.notifyRewardAmount(REWARD_AMOUNT);

    // Give user some stakeTokens
    await stakeTokenAsAdmin.transfer(others[0], STAKE_AMOUNT);
    await stakeTokenAsUser.approve(rewardPool.address, STAKE_AMOUNT);

    // Set up user with NFTs (mockLands)
    await multiplierNFTokenAsAdmin.transferFrom(multiplierNFToken.address, others[0], 0);
    await multiplierNFTokenAsAdmin.transferFrom(multiplierNFToken.address, others[0], 1);
    await multiplierNFTokenAsAdmin.transferFrom(multiplierNFToken.address, others[0], 2);

    // TODO: check user's NFT balance
    const balance = await multiplierNFToken.functions.balanceOf(others[0]);
    console.log(balance);
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
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + REWARD_DURATION]);
    await mine();
    const earned = await rewardPoolAsUser.earned(others[0]);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
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

  // Multiple stakers with no LANDs receive rewards
  // Total rewards add up to 100% of reward available

  // Multiple stakers with LANDs receive rewards
  // Total contributions add up to 100% of reward available
});
