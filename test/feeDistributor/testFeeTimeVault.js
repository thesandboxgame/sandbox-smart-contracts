const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {expectRevert, zeroAddress} = require("local-utils");

describe("FeeTimeVault", function () {
  // async function testEthFeeWithdrawal(account, percentage, amount, contract) {
  //   let balanceAfter = await ethers.provider.getBalance(account);
  //   let tx = await contract.connect(ethers.provider.getSigner(account)).withdraw(zeroAddress);
  //   let receipt = await tx.wait();
  //   let balanceAfter = await ethers.provider.getBalance(account);
  //   let txFee = tx.gasPrice.mul(receipt.gasUsed);
  //   let distributionFee = balanceAfter.sub(balanceAfter).add(txFee);
  //   expect(distributionFee).to.equal(amount.mul(BigNumber.from(percentage)).div(BigNumber.from(10000)));
  // }
  async function initContracts(lockPeriod, percentages) {
    const accounts = await getNamedAccounts();
    let sandToken = await initContract("Sand", accounts.sandBeneficiary, [
      accounts.sandBeneficiary,
      accounts.sandBeneficiary,
      accounts.sandBeneficiary,
    ]);
    let feeTimeVault = await initContract("FeeTimeVault", accounts.deployer, [lockPeriod, sandToken.address]);
    let {timestamp} = await ethers.provider.getBlock("latest");
    console.log(`startTime = ${timestamp}`);
    let feeDist = await initContract("FeeDistributor", accounts.deployer, [
      [accounts.others[0], accounts.others[1], feeTimeVault.address],
      percentages,
    ]);
    await feeTimeVault.connect(ethers.provider.getSigner(accounts.deployer)).setFeeDistributor(feeDist.address);
    return {feeTimeVault, feeDist, sandToken};
  }
  async function initContract(contractName, deployer, params) {
    const ethersFactory = await ethers.getContractFactory(contractName, deployer);
    let contractRef = await ethersFactory.deploy(...params);
    return contractRef;
  }

  async function fundContract(address, value) {
    let accounts = await getNamedAccounts();
    await deployments.rawTx({
      to: address,
      from: accounts.deployer,
      value,
    });
  }

  async function fundContractWithSand(feeDistContractAdd, sandContract, beneficiary, amount) {
    let tx = await sandContract.connect(ethers.provider.getSigner(beneficiary)).transfer(feeDistContractAdd, amount);
    await tx.wait();
  }
  it("Single deposit with withdraw after lock period", async function () {
    let lockPeriod = 10;
    let percentages = [2000, 2000, 6000];
    let {deployer, sandBeneficiary} = await getNamedAccounts();
    let {feeTimeVault, feeDist, sandToken} = await initContracts(lockPeriod, percentages);
    let amount = BigNumber.from("800000000000000000");
    await fundContractWithSand(feeDist.address, sandToken, sandBeneficiary, amount);
    let tx = await feeTimeVault.connect(ethers.provider.getSigner(deployer)).sync();
    await tx.wait();
    let {timestamp} = await ethers.provider.getBlock("latest");
    let lockPeriodInSecs = 60 * 60 * 24 * lockPeriod;
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + lockPeriodInSecs]);
    tx = await feeTimeVault.connect(ethers.provider.getSigner(deployer)).withdraw();
    await tx.wait();
    let balanceAfter = await sandToken.balanceOf(deployer);
    expect(balanceAfter).to.equal(amount.mul(BigNumber.from(percentages[2])).div(BigNumber.from(10000)));
  });
  it("Single deposit with withdraw before lock period should fail", async function () {
    let lockPeriod = 10;
    let percentages = [2000, 2000, 6000];
    let {deployer, sandBeneficiary} = await getNamedAccounts();
    let {feeTimeVault, feeDist, sandToken} = await initContracts(lockPeriod, percentages);
    let amount = BigNumber.from("800000000000000000");
    await fundContractWithSand(feeDist.address, sandToken, sandBeneficiary, amount);
    let tx = await feeTimeVault.connect(ethers.provider.getSigner(deployer)).sync();
    await tx.wait();
    let {timestamp} = await ethers.provider.getBlock("latest");
    let nineDaysInSecs = 60 * 60 * 24 * (lockPeriod - 1);
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + nineDaysInSecs]);
    await expectRevert(feeTimeVault.connect(ethers.provider.getSigner(deployer)).withdraw());
  });
  it("deposit that hasn't synced in the same day should be delayed", async function () {
    let lockPeriod = 10;
    let percentages = [2000, 2000, 6000];
    let {deployer, sandBeneficiary} = await getNamedAccounts();
    let {feeTimeVault, feeDist, sandToken} = await initContracts(lockPeriod, percentages);
    let firstAmount = BigNumber.from("800000000000000000");
    let dayInSecs = 60 * 60 * 24;
    await fundContractWithSand(feeDist.address, sandToken, sandBeneficiary, firstAmount);
    let {timestamp} = await ethers.provider.getBlock("latest");
    console.log(`before first change = ${timestamp}`);
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + dayInSecs]);
    let secondAmount = BigNumber.from("100000000000000000");
    await fundContractWithSand(feeDist.address, sandToken, sandBeneficiary, secondAmount);
    let tx = await feeTimeVault.connect(ethers.provider.getSigner(deployer)).sync();
    await tx.wait();
    timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    console.log(`before second change = ${timestamp}`);
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + (lockPeriod - 2) * dayInSecs]);
    await expectRevert(feeTimeVault.connect(ethers.provider.getSigner(deployer)).withdraw());
    timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    console.log(`before third change = ${timestamp}`);
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + lockPeriod * dayInSecs]);
    tx = await feeTimeVault.connect(ethers.provider.getSigner(deployer)).withdraw();
    await tx.wait();
    timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    console.log(`after third change = ${timestamp}`);
    let balanceAfter = await sandToken.balanceOf(deployer);
    let amount = firstAmount.add(secondAmount);
    expect(balanceAfter).to.equal(amount.mul(BigNumber.from(percentages[2])).div(BigNumber.from(10000)));
  });
});
