const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("ethers");
const EstateTestHelper = require("./_testHelper");
const MerkleTree = require("../../lib/merkleTree");
const {createDataArray, calculateLandHash} = require("../../lib/merkleTreeHelper");
const {BigNumber} = require("ethers");

module.exports.setupEstate = deployments.createFixture(async () => {
  const namedAccounts = await getNamedAccounts();
  const minter = namedAccounts.others[4];
  const user0 = namedAccounts.others[0];
  const user1 = namedAccounts.others[2];
  const landAdmin = namedAccounts.landAdmin;
  const estateAdmin = namedAccounts.estateAdmin;

  await deployments.fixture();
  const estateContract = await ethers.getContract("Estate");
  const landContract = await ethers.getContract("Land", minter);
  await landContract
    .connect(landContract.provider.getSigner(landAdmin))
    .functions.setMinter(minter, true)
    .then((tx) => tx.wait());
  return {
    estateContract,
    landContract,
    minter,
    user0,
    user1,
    estateAdmin,
    helper: new EstateTestHelper({
      Estate: estateContract,
      LandFromMinter: landContract,
      Land: landContract,
    }),
  };
});

module.exports.setupEstateSale = deployments.createFixture(async () => {
  const namedAccounts = await getNamedAccounts();
  const minter = namedAccounts.others[4];
  const user0 = namedAccounts.others[0];
  const user1 = namedAccounts.others[1];
  const user2 = namedAccounts.others[2];
  const userWithSand = namedAccounts.others[3];
  const sandBeneficiary = namedAccounts.sandBeneficiary;

  await deployments.fixture();

  const estateContract = await ethers.getContract("Estate");
  const landContract = await ethers.getContract("Land");
  const sandContract = await ethers.getContract("Sand", sandBeneficiary);
  await sandContract.transfer(userWithSand, BigNumber.from("1000000000000000000000000"));

  const saleContract = await ethers.getContract("LandPreSale_5");
  const landSaleDeployment = await deployments.get("LandPreSale_5");
  const lands = landSaleDeployment.linkedData;
  const landHashArray = createDataArray(lands);
  const merkleTree = new MerkleTree(landHashArray);

  await sandContract.connect(sandContract.provider.getSigner(sandAdmin)).setSuperOperator(saleContract.address, true);
  await sandContract
    .connect(sandContract.provider.getSigner(sandAdmin))
    .transfer(user0, BigNumber.from("1000000000000000000000000"));

  return {
    estateContract,
    landContract,
    saleContract,
    minter,
    user0,
    user1,
    user2,
    userWithSand,
    merkleTree,
    lands,
    getProof: (land) => merkleTree.getProof(calculateLandHash(land)),
  };
});
