import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import MerkleTree from '../../lib/merkleTree';
import {createLandClaimMerkleTree} from '../../data/giveaways/land_giveaway_1/getLands';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayClaimableAssetsLandsAndSand} = helpers;
import {default as testLandData} from '../../data/giveaways/land_giveaway_1/testLands.json';

type Options = {
  mint?: boolean;
  landHolder?: boolean;
};

export const setupTestGiveaway = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, landHolder} = options || {};
  const {deployer, landAdmin, nftGiveawayAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('Land_Giveaway_1');
  const sandContract = await ethers.getContract('Sand');

  const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

  // Set up tree with test assets
  const {lands, merkleRootHash} = createLandClaimMerkleTree(
    network.live,
    chainId,
    testLandData
  );

  await deployments.deploy('MockLand', {
    from: deployer,
    args: [sandContract.address, landAdmin],
  });

  const landContract = await ethers.getContract('MockLand');

  const landContractAsAdmin = await landContract.connect(
    ethers.provider.getSigner(landAdmin)
  );

  const testContract = await deployments.deploy('Test_Land_Giveaway_1', {
    from: deployer,
    contract: 'LandGiveaway',
    linkedData: lands,
    args: [
      landContract.address,
      nftGiveawayAdmin,
      merkleRootHash,
      landHolder ? others[5] : LAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ],
  });

  if (landHolder) {
    await landContractAsAdmin.setSuperOperator(testContract.address, true);
  }

  // Supply lands to contract for testing
  async function mintTestLands() {
    const owner = landHolder ? others[5] : testContract.address;
    for (let i = 0; i < 40; i++) {
      await landContractAsAdmin.mint(owner, i);
    }
  }

  if (mint) {
    await mintTestLands();
  }

  const giveawayContract = await ethers.getContract('Test_Land_Giveaway_1');

  const landHashArray = createDataArrayClaimableAssetsLandsAndSand(lands);
  const tree = new MerkleTree(landHashArray);

  return {
    giveawayContract,
    sandContract,
    landContract,
    others,
    tree,
    lands,
    nftGiveawayAdmin,
    merkleRootHash,
  };
});

export const setupGiveaway = deployments.createFixture(async function () {
  const {nftGiveawayAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('Land_Giveaway_1');
  const giveawayContract = await ethers.getContract('Land_Giveaway_1');
  const sandContract = await ethers.getContract('Sand');
  const landContract = await ethers.getContract('Land');
  const deployment = await deployments.get('Land_Giveaway_1');

  // Set up tree with real lands
  const lands = deployment.linkedData;
  const landHashArray = createDataArrayClaimableAssetsLandsAndSand(lands);
  const tree = new MerkleTree(landHashArray);

  return {
    giveawayContract,
    sandContract,
    landContract,
    others,
    tree,
    lands,
    nftGiveawayAdmin,
  };
});
