import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import {createClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1/getClaims';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayMultiClaim} = helpers;
import {default as testData0} from '../../data/giveaways/multi_giveaway_1/claims_0_hardhat.json';
import {default as testData1} from '../../data/giveaways/multi_giveaway_1/claims_1_hardhat.json';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

type Options = {
  mint?: boolean;
  sand?: boolean;
  multi?: true;
};

export const setupTestGiveaway = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, sand, multi} = options || {};
  const {
    deployer,
    assetBouncerAdmin,
    landAdmin,
    sandAdmin,
  } = await getNamedAccounts();
  const otherAccounts = await getUnnamedAccounts();
  const nftGiveawayAdmin = otherAccounts[0];
  const others = otherAccounts.slice(1);

  await deployments.fixture('Multi_Giveaway_1');
  const sandContract = await ethers.getContract('Sand');
  await deployments.fixture(['Asset']);
  const assetContract = await ethers.getContract('Asset');

  await deployments.deploy('MockLand', {
    from: deployer,
    args: [sandContract.address, landAdmin],
  });

  const landContract = await ethers.getContractAt(
    'MockLand',
    '0x092796887ed12804AA949A3207CECA18998C90c7' // Set a fixed address for Mockland to use in test claim data as the landContractAddress
  );

  const landContractAsAdmin = await landContract.connect(
    ethers.provider.getSigner(landAdmin)
  );

  const sandContractAsAdmin = await sandContract.connect(
    ethers.provider.getSigner(sandAdmin)
  );

  // const emptyBytes32 =
  //   '0x0000000000000000000000000000000000000000000000000000000000000000';

  const SAND_AMOUNT = BigNumber.from(20000).mul('1000000000000000000');

  const testContract = await deployments.deploy(
    'Test_Multi_Giveaway_1_with_ERC20',
    {
      from: deployer,
      contract: 'MultiGiveaway',
      args: [nftGiveawayAdmin],
    }
  );

  // Supply SAND
  if (sand) {
    await sandContractAsAdmin.transfer(testContract.address, SAND_AMOUNT);
  }

  const assetContractAsBouncerAdmin = await ethers.getContract(
    'Asset',
    assetBouncerAdmin
  );

  // Supply assets to contract for testing
  async function mintTestAssets(id: number, value: number) {
    // Asset to be minted
    const creator = others[0];
    const packId = id;
    const hash = ipfsHashString;
    const supply = value;
    const rarity = 1;
    const owner = testContract.address;
    const data = '0x';

    await assetContractAsBouncerAdmin.setBouncer(creator, true);

    const assetContractAsCreator = await assetContract.connect(
      ethers.provider.getSigner(creator)
    );

    const receipt = await waitFor(
      assetContractAsCreator.mint(
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
      testContract.address,
      transferEvent.args[3]
    );
    expect(balanceAssetId).to.equal(supply);
    return transferEvent.args[3].toString(); // asset ID
  }

  // Supply lands to contract for testing
  async function mintTestLands() {
    const owner = testContract.address;
    for (let i = 0; i < 18; i++) {
      await landContractAsAdmin.mint(owner, i);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function mintNewAssetIds(dataSet: any) {
    return await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataSet.map(async (claim: any) => {
        if (claim.erc1155) {
          const newAsset = {
            ids: [],
            values: [],
            contractAddress: '',
          };
          const newClaim = {
            ...claim,
            erc1155: await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              claim.erc1155.map(async (asset: any, assetIndex: number) => {
                newAsset.ids = await Promise.all(
                  asset.ids.map(
                    async (assetPackId: number, index: number) =>
                      await mintTestAssets(assetPackId, asset.values[index])
                  )
                );
                (newAsset.values = claim.erc1155[assetIndex].values),
                  (newAsset.contractAddress =
                    claim.erc1155[assetIndex].contractAddress);
                return newAsset;
              })
            ),
          };
          return newClaim;
        } else return claim;
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataWithIds0: any = testData0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataWithIds1: any = testData1;

  if (mint) {
    const claimsWithAssetIds0 = await mintNewAssetIds(testData0);
    dataWithIds0 = claimsWithAssetIds0;
    // TODO: fix scope
    // if (multi) {
    //   const claimsWithAssetIds1 = await mintNewAssetIds(testData1);
    //   dataWithIds1 = claimsWithAssetIds1;
    // }

    await mintTestLands();
  }

  console.log('last', dataWithIds0[0].erc1155);

  const giveawayContract = await ethers.getContract(
    'Test_Multi_Giveaway_1_with_ERC20'
  );

  const giveawayContractAsAdmin = await giveawayContract.connect(
    ethers.provider.getSigner(nftGiveawayAdmin)
  );

  // Set up tree with test assets for each applicable giveaway
  const {
    claims: claims0,
    merkleRootHash: merkleRootHash0,
  } = createClaimMerkleTree(network.live, chainId, dataWithIds0);

  const merkleRootHashes = [];
  const allClaims = [claims0];

  // Single giveaway
  const hashArray = createDataArrayMultiClaim(claims0);
  const tree = new MerkleTree(hashArray);
  await giveawayContractAsAdmin.addNewGiveaway(merkleRootHash0, 1615194000);
  merkleRootHashes.push(merkleRootHash0);

  // Multi giveaway
  // if (multi) {
  //   const {
  //     claims: claims1,
  //     merkleRootHash: merkleRootHash1,
  //   } = createClaimMerkleTree(network.live, chainId, dataWithIds1);
  //   allClaims.push(claims1);
  //   merkleRootHashes.push(merkleRootHash1);
  // }

  return {
    giveawayContract,
    sandContract,
    assetContract,
    landContract,
    others,
    tree,
    allClaims, // TODO: multiple claims data files to test more than 1 giveaway
    nftGiveawayAdmin,
    merkleRootHashArray: merkleRootHashes, // TODO: multiple merkleRoot hashes from multiple claims to test more than 1 giveaway
  };
});
