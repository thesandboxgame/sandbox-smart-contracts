const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
// const LandTestHelper = require("./_testHelper");
const MerkleTree = require("../../lib/merkleTree");
const {tx, getChainCurrentTime} = require("testUtils");
const {createDataArray} = require("../../lib/merkleTreeHelper");

let saleStart;
let saleDuration;
let saleEnd;
let contractName = "LandSaleWithReferral";
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";
// const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
// const emptyReferral = "0x";
// const referralLinkValidity = 60 * 60 * 24 * 30;

module.exports.setupLandSale = deployments.createFixture(async () => {
  const {
    deployer,
    landSaleAdmin,
    landSaleBeneficiary,
    // sandBeneficiary,
    landAdmin,
    sandAdmin,
    others,
  } = await getNamedAccounts();

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

  const contracts = {
    LandSale: await ethers.getContract("LandPreSale_2"),
    Land: await ethers.getContract("Land"),
    Sand: await ethers.getContract("Sand"),
    FakeDAI: await ethers.getContract("Sand"),
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

  // Mock deploy LandSale or LandSaleWithReferral depending on contractName
  // if (contractName === "LandSaleWithReferral") {
  ethersFactory = await ethers.getContractFactory("LandSaleWithReferral");

  console.log("deployer", deployer);
  console.log("contractName", contractName);
  console.log("contracts.Land.address", contracts.Land.address);
  console.log("contracts.Sand.address", contracts.Sand.address);
  console.log("contracts.Sand.address", contracts.Sand.address);
  console.log("landSaleAdmin", landSaleAdmin);
  console.log("landSaleBeneficiary", landSaleBeneficiary);
  console.log("tree.getRoot().hash", tree.getRoot().hash);
  console.log("saleEnd", saleEnd);
  console.log("daiMedianizer.address", daiMedianizer.address);
  console.log("dai.address", dai.address);
  console.log("signer", signer);
  console.log("maxCommissionRate", maxCommissionRate);

  // deployer 0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4
  // contractName LandSaleWithReferral
  // contracts.Land.address 0xDC150Be5AF9874DBc233Fa4Aebb25a252069851b
  // contracts.Sand.address 0x6da02F43c3BdEb30c21b57a24825417F671a8490
  // contracts.Sand.address 0x6da02F43c3BdEb30c21b57a24825417F671a8490
  // landSaleAdmin 0xE5904695748fe4A84b40b3fc79De2277660BD1D3
  // landSaleBeneficiary 0x92561F28Ec438Ee9831D00D1D59fbDC981b762b2
  // tree.getRoot().hash 0xe85c5eb14736ba04e5f85f8a10e9088097c2bc75d51bc9c8ee73531f4a27444a
  // saleEnd 1590423104
  // daiMedianizer.address 0x67e5F24Cf030B41fE01BE75B35D8Ab1Cd4034d5b
  // dai.address 0xCdCccf2288901B0260F591D69E2197c6aEcF208F
  // signer 0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3
  // maxCommissionRate 2000

  // constructor(
  //   address landAddress,
  //   address sandContractAddress,
  //   address initialMetaTx,
  //   address admin,
  //   address payable initialWalletAddress,
  //   bytes32 merkleRoot,
  //   uint256 expiryTime,
  //   address medianizerContractAddress,
  //   address daiTokenContractAddress,
  //   address initialSigningWallet,
  //   uint256 initialMaxCommissionRate
  // )

  contract = await ethersFactory.deploy(
    deployer,
    contractName,
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
  // } else {
  //   ethersFactory = await ethers.getContractFactory("LandPreSale_2");
  //   contract = await ethersFactory.deploy(
  //     deployer,
  //     contractName,
  //     contracts.Land.options.address,
  //     contracts.Sand.options.address,
  //     contracts.Sand.options.address,
  //     landSaleAdmin,
  //     landSaleBeneficiary,
  //     tree.getRoot().hash,
  //     saleEnd
  //   );
  // }
  await tx(contract, "setSANDEnabled", {from: landSaleAdmin, gas: 100000}, true);
  await tx(contracts.Land, "setMinter", {from: landAdmin, gas: 1000000}, contract.options.address, true);
  await tx(contracts.Sand, "setSuperOperator", {from: sandAdmin, gas: 1000000}, contract.options.address, true);

  return {contract, tree};
});
