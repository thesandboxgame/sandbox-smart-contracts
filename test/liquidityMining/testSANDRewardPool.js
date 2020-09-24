const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {expectRevert, zeroAddress} = require("local-utils");

describe("SANDRewardPool", function () {
  async function initRewardPoolContract() {
    const accounts = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("SANDRewardPool", accounts.deployer);
    const rewardPool = await ethersFactory.deploy();
    return rewardPool;
  }

  // SCOPE TESTS

  // **SET UP**
  // Admin - defined role - can set reward
  // Admin - defined role - can notify reward and start the pool

  // **UNI-V2**
  // Users can stake UNI-V2
  // Users can unstake UNI-V2
  // Users can exit - then their reward stops accruing

  // **SAND rewards**
  // Users can withdraw SAND accrued
  // Reward accrues according to reward contract calculation
  // Users cannot claim SAND if no SAND in pool
  // Users do not accrue rewards if pool reward has not been notified

  async function initUniV2Contract() {
    const accounts = await getNamedAccounts();
    // const ethersFactory = await ethers.getContractFactory("SandEthIUniswapV2Pair", accounts.deployer);
    const ethersFactory = await await ethers.getContractFactory("SandEthIUniswapV2Pair", accounts.deployer);
    const uniV2Contract = await ethersFactory.deploy();
    return uniV2Contract;
  }

  async function addSandReward(rewardContract, sandContract, beneficiary, amount) {
    const tx = await sandContract.connect(ethers.provider.getSigner(beneficiary)).transfer(rewardContract, amount);
    await tx.wait();
  }

  async function testUniV2TokenWithdrawal(account, amount, rewardPoolContract, uniV2Contract) {
    const balanceBefore = await uniV2Contract.balanceOf(account);
    console.log('uniBalance', balanceBefore)
    const tx = await rewardPoolContract.connect(ethers.provider.getSigner(account)).withdraw(uniV2Contract.address);
    const receipt = await tx.wait();
    const balanceAfter = await uniV2Contract.balanceOf(account);
    const rewardWithdrawn = balanceAfter.sub(balanceBefore);
    expect(rewardWithdrawn).to.equal(amount);
  }

  it("Withdrawal of tokens from contract with zero token balance", async function () {
    const {others} = await getNamedAccounts();
    const rewardPoolContract = await initRewardPoolContract();
    const uniV2Contract = await initUniV2Contract();
    await testUniV2TokenWithdrawal(others[0], BigNumber.from("0"), rewardPoolContract, uniV2Contract);
  });
});
