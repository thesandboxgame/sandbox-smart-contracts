import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import {createAssetAndLandClaimMerkleTree} from '../../data/multi_giveaway_1/getClaims';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayClaimableAssetsAndLands} = helpers;
import {default as testData} from '../../data/multi_giveaway_1/testClaims.json';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

type Options = {
  mint?: boolean;
  assetsHolder?: boolean;
  landHolder?: boolean;
};

export const setupTestGiveaway = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, assetsHolder, landHolder} = options || {};
  const {
    deployer,
    assetAdmin,
    assetBouncerAdmin,
    landAdmin,
    nftGiveawayAdmin,
  } = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('Multi_Giveaway_1');
  const sandContract = await ethers.getContract('Sand');
  const assetContract = await ethers.getContract('Asset');

  await deployments.deploy('MockLand', {
    from: deployer,
    args: [sandContract.address, landAdmin],
  });

  const landContract = await ethers.getContract('MockLand');

  const landContractAsAdmin = await landContract.connect(
    ethers.provider.getSigner(landAdmin)
  );

  const emptyBytes32 =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';
  const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

  const testContract = await deployments.deploy('Test_Multi_Giveaway_1', {
    from: deployer,
    contract: 'MultiGiveaway',
    args: [
      assetContract.address,
      landContract.address,
      nftGiveawayAdmin,
      emptyBytes32,
      assetsHolder ? others[5] : ASSETS_HOLDER,
      landHolder ? others[5] : LAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ],
  });

  if (assetsHolder) {
    const assetContractAsAdmin = await assetContract.connect(
      ethers.provider.getSigner(assetAdmin)
    );
    await assetContractAsAdmin.setSuperOperator(testContract.address, true);
  }

  if (landHolder) {
    await landContractAsAdmin.setSuperOperator(testContract.address, true);
  }

  // Supply assets to contract for testing
  async function mintTestAssets(id: number, value: number) {
    const assetContractAsBouncer = await assetContract.connect(
      ethers.provider.getSigner(assetBouncerAdmin)
    );

    // Asset to be minted
    const creator = others[0];
    const packId = id;
    const hash = ipfsHashString;
    const supply = value;
    const rarity = 1;
    const owner = assetsHolder ? others[5] : testContract.address;
    const data = '0x';

    const receipt = await waitFor(
      assetContractAsBouncer.mint(
        creator,
        packId,
        hash,
        supply,
        rarity,
        owner,
        data
      )
    );

    const transferEvent = await expectReceiptEventWithArgs(
      receipt,
      'TransferSingle'
    );

    const balanceAssetId = await assetContract['balanceOf(address,uint256)'](
      assetsHolder ? others[5] : testContract.address,
      transferEvent.args[3]
    );
    expect(balanceAssetId).to.equal(supply);
    return transferEvent.args[3].toString(); // asset ID
  }

  // Supply lands to contract for testing
  async function mintTestLands() {
    const owner = landHolder ? others[5] : testContract.address;
    for (let i = 0; i < 8; i++) {
      await landContractAsAdmin.mint(owner, i);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataWithIds: any = testData;

  async function mintNewAssetIds() {
    return await Promise.all(
      testData.map(async (claim: any) => {
        if (claim.assetIds) {
          const newClaim = {
            ...claim,
            assetIds: await Promise.all(
              claim.assetIds.map(
                async (assetPackId: number, index: number) =>
                  await mintTestAssets(assetPackId, claim.assetValues[index])
              )
            ),
          };
          return newClaim;
        } else return claim;
      })
    );
  }

  if (mint) {
    const claimsWithAssetIds = await mintNewAssetIds();
    dataWithIds = claimsWithAssetIds;
    await mintTestLands();
  }

  // Set up tree with test assets
  const {claims, merkleRootHash} = createAssetAndLandClaimMerkleTree(
    network.live,
    chainId,
    dataWithIds
  );

  // Update the deployment with test asset data
  const deployment = await deployments.get('Test_Multi_Giveaway_1');
  deployment.linkedData = claims;
  await deployments.save('Test_Multi_Giveaway_1', deployment);

  const giveawayContract = await ethers.getContract('Test_Multi_Giveaway_1');
  const giveawayContractAsAdmin = await giveawayContract.connect(
    ethers.provider.getSigner(nftGiveawayAdmin)
  );

  const updatedDeployment = await deployments.get('Test_Multi_Giveaway_1');
  const updatedClaims = updatedDeployment.linkedData;
  const assetAndLandHashArray = createDataArrayClaimableAssetsAndLands(
    updatedClaims
  );
  const tree = new MerkleTree(assetAndLandHashArray);
  await giveawayContractAsAdmin.setMerkleRoot(merkleRootHash); // Set the merkleRoot which could not have been known prior to generating the test asset IDs

  return {
    giveawayContract,
    sandContract,
    assetContract,
    landContract,
    others,
    tree,
    claims: updatedClaims,
    nftGiveawayAdmin,
    merkleRootHash,
  };
});

export const setupGiveaway = deployments.createFixture(async function () {
  const {nftGiveawayAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('Multi_Giveaway_1');
  const giveawayContract = await ethers.getContract('Multi_Giveaway_1');
  const sandContract = await ethers.getContract('Sand');
  const assetContract = await ethers.getContract('Asset');
  const landContract = await ethers.getContract('Land');
  const deployment = await deployments.get('Multi_Giveaway_1');

  // Set up tree with real assets
  const claims = deployment.linkedData;
  const assetAndLandHashArray = createDataArrayClaimableAssetsAndLands(claims);
  const tree = new MerkleTree(assetAndLandHashArray);

  return {
    giveawayContract,
    sandContract,
    assetContract,
    landContract,
    others,
    tree,
    claims,
    nftGiveawayAdmin,
  };
});
