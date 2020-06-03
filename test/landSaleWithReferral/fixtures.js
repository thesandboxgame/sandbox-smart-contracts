// const {utils} = require("ethers");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const MerkleTree = require("../../lib/merkleTree");
const {getChainCurrentTime} = require("testUtils");
const {createDataArray} = require("../../lib/merkleTreeHelper");
const {testLands, generateUserPermissions, setupUser} = require("./_testHelper");

// Inputs
const landSaleName = "LandPreSale_4";
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";
const contractName = "LandSaleWithReferral";

// TODO: refactor the 2 functions below

module.exports.setupLandSaleWithReferral = deployments.createFixture(async () => {
  await deployments.fixture();

  const contracts = {
    landSale: await ethers.getContract(landSaleName),
    land: await ethers.getContract("Land"),
    estate: await ethers.getContract("Estate"),
    sand: await ethers.getContract("Sand"),
    daiMedianizer: await ethers.getContract("DAIMedianizer"),
    fakeDAI: await ethers.getContract("DAI"),
  };
  const saleStart = getChainCurrentTime();
  const saleDuration = 60 * 60;
  const saleEnd = saleStart + saleDuration;
  const roles = await getNamedAccounts();

  // tree
  const deployment = await deployments.get(landSaleName);
  const lands = deployment.linkedData;
  const landHashArray = createDataArray(lands);
  const tree = new MerkleTree(landHashArray);

  let ethersFactory;

  ethersFactory = await ethers.getContractFactory(contractName);

  contracts.landSaleWithReferral = await ethersFactory.deploy(
    contracts.land.address,
    contracts.sand.address,
    contracts.sand.address,
    roles.landSaleAdmin,
    roles.landSaleBeneficiary,
    tree.getRoot().hash,
    saleEnd,
    contracts.daiMedianizer.address,
    contracts.fakeDAI.address,
    signer,
    maxCommissionRate
  );

  const {LandSaleAdmin, LandSaleBeneficiary, LandAdmin, SandAdmin, users} = await generateUserPermissions(
    roles,
    contracts
  );
  await LandAdmin.Land.functions.setMinter(contracts.landSaleWithReferral.address, true).then((tx) => tx.wait());
  await SandAdmin.Sand.functions.setSuperOperator(contracts.landSaleWithReferral.address, true).then((tx) => tx.wait());

  const landPurchaserWithETH = await setupUser(contracts, users[0], {hasSand: false, hasETH: true, hasDAI: false});
  const landPurchaserWithSAND = await setupUser(contracts, users[0], {hasSand: true, hasETH: false, hasDAI: false});
  const landPurchaserWithDAI = await setupUser(contracts, users[0], {hasSand: false, hasETH: false, hasDAI: true});

  return {
    // User types
    landPurchaserWithETH,
    landPurchaserWithSAND,
    landPurchaserWithDAI,
    LandSaleAdmin,
    LandSaleBeneficiary,
    LandAdmin,
    SandAdmin,
    users,

    // Contracts
    contracts,

    // Lands, tree
    lands,
    tree,
  };
});

module.exports.setupTestLandSaleWithReferral = deployments.createFixture(async () => {
  await deployments.fixture();

  const contracts = {
    landSale: await ethers.getContract(landSaleName),
    land: await ethers.getContract("Land"),
    estate: await ethers.getContract("Estate"),
    sand: await ethers.getContract("Sand"),
    daiMedianizer: await ethers.getContract("DAIMedianizer"),
    fakeDAI: await ethers.getContract("DAI"),
  };
  const saleStart = getChainCurrentTime();
  const saleDuration = 60 * 60;
  const saleEnd = saleStart + saleDuration;
  const roles = await getNamedAccounts();

  // testTree
  testLands[0].reserved = roles.others[1];
  const testLandHashArray = createDataArray(testLands);
  const testTree = new MerkleTree(testLandHashArray);

  let ethersFactory;

  ethersFactory = await ethers.getContractFactory(contractName);

  contracts.landSaleWithReferral = await ethersFactory.deploy(
    contracts.land.address,
    contracts.sand.address,
    contracts.sand.address,
    roles.landSaleAdmin,
    roles.landSaleBeneficiary,
    testTree.getRoot().hash,
    saleEnd,
    contracts.daiMedianizer.address,
    contracts.fakeDAI.address,
    signer,
    maxCommissionRate
  );

  const {LandSaleAdmin, LandSaleBeneficiary, LandAdmin, SandAdmin, users} = await generateUserPermissions(
    roles,
    contracts
  );
  await LandAdmin.Land.functions.setMinter(contracts.landSaleWithReferral.address, true).then((tx) => tx.wait());
  await SandAdmin.Sand.functions.setSuperOperator(contracts.landSaleWithReferral.address, true).then((tx) => tx.wait());

  const landPurchaserWithETH = await setupUser(contracts, users[0], {hasSand: false, hasETH: true, hasDAI: false});
  const landPurchaserWithSAND = await setupUser(contracts, users[0], {hasSand: true, hasETH: false, hasDAI: false});
  const landPurchaserWithDAI = await setupUser(contracts, users[0], {hasSand: false, hasETH: false, hasDAI: true});

  return {
    // User types
    landPurchaserWithETH,
    landPurchaserWithSAND,
    landPurchaserWithDAI,
    LandSaleAdmin,
    LandSaleBeneficiary,
    LandAdmin,
    SandAdmin,
    users,

    // Contracts
    contracts,

    // testTree
    testLands,
    testTree,
  };
});
