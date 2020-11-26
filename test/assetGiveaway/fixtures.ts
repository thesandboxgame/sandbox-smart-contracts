import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayAssets} = helpers;

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setupGiveaway = async (
  assetType: string,
  mint: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const {
    giveawayContract,
    others,
    tree,
    assets,
  } = await deployments.createFixture(async function () {
    const {assetBouncerAdmin} = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    await deployments.fixture('NFT_Lottery_1');
    const giveawayContract = await ethers.getContract('NFT_Lottery_1');
    const deployment = await deployments.get('NFT_Lottery_1');

    // Supply assets to contract for testing
    const assetContract = await ethers.getContract('Asset');
    async function mintTestAssets(id: number, value: number, to: string) {
      const assetContractAsBouncer = await assetContract.connect(
        ethers.provider.getSigner(assetBouncerAdmin)
      );

      // Asset to be minted
      const creator = others[0];
      const packId = id;
      const hash = ipfsHashString;
      const supply = value;
      const rarity = 1;
      const owner = to;
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
        giveawayContract.address,
        transferEvent.args[3]
      );
      expect(balanceAssetId).to.equal(supply);
      return transferEvent.args[3].toString(); // asset ID
    }

    let assets;
    let tree;

    if (assetType === 'real') {
      // Set up tree with real assets
      assets = deployment.linkedData;
      const assetHashArray = createDataArrayAssets(assets);
      tree = new MerkleTree(assetHashArray);
    } else if (assetType === 'test') {
      // Set up tree with test assets
      if (mint) {
        for (let i = 0; i < 3; i++) {
          await mintTestAssets(i, 5, giveawayContract.address);
        }
      }
      assets = deployment.linkedData;
      const assetHashArray = createDataArrayAssets(assets);
      tree = new MerkleTree(assetHashArray);
    }

    return {
      giveawayContract,
      others,
      tree,
      assets,
    };
  })();
  return {
    giveawayContract,
    others,
    tree,
    assets,
  };
};
