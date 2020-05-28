const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const MerkleTree = require("../../lib/merkleTree");
const {getChainCurrentTime} = require("testUtils");
const {createDataArray} = require("../../lib/merkleTreeHelper");
const {testLands} = require("./_testHelper");

let saleStart;
let saleDuration;
let saleEnd;
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";
// const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
// const emptyReferral = "0x";
// const referralLinkValidity = 60 * 60 * 24 * 30;

module.exports.setupLandSaleWithReferral = deployments.createFixture(async () => {
  const {landSaleAdmin, landSaleBeneficiary, landAdmin, sandAdmin, others} = await getNamedAccounts();

  // testLands have been moved to _testHelper file, so here we set the reserved account in first testLand
  testLands[0].reserved = others[1];

  await deployments.fixture();

  const landSaleContract = await ethers.getContract("LandPreSale_2");
  const landContract = await ethers.getContract("Land");
  const sandContract = await ethers.getContract("Sand");
  const fakeDAIContract = await ethers.getContract("DAI");

  saleStart = getChainCurrentTime();
  saleDuration = 60 * 60;
  saleEnd = saleStart + saleDuration;
  const daiMedianizer = await ethers.getContract("DAIMedianizer");
  const dai = await ethers.getContract("DAI");
  const landHashArray = createDataArray(testLands);
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

  // await contract.deployed(); commented out as not necessary for contract to be successfully returned below

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
    sandContract,
    fakeDAIContract,
    landSaleAdmin,
    landSaleBeneficiary,
    landAdmin,
    sandAdmin,
    others,
  };
});
