const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const MerkleTree = require("../../lib/merkleTree");
const {getChainCurrentTime} = require("testUtils");
const {createDataArray} = require("../../lib/merkleTreeHelper");

let saleStart;
let saleDuration;
let saleEnd;
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";
// const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
// const emptyReferral = "0x";
// const referralLinkValidity = 60 * 60 * 24 * 30;

module.exports.setupLandSale = deployments.createFixture(async () => {
  const {landSaleAdmin, landSaleBeneficiary, landAdmin, sandAdmin, others} = await getNamedAccounts();

  const testLands = [
    {
      x: 400,
      y: 106,
      size: 1,
      price: "4047",
      reserved: others[1],
      salt: "0x1111111111111111111111111111111111111111111111111111111111111111",
    },
    {
      x: 120,
      y: 144,
      size: 12,
      price: "2773",
      salt: "0x1111111111111111111111111111111111111111111111111111111111111112",
    },
    {
      x: 288,
      y: 144,
      size: 12,
      price: "1358",
      salt: "0x1111111111111111111111111111111111111111111111111111111111111113",
    },
    {
      x: 36,
      y: 114,
      size: 6,
      price: "3169",
      salt: "0x1111111111111111111111111111111111111111111111111111111111111114",
    },
    {
      x: 308,
      y: 282,
      size: 1,
      price: "8465",
      salt: "0x1111111111111111111111111111111111111111111111111111111111111115",
    },
    {
      x: 308,
      y: 281,
      size: 1,
      price: "8465",
      salt: "0x1111111111111111111111111111111111111111111111111111111111111116",
    },
  ];

  await deployments.fixture();

  const landSaleContract = await ethers.getContract("LandPreSale_2");
  const landContract = await ethers.getContract("Land");
  const sandContract = await ethers.getContract("Sand");
  const fakeDAIContract = await ethers.getContract("DAI");

  const contracts = {
    LandSale: landSaleContract,
    Land: landContract,
    Sand: sandContract,
    FakeDAI: fakeDAIContract,
  };

  saleStart = getChainCurrentTime();
  saleDuration = 60 * 60;
  saleEnd = saleStart + saleDuration;
  const daiMedianizer = await ethers.getContract("DAIMedianizer");
  const dai = await ethers.getContract("DAI");
  const landHashArray = createDataArray(testLands);
  const tree = new MerkleTree(landHashArray);
  let contract;
  let ethersFactory;

  ethersFactory = await ethers.getContractFactory("LandSaleWithReferral");

  contract = await ethersFactory.deploy(
    contracts.Land.address,
    contracts.Sand.address,
    contracts.Sand.address,
    landSaleAdmin,
    landSaleBeneficiary,
    tree.getRoot().hash,
    saleEnd,
    daiMedianizer.address,
    dai.address,
    signer,
    maxCommissionRate
  );

  await contract
    .connect(contract.provider.getSigner(landAdmin))
    .functions.setSANDEnabled(true)
    .then((tx) => tx.wait());
  await contracts.Land.connect(contracts.Land.provider.getSigner(landAdmin))
    .setMinter(contract.address, true)
    .then((tx) => tx.wait());
  await contracts.Sand.connect(contracts.Sand.provider.getSigner(sandAdmin))
    .setSuperOperator(contract.address, true)
    .then((tx) => tx.wait());

  return {contract, tree};
});
