import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayAssets} = helpers;

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

export const setupGiveaway = deployments.createFixture(async function () {
  const {assetBouncerAdmin} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('NFT_Lottery_1');
  const giveawayContract = await ethers.getContract('NFT_Lottery_1');
  const deployment = await deployments.get('NFT_Lottery_1');

  // Set up tree
  const assets = deployment.linkedData;
  const assetHashArray = createDataArrayAssets(assets);
  const tree = new MerkleTree(assetHashArray);

  // Supply assets to contract for testing
  const assetContract = await ethers.getContract('Asset');
  // console.log(assetContract);
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

    await assetContractAsBouncer.mint(
      creator,
      packId,
      hash,
      supply,
      rarity,
      owner,
      data
    );
  }

  return {
    giveawayContract,
    others,
    tree,
    assets,
    assetContract,
    mintTestAssets,
  };
});
