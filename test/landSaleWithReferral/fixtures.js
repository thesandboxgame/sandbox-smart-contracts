// const {utils} = require("ethers");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const MerkleTree = require("../../lib/merkleTree");
const {getChainCurrentTime, toWei} = require("testUtils");
const {createDataArray} = require("../../lib/merkleTreeHelper");
// const {testLands} = require("./_testHelper"); // currently not used

const landSaleName = "LandPreSale_4";
let saleStart;
let saleDuration;
let saleEnd;
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";

module.exports.setupLandSaleWithReferral = deployments.createFixture(async () => {
  const {landSaleAdmin, landSaleBeneficiary, landAdmin, sandAdmin, others} = await getNamedAccounts();

  // testLands have been moved to _testHelper file, so here we set the reserved account in first testLand
  // testLands[0].reserved = others[1]; // currently not used

  await deployments.fixture();

  const landSaleContract = await ethers.getContract(landSaleName);
  const landContract = await ethers.getContract("Land");
  const estateContract = await ethers.getContract("Estate");
  const sandContract = await ethers.getContract("Sand");
  const fakeDAIContract = await ethers.getContract("DAI");

  saleStart = getChainCurrentTime();
  saleDuration = 60 * 60;
  saleEnd = saleStart + saleDuration;
  const daiMedianizer = await ethers.getContract("DAIMedianizer");
  const dai = await ethers.getContract("DAI");

  const deployment = await deployments.get(landSaleName);
  lands = deployment.linkedData;
  const landHashArray = createDataArray(lands);
  const tree = new MerkleTree(landHashArray);

  let landSaleWithReferralContract;
  let ethersFactory;

  ethersFactory = await ethers.getContractFactory("LandSaleWithReferral");

  landSaleWithReferralContract = await ethersFactory.deploy(
    landContract.address,
    sandContract.address,
    sandContract.address,
    landSaleAdmin,
    landSaleBeneficiary,
    tree.getRoot().hash,
    saleEnd,
    daiMedianizer.address,
    dai.address,
    signer,
    maxCommissionRate
  );

  // deployed = await landSaleWithReferralContract.deployed();
  // deployedAddress = deployed.address;

  // Initial contract set up for testing with Ether, SAND and DAI
  await landContract
    .connect(landContract.provider.getSigner(landAdmin))
    .setMinter(landSaleWithReferralContract.address, true)
    .then((tx) => tx.wait());
  await sandContract
    .connect(sandContract.provider.getSigner(sandAdmin))
    .setSuperOperator(landSaleWithReferralContract.address, true)
    .then((tx) => tx.wait());

  return {
    landSaleWithReferralContract,
    tree,
    landSaleContract,
    landContract,
    estateContract,
    sandContract,
    fakeDAIContract,
    landSaleAdmin,
    landSaleBeneficiary,
    landAdmin,
    sandAdmin,
    others,
  };
});

module.exports.setupLandSaleWithReferralUsers = deployments.createFixture(async () => {
  const {
    landSaleWithReferralContract,
    tree,
    landSaleContract,
    landContract,
    estateContract,
    sandContract,
    fakeDAIContract,
    landSaleAdmin,
    landSaleBeneficiary,
    landAdmin,
    sandAdmin,
    others,
  } = await this.setupLandSaleWithReferral();

  // TODO - review users
  const LandSaleAdmin = {
    address: landSaleAdmin,
    LandSaleWithReferral: landSaleWithReferralContract.connect(
      landSaleWithReferralContract.provider.getSigner(landSaleAdmin)
    ),
    Land: await ethers.getContract("Land", landSaleAdmin),
    Estate: await ethers.getContract("Estate", landSaleAdmin),
    LandSale: await ethers.getContract(landSaleName, landSaleAdmin),
    Sand: await ethers.getContract("Sand", landSaleAdmin),
    FakeDAI: await ethers.getContract("DAI", landSaleAdmin),
  };

  const LandSaleBeneficiary = {
    address: landSaleBeneficiary,
    LandSaleWithReferral: landSaleWithReferralContract.connect(
      landSaleWithReferralContract.provider.getSigner(landSaleBeneficiary)
    ),
    Land: await ethers.getContract("Land", landSaleBeneficiary),
    Estate: await ethers.getContract("Estate", landSaleBeneficiary),
    LandSale: await ethers.getContract(landSaleName, landSaleBeneficiary),
    Sand: await ethers.getContract("Sand", landSaleBeneficiary),
    FakeDAI: await ethers.getContract("DAI", landSaleBeneficiary),
  };

  const LandAdmin = {
    address: landAdmin,
    LandSaleWithReferral: landSaleWithReferralContract.connect(
      landSaleWithReferralContract.provider.getSigner(landAdmin)
    ),
    Land: await ethers.getContract("Land", landAdmin),
    Estate: await ethers.getContract("Estate", landAdmin),
    LandSale: await ethers.getContract(landSaleName, landAdmin),
    Sand: await ethers.getContract("Sand", landAdmin),
    FakeDAI: await ethers.getContract("DAI", landAdmin),
  };

  const SandAdmin = {
    address: sandAdmin,
    LandSaleWithReferral: landSaleWithReferralContract.connect(
      landSaleWithReferralContract.provider.getSigner(sandAdmin)
    ),
    Land: await ethers.getContract("Land", sandAdmin),
    Estate: await ethers.getContract("Estate", sandAdmin),
    LandSale: await ethers.getContract(landSaleName, sandAdmin),
    Sand: await ethers.getContract("Sand", sandAdmin),
    FakeDAI: await ethers.getContract("DAI", sandAdmin),
  };

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      LandSaleWithReferral: landSaleWithReferralContract.connect(
        landSaleWithReferralContract.provider.getSigner(other)
      ),
      Land: await ethers.getContract("Land", other),
      Estate: await ethers.getContract("Estate", other),
      LandSale: await ethers.getContract(landSaleName, other),
      Sand: await ethers.getContract("Sand", other),
      FakeDAI: await ethers.getContract("DAI", other),
    });
  }

  async function setupUser(userType, {hasSand, hasETH, hasDAI}) {
    if (hasDAI) {
      // TODO
    }
    if (hasSand) {
      // TODO
      // const balance = await sandContract.provider.getBalance(userType.address);
      // console.log(utils.formatEther(balance)); // 10000.0
      // await sandContract.transfer(userType.address, toWei(1000)); // revert not enough fund
    }
    return userType;
  }

  const landPurchaserWithETH = await setupUser(users[0], {hasSand: false, hasETH: true, hasDAI: false});
  const landPurchaserWithSAND = await setupUser(users[0], {hasSand: true, hasETH: false, hasDAI: false});
  const landPurchaserWithDAI = await setupUser(users[0], {hasSand: false, hasETH: false, hasDAI: true});

  return {
    landPurchaserWithETH,
    landPurchaserWithSAND,
    landPurchaserWithDAI,
    landSaleWithReferralContract,
    tree,
    landSaleContract,
    landContract,
    estateContract,
    sandContract,
    fakeDAIContract,
    LandSaleAdmin,
    LandSaleBeneficiary,
    LandAdmin,
    SandAdmin,
    users,
  };
});
