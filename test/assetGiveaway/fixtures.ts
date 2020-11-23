import {ethers, deployments, getUnnamedAccounts} from 'hardhat';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayAssets} = helpers;

export const setupGiveaway = deployments.createFixture(async function () {
  const others = await getUnnamedAccounts();
  await deployments.fixture('NFT_Lottery_1');
  const giveawayContract = await ethers.getContract('NFT_Lottery_1');
  const deployment = await deployments.get('NFT_Lottery_1');

  const assets = deployment.linkedData;
  const assetHashArray = createDataArrayAssets(assets);
  const tree = new MerkleTree(assetHashArray);

  return {
    giveawayContract,
    others,
    tree,
    assets,
  };
});
