import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import getAssets from '../../data/asset_giveaway_1/getAssets';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayAssets} = helpers;
import * as testAssetData from '../../data/asset_giveaway_1/testAssets.json';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

type options = {
  mint?: boolean;
  assetsHolder?: boolean;
};

export const setupTestGiveaway: (
  options: options
) => any = deployments.createFixture(async function (hre, options: any) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, assetsHolder} = options;
  const {
    deployer,
    assetAdmin,
    assetBouncerAdmin,
    nftGiveawayAdmin,
  } = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('NFT_Lottery_1');
  const sandContract = await ethers.getContract('Sand');
  const assetContract = await ethers.getContract('Asset');

  const emptyBytes32 =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';

  const testContract = await deployments.deploy('Test_NFT_Lottery_1', {
    from: deployer,
    contract: 'AssetGiveaway',
    args: [
      assetContract.address,
      nftGiveawayAdmin,
      emptyBytes32,
      assetsHolder ? others[5] : ASSETS_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ],
  });

  if (assetsHolder) {
    const assetContractAsAdmin = await assetContract.connect(
      ethers.provider.getSigner(assetAdmin)
    );
    await assetContractAsAdmin.setSuperOperator(testContract.address, true);
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

  // TODO: types
  const dataWithIds: any = {...testAssetData};

  async function mintAssetsWithNewIds() {
    return await Promise.all(
      testAssetData.assets.map(async (claim) => {
        return {
          assetValues: claim.assetValues,
          reservedAddress: claim.reservedAddress,
          assetIds: await Promise.all(
            claim.assetIds.map(
              async (assetPackId) =>
                await mintTestAssets(
                  assetPackId,
                  claim.assetValues[assetPackId]
                )
            )
          ),
        };
      })
    );
  }

  if (mint) {
    const assetsWithIds = await mintAssetsWithNewIds();
    dataWithIds.assets = assetsWithIds;
  }

  // Set up tree with test assets
  const {assets, merkleRootHash} = getAssets(
    network.live,
    chainId,
    dataWithIds
  );

  // Update the deployment with test asset data
  const deployment = await deployments.get('Test_NFT_Lottery_1');
  deployment.linkedData = assets;
  await deployments.save('Test_NFT_Lottery_1', deployment);

  const giveawayContract = await ethers.getContract('Test_NFT_Lottery_1');
  const giveawayContractAsAdmin = await giveawayContract.connect(
    ethers.provider.getSigner(nftGiveawayAdmin)
  );

  const updatedDeployment = await deployments.get('Test_NFT_Lottery_1');
  const updatedAssets = updatedDeployment.linkedData;
  const assetHashArray = createDataArrayAssets(updatedAssets);
  const tree = new MerkleTree(assetHashArray);
  await giveawayContractAsAdmin.setMerkleRoot(merkleRootHash); // Set the merkleRoot which could not have been known prior to generating the test asset IDs

  return {
    giveawayContract,
    sandContract,
    assetContract,
    others,
    tree,
    assets: updatedAssets,
    nftGiveawayAdmin,
    merkleRootHash,
  };
});

export const setupGiveaway: (
  options: options
) => any = deployments.createFixture(async function () {
  const {nftGiveawayAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('NFT_Lottery_1');
  const giveawayContract = await ethers.getContract('NFT_Lottery_1');
  const sandContract = await ethers.getContract('Sand');
  const assetContract = await ethers.getContract('Asset');
  const deployment = await deployments.get('NFT_Lottery_1');

  // Set up tree with real assets
  const assets = deployment.linkedData;
  const assetHashArray = createDataArrayAssets(assets);
  const tree = new MerkleTree(assetHashArray);

  return {
    giveawayContract,
    sandContract,
    assetContract,
    others,
    tree,
    assets,
    nftGiveawayAdmin,
  };
});
