const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("ethers");
const {expect} = require("local-chai");
const {waitFor} = require("local-utils");

const DECIMALS_18 = BigNumber.from("1000000000000000000");

function createUser(address, contracts) {
  const user = {
    address,
  };
  for (const name of Object.keys(contracts)) {
    user[name] = contracts[name].connect(ethers.provider.getSigner(address));
  }
  return user;
}

async function setupSale() {
  await deployments.fixture();
  const {deployer, others, sandBeneficiary, sandAdmin, landSaleBeneficiary} = await getNamedAccounts();

  const price = BigNumber.from("1000000000000000000");
  const rate = BigNumber.from("100000000000000000");

  const mockERC20Factory = await ethers.getContractFactory("MockERC20", deployer);
  const mockERC20 = await mockERC20Factory.deploy();
  const sand = await ethers.getContract("Sand", sandBeneficiary);
  const sandAsAdmin = sand.connect(ethers.provider.getSigner(sandAdmin));
  const mockSaleFactory = await ethers.getContractFactory("MockSale", deployer);

  const mockSale = await mockSaleFactory.deploy(sand.address, price); // 1 SAND per amount
  await waitFor(sandAsAdmin.setSuperOperator(mockSale.address, true));

  const fixedExchangeForwarderFactory = await ethers.getContractFactory("ERC20FixedExchangeForwarder", deployer);
  const fixedExchangeForwarder = await fixedExchangeForwarderFactory.deploy(
    sand.address,
    mockERC20.address,
    rate,
    landSaleBeneficiary,
    sandAdmin
  );

  const mockERC20User = createUser(others[0], {
    mockERC20,
    fixedExchangeForwarder,
    mockSale,
  });

  await waitFor(
    mockERC20User.mockERC20.approve(
      fixedExchangeForwarder.address,
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
    )
  );
  await waitFor(mockERC20.mint(mockERC20User.address, "1000000000000000000000")); // 1000 tokens (18 decimals)
  await waitFor(sand.transferFrom(sandBeneficiary, fixedExchangeForwarder.address, "1000000000000000000000000"));

  return {
    rate,
    price,
    mockERC20User,
    sand,
    mockERC20,
    fixedExchangeForwarder,
    mockSale,
  };
}

describe("ERC20FixedExchangeForwarder", function () {
  it("can pay using MockERC0 instead of SAND", async function () {
    const {mockERC20User, sand, mockERC20, fixedExchangeForwarder, mockSale, price, rate} = await setupSale();
    const amount = 2;
    const {to, data} = await mockSale.populateTransaction.purchaseFor(
      fixedExchangeForwarder.address,
      mockERC20User.address,
      amount
    );
    const sandExchangeBalanceBefore = await sand.balanceOf(fixedExchangeForwarder.address);
    const mockERC20BalanceBefore = await mockERC20.balanceOf(mockERC20User.address);
    await waitFor(mockERC20User.fixedExchangeForwarder.forward(to, data));
    const mockERC20BalanceAfter = await mockERC20.balanceOf(mockERC20User.address);
    const sandExchangeBalanceAfter = await sand.balanceOf(fixedExchangeForwarder.address);
    expect(mockERC20BalanceBefore.sub(mockERC20BalanceAfter)).to.equal(price.mul(amount).mul(rate).div(DECIMALS_18));
    expect(sandExchangeBalanceBefore.sub(sandExchangeBalanceAfter)).to.equal(price.mul(amount));
  });
});
