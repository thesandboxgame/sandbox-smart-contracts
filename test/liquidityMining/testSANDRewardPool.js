const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {expectRevert, zeroAddress} = require("local-utils");

describe("SANDRewardPool", function () {
  // SCOPE TESTS

  // **SET UP**
  // Admin - defined role - can set reward
  // Admin - defined role - can notify reward and start the pool

  // **UNI-V2**
  // Users can stake ERC20 (UNI-V2)
  // Users can unstake ERC20 (UNI-V2)
  // Users can exit - then their reward stops accruing

  // **SAND rewards**
  // Users can withdraw SAND accrued
  // Reward accrues according to reward contract calculation
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
    const rewardPoolContract = await ethers.getContract("SANDRewardPool");
    // convert to ethers format
    // const rewardPoolContractFactory = await ethers.getContractFactory(rewardPool.abi, rewardPool.bytecode, deployer);
    // const rewardPoolContract = await rewardPoolContractFactory.deploy();

    const uniV2Contract = await ethers.getContractAt(
      "SandEthIUniswapV2Pair",
      "0x57459003f480188204085A0F744ffEbcD53bcc5E"
    ); // imported

    const uniV2AsDeployer = uniV2Contract.connect(ethers.provider.getSigner(deployer));

    // send Token0 to Pair
    // send SAND to UniV2
    await sandContract.connect(ethers.provider.getSigner(sandAdmin)).transfer(deployer, BigNumber.from(100000));
    await sandContract.connect(ethers.provider.getSigner(deployer)).transfer(uniV2Contract.address, BigNumber.from(100000));

    // send Token1 to Pair
    // send WETH to UniV2

    const wethContract = await ethers.getContractAt("WrappedEther", "0xc778417E063141139Fce010982780140Aa0cD5Ab"); // imported
    const wethAsDeployer = wethContract.connect(ethers.provider.getSigner(deployer));
    await wethAsDeployer.deposit({value: BigNumber.from(10)});

    // const balanceWeth = await wethContract.balanceOf(deployer).then((tx) => tx.wait());
    await wethAsDeployer.transfer(uniV2Contract.address, BigNumber.from(10));

    // mint Staking Tokens
    await uniV2AsDeployer.mint(deployer);
    console.log("uni", uniV2AsDeployer);

    await uniV2AsDeployer.transfer(others[0], BigNumber.from(2));

    // const balanceUni = await uniV2Contract.balanceOf(deployer);
    // console.log('balanceUni', balanceUni);

    // const mockERC20 = await initERC20Contract();

    // const deployerBalanceBeforeMint = await mockERC20.balanceOf(deployer);
    // expect(deployerBalanceBeforeMint).to.equal(BigNumber.from(0));

    // await mintERC20StakingTokens(mockERC20, deployer, BigNumber.from(1500000));

    // const deployerBalanceAfterMinting = await mockERC20.balanceOf(deployer);
    // expect(deployerBalanceAfterMinting).to.equal(BigNumber.from(1500000));

    // const rewardContractBalanceBeforeTokensStaked = await mockERC20.balanceOf(rewardPoolContract.address);
    // expect(rewardContractBalanceBeforeTokensStaked).to.equal(BigNumber.from(0));

    // await mockERC20.transfer(others[0], BigNumber.from(10000));

    const rewardPoolContractAsUser = rewardPoolContract.connect(ethers.provider.getSigner(others[0]));
    // console.log("rpc", rewardPoolContractAsUser);
    const receipt = await rewardPoolContractAsUser.stake(BigNumber.from(2)).then((tx) => tx.wait());
    console.log("receipt", receipt);

    // const rewardContractBalanceAfterTokensStaked = await mockERC20.balanceOf(rewardPoolContract.address);
    // expect(rewardContractBalanceAfterTokensStaked).to.equal(BigNumber.from(10000));

    // check for Staked event
  });
});
