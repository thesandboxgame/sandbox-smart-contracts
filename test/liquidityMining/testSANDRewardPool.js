const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {expectRevert, zeroAddress} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");

describe("SANDRewardPool", function () {
  // SCOPE TESTS

  // **SET UP**
  // Admin can set reward
  // Admin can notify reward and start the pool
  // Admin can notify reward and start the pool again before the end of the duration; the remaining previous reward is added to new reward
  // Admin can notify reward and start the pool again after the end of the duration; all previous reward was used

  // **UNI-V2**
  // Users can stake ERC20 (UNI-V2)
  // Users can unstake ERC20 (UNI-V2)
  // Users can exit - then their reward stops accruing

  // **SAND rewards**
  // Users can withdraw SAND accrued
  // Reward accrues according to reward contract calculation (based on time remaining and tokens staked)
  // Users cannot claim SAND if no SAND in pool
  // Users do not accrue rewards if pool reward has not been notified

  async function addSandReward(rewardContract, sandContract, beneficiary, amount) {
    const tx = await sandContract.connect(ethers.provider.getSigner(beneficiary)).transfer(rewardContract, amount);
    await tx.wait();
  }

  async function initERC20Contract() {
    let accounts = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("MockERC20", accounts.deployer);
    let contractRef = await ethersFactory.deploy();
    return contractRef;
  }

  async function mintERC20StakingTokens(erc20Contract, address, amount) {
    await erc20Contract.mint(address, amount);
  }

  it("User can stake", async function () {
    const {deployer, others, sandAdmin} = await getNamedAccounts();
    await deployments.fixture();
    const sandContract = await ethers.getContract("Sand");
    const rewardPoolContract = await ethers.getContractAt(
      "SANDRewardPool",
      "0xce7467531f0Fa949e6cd09A3B8F39e287eec33b8"
    ); // tests use Open Zeppellin safeTransfer which needs the actual contract address

    const uniV2Contract = await ethers.getContractAt(
      "SandEthIUniswapV2Pair",
      "0x57459003f480188204085A0F744ffEbcD53bcc5E"
    ); // imported

    const uniV2AsDeployer = uniV2Contract.connect(ethers.provider.getSigner(deployer));

    // send Token0 to Pair
    // send SAND to UniV2
    await sandContract.connect(ethers.provider.getSigner(sandAdmin)).transfer(deployer, BigNumber.from(100000));
    await sandContract
      .connect(ethers.provider.getSigner(deployer))
      .transfer(uniV2Contract.address, BigNumber.from(100000));

    // send Token1 to Pair
    // send WETH to UniV2

    const wethContract = await ethers.getContractAt("WrappedEther", "0xc778417E063141139Fce010982780140Aa0cD5Ab"); // imported
    const wethAsDeployer = wethContract.connect(ethers.provider.getSigner(deployer));
    await wethAsDeployer.deposit({value: BigNumber.from(10)});

    // const balanceWeth = await wethContract.balanceOf(deployer).then((tx) => tx.wait());
    await wethAsDeployer.transfer(uniV2Contract.address, BigNumber.from(10));

    // mint Staking Tokens
    const mintReceipt = await uniV2AsDeployer.mint(deployer).then((tx) => tx.wait());
    console.log(mintReceipt);
    // console.log("uni", uniV2AsDeployer);

    // await uniV2AsDeployer.transfer(others[0], BigNumber.from(2));

    // const balanceUni = await uniV2Contract.balanceOf(deployer);
    // console.log('balanceUni', balanceUni);

    // const mockERC20 = await initERC20Contract();

    // const deployerBalanceBeforeMint = await mockERC20.balanceOf(deployer);
    // expect(deployerBalanceBeforeMint).to.equal(BigNumber.from(0));

    // await mintERC20StakingTokens(mockERC20, deployer, BigNumber.from(1500000));

    // const deployerBalanceAfterMinting = await mockERC20.balanceOf(deployer);
    // expect(deployerBalanceAfterMinting).to.equal(BigNumber.from(1500000));

    // const rewardContractBalanceBeforeTokensStaked = await uniV2Contract.balanceOf(rewardPoolContract.address);
    // expect(rewardContractBalanceBeforeTokensStaked).to.equal(BigNumber.from(0));

    // await mockERC20.transfer(others[0], BigNumber.from(10000));

    const rewardPoolContractAsUser = rewardPoolContract.connect(ethers.provider.getSigner(others[0]));
    const rewardPoolContractAsDeployer = rewardPoolContract.connect(ethers.provider.getSigner(deployer)); // actual contract address is 0xce7467531f0Fa949e6cd09A3B8F39e287eec33b8

    const receipt = await rewardPoolContractAsDeployer.stake(BigNumber.from(2)).then((tx) => tx.wait());
    // console.log("receipt", receipt);
    // const eventsMatching = await findEvents(rewardPoolContract, "Staked", receipt.blockHash);
    // console.log('eventsMatching', eventsMatching);

    // const rewardContractBalanceAfterTokensStaked = await mockERC20.balanceOf(rewardPoolContract.address);
    // expect(rewardContractBalanceAfterTokensStaked).to.equal(BigNumber.from(10000));

    // check for Staked event

    const balance = await rewardPoolContractAsDeployer.balanceOf(deployer);
    console.log('bal', balance);

    // console.log(uniV2Contract);
    // const totalSupply = await uniV2Contract.totalSupply();
    // console.log('total', totalSupply);
    // const rewardContractBalanceAfterTokensStaked = await uniV2Contract.balanceOf(rewardPoolContract.address);
    // console.log('staked', rewardContractBalanceAfterTokensStaked);
    // expect(rewardContractBalanceAfterTokensStaked).to.equal(BigNumber.from(2));

  });
});
