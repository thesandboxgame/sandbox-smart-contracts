const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {expect} = require("local-chai");
const {waitFor} = require("local-utils");

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
  const mockERC20Factory = await ethers.getContractFactory("MockERC20", deployer);
  const mockERC20 = await mockERC20Factory.deploy();
  const sand = await ethers.getContract("Sand", sandBeneficiary);
  const sandAsAdmin = sand.connect(ethers.provider.getSigner(sandAdmin));
  const mockSaleFactory = await ethers.getContractFactory("MockSale", deployer);
  const mockSale = await mockSaleFactory.deploy(sand.address, "1000000000000000000"); // 1 SAND per amount
  await waitFor(sandAsAdmin.setSuperOperator(mockSale.address, true));

  const fixedExchangeForwarderFactory = await ethers.getContractFactory("ERC20FixedExchangeForwarder", deployer);
  const fixedExchangeForwarder = await fixedExchangeForwarderFactory.deploy(
    sand.address,
    mockERC20.address,
    "100000000000000000", // 1/10
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
    mockERC20User,
    sand,
    mockERC20,
    fixedExchangeForwarder,
    mockSale,
  };
}

describe("ERC20FixedExchangeForwarder", function () {
  it("can pay using MockERC0 instead of SAND", async function () {
    const {mockERC20User, sand, mockERC20, fixedExchangeForwarder, mockSale} = await setupSale();
    const {to, data} = await mockSale.purchaseFor(fixedExchangeForwarder.address, mockERC20User.address, 1);
    await waitFor(mockERC20User.fixedExchangeForwarder.forward(to, data));
  });
});
