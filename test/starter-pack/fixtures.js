const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("ethers");
const {toWei} = require("local-utils");

module.exports.setupStarterPack = deployments.createFixture(async () => {
  const {
    deployer,
    starterPackAdmin,
    starterPackSaleBeneficiary,
    sandAdmin,
    others,
    gemAdmin,
    catalystAdmin,
  } = await getNamedAccounts();
  await deployments.fixture();

  const sandContract = await ethers.getContract("Sand");
  const medianizerContract = await ethers.getContract("DAIMedianizer");
  const daiContract = await ethers.getContract("DAI");
  const starterPackContract = await ethers.getContract("StarterPackV1");
  const metaTxContract = await ethers.getContract("NativeMetaTransactionProcessor");

  const gemAsAdmin = await ethers.getContract("Gem", gemAdmin);
  const catalystAsAdmin = await ethers.getContract("Catalyst", catalystAdmin);
  const sandAsAdmin = await ethers.getContract("Sand", sandAdmin);

  const starterPackContractAsDeployer = await ethers.getContract("StarterPackV1", deployer);
  const starterPackContractAsAdmin = await ethers.getContract("StarterPackV1", starterPackAdmin);
  const starterPackContractAsBeneficiary = await ethers.getContract("StarterPackV1", starterPackSaleBeneficiary);

  const SandAdmin = {
    address: sandAdmin,
    Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
  };

  const DaiAdmin = {
    address: deployer,
    Dai: daiContract.connect(daiContract.provider.getSigner(deployer)),
  };

  await sandAsAdmin.setSuperOperator(starterPackContract.address, true);
  await gemAsAdmin.setSuperOperator(starterPackContract.address, true);
  await catalystAsAdmin.setSuperOperator(starterPackContract.address, true);

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      StarterPack: starterPackContract.connect(starterPackContract.provider.getSigner(other)),
      Sand: sandContract.connect(sandContract.provider.getSigner(other)),
      Dai: daiContract.connect(daiContract.provider.getSigner(other)),
    });
  }

  async function setupUser(StarterPack, SandAdmin, DaiAdmin, user, {hasSand, hasDAI}) {
    if (hasDAI) {
      await DaiAdmin.Dai.transfer(user.address, toWei("1000000"));
      await user.Dai.approve(StarterPack.address, toWei("1000000"));
    }
    if (hasSand) {
      await SandAdmin.Sand.transfer(user.address, BigNumber.from("1000000000000000000000000"));
    }
    if (!hasDAI && !hasSand) {
      await user.Dai.approve(StarterPack.address, toWei("1000000"));
    }
    return user;
  }

  const userWithSAND = await setupUser(starterPackContract, SandAdmin, DaiAdmin, users[0], {
    hasSand: true,
    hasDAI: false,
  });
  const userWithoutSAND = users[2];

  const userWithDAI = await setupUser(starterPackContract, SandAdmin, DaiAdmin, users[0], {
    hasSand: false,
    hasDAI: true,
  });
  const userWithoutDAI = await setupUser(starterPackContract, SandAdmin, DaiAdmin, users[2], {
    hasSand: false,
    hasDAI: false,
  });

  return {
    starterPackContract,
    starterPackContractAsDeployer,
    starterPackContractAsAdmin,
    starterPackContractAsBeneficiary,
    sandContract,
    medianizerContract,
    daiContract,
    metaTxContract,
    users,
    SandAdmin,
    DaiAdmin,
    userWithSAND,
    userWithoutSAND,
    userWithDAI,
    userWithoutDAI,
  };
});
