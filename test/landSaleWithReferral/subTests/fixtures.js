// const {utils} = require("ethers");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const MerkleTree = require("../../../lib/merkleTree");
const {getChainCurrentTime} = require("testUtils");
const {createDataArray} = require("../../../lib/merkleTreeHelper");
const {testLands, generateUserPermissions, setupUser} = require("./_testHelper");

// Inputs
const landSaleName = "LandPreSale_4";
const maxCommissionRate = "2000";
const signer = "0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3";
const contractName = "LandSaleWithReferral";

module.exports.setupLandSaleWithReferral = async (landType) => {
  const {
    landPurchaserWithSAND,
    secondLandPurchaserWithSAND,
    landPurchaserWithDAI,
    secondLandPurchaserWithDAI,
    LandSaleAdmin,
    LandSaleBeneficiary,
    LandAdmin,
    SandAdmin,
    users,
    contracts,
    lands,
    tree,
    saleEnd,
  } = await deployments.createFixture(async () => {
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

    let tree;
    let lands;

    // Supply a tree made from real lands or testLands
    if (landType === "lands") {
      const deployment = await deployments.get(landSaleName);
      lands = deployment.linkedData;
      const landHashArray = createDataArray(lands);
      tree = new MerkleTree(landHashArray);
    } else if (landType === "testLands") {
      testLands[0].reserved = roles.others[1];
      lands = testLands;
      const testLandHashArray = createDataArray(lands);
      tree = new MerkleTree(testLandHashArray);
    }

    const ethersFactory = await ethers.getContractFactory(contractName);

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
    await SandAdmin.Sand.functions
      .setSuperOperator(contracts.landSaleWithReferral.address, true)
      .then((tx) => tx.wait());

    const landPurchaserWithSAND = await setupUser(SandAdmin, contracts, users[0], {hasSand: true, hasDAI: false});
    const secondLandPurchaserWithSAND = await setupUser(SandAdmin, contracts, users[1], {hasSand: true, hasDAI: false});

    const landPurchaserWithDAI = await setupUser(SandAdmin, contracts, users[0], {hasSand: false, hasDAI: true});
    const secondLandPurchaserWithDAI = await setupUser(SandAdmin, contracts, users[1], {hasSand: false, hasDAI: true});

    return {
      landPurchaserWithSAND,
      secondLandPurchaserWithSAND,
      landPurchaserWithDAI,
      secondLandPurchaserWithDAI,
      LandSaleAdmin,
      LandSaleBeneficiary,
      LandAdmin,
      SandAdmin,
      users,
      contracts,
      lands,
      tree,
      saleEnd,
    };
  })();

  return {
    // User types
    landPurchaserWithSAND,
    secondLandPurchaserWithSAND,
    landPurchaserWithDAI,
    secondLandPurchaserWithDAI,
    LandSaleAdmin,
    LandSaleBeneficiary,
    LandAdmin,
    SandAdmin,
    users,

    // Contracts
    contracts,

    // Timing
    saleEnd,

    // Lands, tree
    lands,
    tree,
  };
};
