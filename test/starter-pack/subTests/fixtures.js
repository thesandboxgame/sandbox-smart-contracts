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

  const gemContract = await ethers.getContract("Gem");
  const catalystContract = await ethers.getContract("Catalyst");

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

  // Give users funds
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

  // Give StarterPackV1 contract the option to have Catalysts & Gems
  const ERC20SubTokenCommon = await ethers.getContract("CommonCatalyst");
  const ERC20SubTokenRare = await ethers.getContract("RareCatalyst");
  const ERC20SubTokenEpic = await ethers.getContract("EpicCatalyst");
  const ERC20SubTokenLegendary = await ethers.getContract("LegendaryCatalyst");
  const ERC20SubTokenPower = await ethers.getContract("PowerGem");
  const ERC20SubTokenDefense = await ethers.getContract("DefenseGem");
  const ERC20SubTokenSpeed = await ethers.getContract("SpeedGem");
  const ERC20SubTokenMagic = await ethers.getContract("MagicGem");
  const ERC20SubTokenLuck = await ethers.getContract("LuckGem");

  async function setupSupply() {
    await catalystAsAdmin.batchMint(starterPackContract.address, [0, 1, 2, 3], [8, 6, 4, 2]);
    await gemAsAdmin.batchMint(starterPackContract.address, [0, 1, 2, 3, 4], [100, 100, 100, 100, 100]);
  }

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
    catalystContract,
    gemContract,
    setupSupply,
    ERC20SubTokenCommon,
    ERC20SubTokenRare,
    ERC20SubTokenEpic,
    ERC20SubTokenLegendary,
    ERC20SubTokenPower,
    ERC20SubTokenDefense,
    ERC20SubTokenSpeed,
    ERC20SubTokenMagic,
    ERC20SubTokenLuck,
  };
});

module.exports.supplyStarterPack = deployments.createFixture(async () => {
  const setup = await this.setupStarterPack();
  const {
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
    catalystContract,
    gemContract,
    setupSupply,
    ERC20SubTokenCommon,
    ERC20SubTokenRare,
    ERC20SubTokenEpic,
    ERC20SubTokenLegendary,
    ERC20SubTokenPower,
    ERC20SubTokenDefense,
    ERC20SubTokenSpeed,
    ERC20SubTokenMagic,
    ERC20SubTokenLuck,
  } = setup;
  await setupSupply();
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
    catalystContract,
    gemContract,
    ERC20SubTokenCommon,
    ERC20SubTokenRare,
    ERC20SubTokenEpic,
    ERC20SubTokenLegendary,
    ERC20SubTokenPower,
    ERC20SubTokenDefense,
    ERC20SubTokenSpeed,
    ERC20SubTokenMagic,
    ERC20SubTokenLuck,
  };
});
