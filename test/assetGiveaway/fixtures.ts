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

export const setupGiveaway = async (
  assetType: string,
  mint?: boolean,
  amount?: number,
  supply?: number,
  to?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const {
    giveawayContract,
    sandContract,
    assetContract,
    others,
    tree,
    assets,
    sandAdmin,
  } = await deployments.createFixture(async function () {
    const {assetBouncerAdmin, sandAdmin} = await getNamedAccounts();
    const others = await getUnnamedAccounts();
    await deployments.fixture('NFT_Lottery_1');
    const giveawayContract = await ethers.getContract('NFT_Lottery_1');
    const sandContract = await ethers.getContract('Sand');
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
      const owner = to === 'contract' ? giveawayContract.address : to;
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
      // console.log(transferEvent.args[3].toString());
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
      if (mint && amount && supply && to) {
        for (let i = 0; i < amount; i++) {
          await mintTestAssets(i, supply, to);
        }
      }
      assets = deployment.linkedData;
      const assetHashArray = createDataArrayAssets(assets);
      tree = new MerkleTree(assetHashArray);
    }

    return {
      giveawayContract,
      sandContract,
      assetContract,
      others,
      tree,
      assets,
      sandAdmin,
    };
  })();
  return {
    giveawayContract,
    sandContract,
    assetContract,
    others,
    tree,
    assets,
    sandAdmin,
  };
};
