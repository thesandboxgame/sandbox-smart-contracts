const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");
const {expect} = require("local-chai");
const {expectRevert, zeroAddress} = require("local-utils");

describe("FeeDistributor:ETH", function () {
  async function testEthFeeWithdrawal(account, percentage, amount, contract) {
    let balanceBefore = await ethers.provider.getBalance(account);
    let tx = await contract.connect(ethers.provider.getSigner(account)).withdraw(zeroAddress, account);
    let receipt = await tx.wait();
    let balanceAfter = await ethers.provider.getBalance(account);
    let txFee = tx.gasPrice.mul(receipt.gasUsed);
    let distributionFee = balanceAfter.sub(balanceBefore).add(txFee);
    expect(distributionFee).to.equal(amount.mul(BigNumber.from(percentage)).div(BigNumber.from(10000)));
  }

  async function initContract(recipients, percentages) {
    let accounts = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("FeeDistributor", accounts.deployer);
    let contractRef = await ethersFactory.deploy(recipients, percentages);
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

  it("Empty recipients array should fail", async function () {
    await expectRevert(initContract([], []));
  });
  it("Recipients and percentages array with different lengths should fail", async function () {
    let accounts = await getNamedAccounts();
    await expectRevert(initContract([accounts.others[0], accounts.others[1]], []));
  });
  it("Ether withdrawal by 3 different recipients", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [2000, 2000, 6000];
    let value = BigNumber.from("100000000000000000");
    let contractRef = await initContract([accounts.others[0], accounts.others[1], accounts.others[2]], percentages);
    await fundContract(contractRef.address, value);
    await testEthFeeWithdrawal(accounts.others[0], percentages[0], value, contractRef);
    await testEthFeeWithdrawal(accounts.others[1], percentages[1], value, contractRef);
    await testEthFeeWithdrawal(accounts.others[2], percentages[2], value, contractRef);
  });
  it("Withdrawal of ether from contract with zero balance", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [2000, 2000, 6000];
    let recipients = accounts.others.slice(0, 3);
    let contractRef = await initContract(recipients, percentages);
    await testEthFeeWithdrawal(accounts.others[0], percentages[0], BigNumber.from("0"), contractRef);
  });
  it("Multiple ether funding and withdrawal operations from different recipients", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [2000, 3000, 5000];
    let contractRef = await initContract([accounts.others[0], accounts.others[1], accounts.others[2]], percentages);
    let value1 = BigNumber.from("100000000000000000");
    await fundContract(contractRef.address, value1);
    await testEthFeeWithdrawal(accounts.others[2], percentages[2], value1, contractRef);
    let value2 = BigNumber.from("50000000000000000");
    await fundContract(contractRef.address, value2);
    await testEthFeeWithdrawal(accounts.others[2], percentages[2], value2, contractRef);
    let sum12 = value1.add(value2);
    await testEthFeeWithdrawal(accounts.others[0], percentages[0], sum12, contractRef);
    await testEthFeeWithdrawal(accounts.others[1], percentages[1], sum12, contractRef);
    let value3 = BigNumber.from("6000000000000");
    await fundContract(contractRef.address, value3);
    await testEthFeeWithdrawal(accounts.others[0], percentages[0], value3, contractRef);
    await testEthFeeWithdrawal(accounts.others[1], percentages[1], value3, contractRef);
    await testEthFeeWithdrawal(accounts.others[2], percentages[2], value3, contractRef);
  });
});

describe("FeeDistributor:ERC20", function () {
  async function initContract(recipients, percentages) {
    let accounts = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("FeeDistributor", accounts.deployer);
    let contractRef = await ethersFactory.deploy(recipients, percentages);
    return contractRef;
  }
  async function initERC20Contract() {
    let accounts = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("MockERC20", accounts.deployer);
    let contractRef = await ethersFactory.deploy();
    return contractRef;
  }
  async function fundContractWithTokenFees(feeDistContractAdd, erc20Contract, amount) {
    let accounts = await getNamedAccounts();
    let tx = await erc20Contract.connect(ethers.provider.getSigner(accounts.deployer)).mint(feeDistContractAdd, amount);
    await tx.wait();
  }

  async function fundContractWithSand(feeDistContractAdd, sandContract, beneficiary, amount) {
    let tx = await sandContract.connect(ethers.provider.getSigner(beneficiary)).transfer(feeDistContractAdd, amount);
    await tx.wait();
  }

  async function testERC20FeeWithdrawal(account, percentage, amount, contract, erc20Contract) {
    let balanceBefore = await erc20Contract.balanceOf(account);
    let tx = await contract.connect(ethers.provider.getSigner(account)).withdraw(erc20Contract.address, account);
    await tx.wait();
    let balanceAfter = await erc20Contract.balanceOf(account);
    let distributionFee = balanceAfter.sub(balanceBefore);
    expect(distributionFee).to.equal(amount.mul(BigNumber.from(percentage)).div(BigNumber.from(10000)));
  }

  it("Withdrawal of tokens from contract with zero token balance", async function () {
    let accounts = await getNamedAccounts();
    let recipients = [accounts.others[0], accounts.others[1], accounts.others[2], accounts.others[3]];
    let percentages = [1000, 1500, 2500, 5000];
    let feeDistContract = await initContract(recipients, percentages);
    let erc20Contract = await initERC20Contract();
    await testERC20FeeWithdrawal(recipients[0], percentages[0], BigNumber.from("0"), feeDistContract, erc20Contract);
  });

  it("Percentages array sum not equal 100% should fail", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [5000, 4000];
    let recipients = accounts.others.slice(0, 2);
    await expectRevert(initContract(recipients, percentages));
  });
  it("Two consecutive withdrawals from the same recipient with no deposit in the middle", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [5000, 5000];
    let recipients = accounts.others.slice(0, 2);
    let amount = BigNumber.from("800000000000000000");
    let feeDistContract = await initContract(recipients, percentages);
    let erc20Contract = await initERC20Contract();
    await fundContractWithTokenFees(feeDistContract.address, erc20Contract, amount);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], amount, feeDistContract, erc20Contract);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], BigNumber.from("0"), feeDistContract, erc20Contract);
  });

  it("Tokens withdrawal by 10 different recipients", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [500, 500, 2000, 1000, 2000, 1000, 500, 1000, 500, 1000];
    let recipients = accounts.others.slice(0, 10);
    let amount = BigNumber.from("800000000000000000");
    let feeDistContract = await initContract(recipients, percentages);
    let erc20Contract = await initERC20Contract();
    await fundContractWithTokenFees(feeDistContract.address, erc20Contract, amount);
    for (let i = 0; i < recipients.length; i++) {
      await testERC20FeeWithdrawal(recipients[i], percentages[i], amount, feeDistContract, erc20Contract);
    }
  });

  it("Multiple operations of funding and withdrawal of tokens by different recipients", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [1000, 3000, 2200, 1800, 2000];
    let recipients = accounts.others.slice(0, 5);
    let value1 = BigNumber.from("100000000000000000");
    let feeDistContract = await initContract(recipients, percentages);
    let erc20Contract = await initERC20Contract();
    await fundContractWithTokenFees(feeDistContract.address, erc20Contract, value1);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value1, feeDistContract, erc20Contract);
    let value2 = BigNumber.from("50000000000000000");
    await fundContractWithTokenFees(feeDistContract.address, erc20Contract, value2);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value2, feeDistContract, erc20Contract);
    let sum12 = value1.add(value2);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], sum12, feeDistContract, erc20Contract);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], sum12, feeDistContract, erc20Contract);
    let value3 = BigNumber.from("6000000000000");
    await fundContractWithTokenFees(feeDistContract.address, erc20Contract, value3);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], value3, feeDistContract, erc20Contract);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], value3, feeDistContract, erc20Contract);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value3, feeDistContract, erc20Contract);
  });

  it("Multiple assets funding and withdrawal operations by different recipients", async function () {
    let accounts = await getNamedAccounts();
    let percentages = [1000, 3000, 2200, 1800, 2000];
    let recipients = accounts.others.slice(0, 5);
    let value1 = BigNumber.from("100000000000000000");
    let feeDistContract = await initContract(recipients, percentages);
    let token1 = await initERC20Contract();
    let token2 = await initERC20Contract();
    await fundContractWithTokenFees(feeDistContract.address, token1, value1);
    await fundContractWithTokenFees(feeDistContract.address, token2, value1);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value1, feeDistContract, token1);
    let value2 = BigNumber.from("50000000000000000");
    await fundContractWithTokenFees(feeDistContract.address, token1, value2);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value2, feeDistContract, token1);
    let sum12 = value1.add(value2);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], sum12, feeDistContract, token1);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], sum12, feeDistContract, token1);
    let value3 = BigNumber.from("6000000000000");
    await fundContractWithTokenFees(feeDistContract.address, token1, value3);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], value3, feeDistContract, token1);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], value3, feeDistContract, token1);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value3, feeDistContract, token1);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value1, feeDistContract, token2);
    await fundContractWithTokenFees(feeDistContract.address, token2, value2);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value2, feeDistContract, token2);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], sum12, feeDistContract, token2);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], sum12, feeDistContract, token2);
    await fundContractWithTokenFees(feeDistContract.address, token2, value3);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], value3, feeDistContract, token2);
    await testERC20FeeWithdrawal(recipients[1], percentages[1], value3, feeDistContract, token2);
    await testERC20FeeWithdrawal(recipients[2], percentages[2], value3, feeDistContract, token2);
  });

  it("Sand fees withdrawal", async function () {
    const {sandBeneficiary} = await getNamedAccounts();
    const ethersFactory = await ethers.getContractFactory("Sand", sandBeneficiary);
    let sandContract = await ethersFactory.deploy(sandBeneficiary, sandBeneficiary, sandBeneficiary);
    let accounts = await getNamedAccounts();
    let percentages = [5000, 5000];
    let recipients = accounts.others.slice(0, 2);
    let amount = BigNumber.from("800000000000000000");
    let feeDistContract = await initContract(recipients, percentages);
    await fundContractWithSand(feeDistContract.address, sandContract, sandBeneficiary, amount);
    await testERC20FeeWithdrawal(recipients[0], percentages[0], amount, feeDistContract, sandContract);
  });
});
