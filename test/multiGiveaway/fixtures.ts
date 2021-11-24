import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import {createClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1/getClaims';
import helpers from '../../lib/merkleTreeHelper';
import {default as testData0} from '../../data/giveaways/multi_giveaway_1/claims_0_hardhat.json';
import {default as testData1} from '../../data/giveaways/multi_giveaway_1/claims_1_hardhat.json';
import {expectReceiptEventWithArgs, waitFor, withSnapshot} from '../utils';

const {createDataArrayMultiClaim} = helpers;

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

type Options = {
  mint?: boolean;
  sand?: boolean;
  multi?: boolean;
  mintSingleAsset?: number;
  numberOfAssets?: number;
};

export const setupTestGiveaway = withSnapshot(
  ['Multi_Giveaway_1', 'Asset', 'Gems', 'Sand', 'Catalysts'],
  async function (hre, options?: Options) {
    const {network, getChainId} = hre;
    const chainId = await getChainId();
    const {mint, sand, multi, mintSingleAsset, numberOfAssets} = options || {};
    const {
      deployer,
      assetBouncerAdmin,
      landAdmin,
      sandAdmin,
      catalystMinter,
      gemMinter,
    } = await getNamedAccounts();
    const otherAccounts = await getUnnamedAccounts();
    const nftGiveawayAdmin = otherAccounts[0];
    const others = otherAccounts.slice(1);

    const sandContract = await ethers.getContract('Sand');
    const assetContract = await ethers.getContract('Asset');
    const speedGemContract = await ethers.getContract('Gem_SPEED');
    const rareCatalystContract = await ethers.getContract('Catalyst_RARE');

    await deployments.deploy('MockLand', {
      from: deployer,
      args: [sandContract.address, landAdmin],
      deterministicDeployment: true, // Set a fixed address for MockLand, so that the address can be used in the test claim data
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
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(giveawayContract.address, 16);
    await rareCatalystContract
      .connect(ethers.provider.getSigner(catalystMinter))
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

    const landContract = await ethers.getContract('MockLand');

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
    function assignReservedAddressToClaim(dataSet: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dataSet.map(async (claim: any) => {
        claim.to = others[0];
        return claim;
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function assignTestContractAddressesToClaim(dataSet: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return dataSet.map(async (claim: any) => {
        if (claim.erc1155) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          claim.erc1155.map(async (asset: any) => {
            asset.contractAddress = assetContract.address;
            return asset;
          });
        }
        if (claim.erc721) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          claim.erc721.map(async (land: any) => {
            land.contractAddress = landContract.address;
            return land;
          });
        }
        if (claim.erc20) {
          if (claim.erc20.amounts.length === 1)
            claim.erc20.contractAddresses = [sandContract.address];
          if (claim.erc20.amounts.length === 3)
            claim.erc20.contractAddresses = [
              sandContract.address,
              speedGemContract.address,
              rareCatalystContract.address,
            ];
        }
        return claim;
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setAssets(dataSet: any, amount: number) {
      dataSet[0].erc1155[0].ids = [];
      dataSet[0].erc1155[0].values = [];
      for (let i = 0; i < amount; i++) {
        // a big id to avoid collision with other setups
        dataSet[0].erc1155[0].ids.push(i + 1000);
        dataSet[0].erc1155[0].values.push(5);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataWithIds0: any = JSON.parse(JSON.stringify(testData0));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataWithIds1: any = JSON.parse(JSON.stringify(testData1));

    // To ensure the same address for others[0] for all tests
    assignReservedAddressToClaim(dataWithIds0);
    assignReservedAddressToClaim(dataWithIds1);

    // To ensure the claim data works for all developers
    assignTestContractAddressesToClaim(dataWithIds0);
    assignTestContractAddressesToClaim(dataWithIds1);

    if (numberOfAssets) {
      setAssets(dataWithIds0, numberOfAssets);
    }

    if (mint) {
      const claimsWithAssetIds0 = await mintNewAssetIds(dataWithIds0);
      dataWithIds0 = claimsWithAssetIds0;
      if (multi) {
        const claimsWithAssetIds1 = await mintNewAssetIds(dataWithIds1);
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
          to: others[0],
          erc1155: [
            {
              ids: [i],
              values: [1],
              contractAddress: assetContract.address,
            },
          ],
          erc721: [
            {
              ids: [1],
              contractAddress: landContract.address,
            },
          ],
          erc20: {
            amounts: [200],
            contractAddresses: [sandContract.address],
          },
        };
        emptyData.push(await mintSingleAssetWithId(claim));
      }
      for (let i = 1; i < mintSingleAsset; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claim: any = {
          to: others[0],
          erc1155: [
            {
              ids: [i],
              values: [1],
              contractAddress: assetContract.address,
            },
          ],
          erc721: [
            {
              ids: [1],
              contractAddress: landContract.address,
            },
          ],
          erc20: {
            amounts: [200],
            contractAddresses: [sandContract.address],
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
    } = createClaimMerkleTree(
      network.live,
      chainId,
      dataWithIds0,
      'Multi_Giveaway_1'
    );

    const allMerkleRoots = [];
    const allClaims = [claims0];
    const allTrees = [];

    // Single giveaway
    const hashArray = createDataArrayMultiClaim(claims0);
    await giveawayContractAsAdmin.addNewGiveaway(
      merkleRootHash0,
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
    ); // no expiry
    allMerkleRoots.push(merkleRootHash0);
    allTrees.push(new MerkleTree(hashArray));

    // Multi giveaway
    if (multi) {
      const {
        claims: claims1,
        merkleRootHash: merkleRootHash1,
      } = createClaimMerkleTree(
        network.live,
        chainId,
        dataWithIds1,
        'Multi_Giveaway_1'
      );
      allClaims.push(claims1);
      allMerkleRoots.push(merkleRootHash1);
      const hashArray2 = createDataArrayMultiClaim(claims1);
      allTrees.push(new MerkleTree(hashArray2));
      await giveawayContractAsAdmin.addNewGiveaway(
        merkleRootHash1,
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      ); // no expiry
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
  }
);
