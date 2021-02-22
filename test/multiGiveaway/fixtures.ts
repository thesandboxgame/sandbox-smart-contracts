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
  multi?: boolean;
  mintSingleAsset?: number;
};

export const setupTestGiveaway = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, sand, multi, mintSingleAsset} = options || {};
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
  const speedGemContract = await ethers.getContract('Gem_Speed');
  const rareCatalystContract = await ethers.getContract('Catalyst_Rare');

  await deployments.deploy('MockLand', {
    from: deployer,
    args: [sandContract.address, landAdmin],
  });

  const sandContractAsAdmin = await sandContract.connect(
    ethers.provider.getSigner(sandAdmin)
  );

  const SAND_AMOUNT = BigNumber.from(20000).mul('1000000000000000000');

  await deployments.deploy('Test_Multi_Giveaway_1_with_ERC20', {
    from: deployer,
    contract: 'MultiGiveaway',
    args: [nftGiveawayAdmin],
  });

  const giveawayContract = await ethers.getContract(
    'Test_Multi_Giveaway_1_with_ERC20'
  );

  const giveawayContractAsAdmin = await giveawayContract.connect(
    ethers.provider.getSigner(nftGiveawayAdmin)
  );

  // Supply SAND
  if (sand) {
    await sandContractAsAdmin.transfer(giveawayContract.address, SAND_AMOUNT);
  }

  // Supply Catalysts and Gems
  await speedGemContract
    .connect(ethers.provider.getSigner(deployer))
    .mint(giveawayContract.address, 16);
  await rareCatalystContract
    .connect(ethers.provider.getSigner(deployer))
    .mint(giveawayContract.address, 8);

  // Supply assets
  const assetContractAsBouncerAdmin = await ethers.getContract(
    'Asset',
    assetBouncerAdmin
  );
  async function mintTestAssets(id: number, value: number) {
    // Asset to be minted
    const creator = others[0];
    const packId = id;
    const hash = ipfsHashString;
    const supply = value;
    const rarity = 1;
    const owner = giveawayContract.address;
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
      giveawayContract.address,
      transferEvent.args[3]
    );
    expect(balanceAssetId).to.equal(supply);
    return transferEvent.args[3].toString(); // asset ID
  }

  const landContract = await ethers.getContractAt(
    'MockLand',
    '0x51d8e1CAADE79921017ae03a48eCA01d63D6e7Ee' // Set a fixed address for Mockland to use in test claim data as the landContractAddress
  );

  // Supply lands to contract for testing
  async function mintTestLands() {
    const landContractAsAdmin = await landContract.connect(
      ethers.provider.getSigner(landAdmin)
    );
    const owner = giveawayContract.address;
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
    if (multi) {
      const claimsWithAssetIds1 = await mintNewAssetIds(testData1);
      dataWithIds1 = claimsWithAssetIds1;
    }

    await mintTestLands();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function mintSingleAssetWithId(claim: any) {
    const newAsset = {
      ids: [],
      values: [],
      contractAddress: '',
    };
    return {
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
  }

  if (mintSingleAsset) {
    await mintTestLands();
    // Set up blank testData for thousands of users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emptyData: any = [];
    for (let i = 0; i < 1; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const claim: any = {
        to: others[1],
        erc1155: [
          {
            ids: [i],
            values: [1],
            contractAddress: '0x0A9c4aD6F991Ec37E213C724C2e83373E225221C',
          },
        ],
        erc721: [
          {
            ids: [1],
            contractAddress: '0x51d8e1CAADE79921017ae03a48eCA01d63D6e7Ee',
          },
        ],
        erc20: {
          amounts: [200],
          contractAddresses: ['0xB877Fc8Ee9C965Bb97207e3f9ad7e5761B8288B9'],
        },
      };
      emptyData.push(await mintSingleAssetWithId(claim));
    }
    for (let i = 1; i < mintSingleAsset; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const claim: any = {
        to: others[1],
        erc1155: [
          {
            ids: [i],
            values: [1],
            contractAddress: '0x0A9c4aD6F991Ec37E213C724C2e83373E225221C',
          },
        ],
        erc721: [
          {
            ids: [1],
            contractAddress: '0x51d8e1CAADE79921017ae03a48eCA01d63D6e7Ee',
          },
        ],
        erc20: {
          amounts: [200],
          contractAddresses: ['0xB877Fc8Ee9C965Bb97207e3f9ad7e5761B8288B9'],
        },
      };
      emptyData.push(claim);
    }
    dataWithIds0 = emptyData;
  }

  // Set up tree with test assets for each applicable giveaway
  const {
    claims: claims0,
    merkleRootHash: merkleRootHash0,
  } = createClaimMerkleTree(network.live, chainId, dataWithIds0);

  const allMerkleRoots = [];
  const allClaims = [claims0];
  const allTrees = [];

  // Single giveaway
  const hashArray = createDataArrayMultiClaim(claims0);
  await giveawayContractAsAdmin.addNewGiveaway(merkleRootHash0, 1615194000);
  allMerkleRoots.push(merkleRootHash0);
  allTrees.push(new MerkleTree(hashArray));

  // Multi giveaway
  if (multi) {
    const {
      claims: claims1,
      merkleRootHash: merkleRootHash1,
    } = createClaimMerkleTree(network.live, chainId, dataWithIds1);
    allClaims.push(claims1);
    allMerkleRoots.push(merkleRootHash1);
    const hashArray2 = createDataArrayMultiClaim(claims1);
    allTrees.push(new MerkleTree(hashArray2));
    await giveawayContractAsAdmin.addNewGiveaway(merkleRootHash1, 1615194000);
  }

  return {
    giveawayContract,
    sandContract,
    assetContract,
    landContract,
    speedGemContract,
    rareCatalystContract,
    others,
    allTrees,
    allClaims,
    nftGiveawayAdmin,
    allMerkleRoots,
  };
});
