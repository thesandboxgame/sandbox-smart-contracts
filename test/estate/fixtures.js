
const {ethers, deployments, getNamedAccounts} = require('@nomiclabs/buidler');
const EstateTestHelper = require('./_testHelper');
const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash} = require('../../lib/merkleTreeHelper');

module.exports.setupEstate = deployments.createFixture(async () => {
  const namedAccounts = await getNamedAccounts();
  const minter = namedAccounts.others[4];
  const user0 = namedAccounts.others[0];
  const user1 = namedAccounts.others[2];
  const landAdmin = namedAccounts.landAdmin;

  await deployments.fixture();
  const estateContract = await ethers.getContract('Estate');
  const landContract = await ethers.getContract('Land', minter);
  await landContract.connect(landContract.provider.getSigner(landAdmin)).functions.setMinter(minter, true).then((tx) => tx.wait());
  return {
    estateContract,
    landContract,
    minter,
    user0,
    user1,
    helper: new EstateTestHelper({
      Estate: estateContract,
      LandFromMinter: landContract,
      Land: landContract
    })
  };
});

module.exports.setupEstateSale = deployments.createFixture(async () => {
  const namedAccounts = await getNamedAccounts();
  const minter = namedAccounts.others[4];
  const user0 = namedAccounts.others[0];
  const user1 = namedAccounts.others[1];
  const user2 = namedAccounts.others[2];
  
  await deployments.fixture();

  const estateContract = await ethers.getContract('Estate');
  const landContract = await ethers.getContract('Land');

  const saleContract = await ethers.getContract('LandPreSale_4');
  const landSaleDeployment = await deployments.get('LandPreSale_4');
  const lands = landSaleDeployment.linkedData;
  const landHashArray = createDataArray(lands);
  const merkleTree = new MerkleTree(landHashArray);

  return {
    estateContract,
    landContract,
    saleContract,
    minter,
    user0,
    user1,
    user2,
    merkleTree,
    lands,
    getProof: (land) => merkleTree.getProof(calculateLandHash(land))
  };
});