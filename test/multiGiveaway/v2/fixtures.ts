import {BigNumber} from 'ethers';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {default as testData0} from '../../../data/giveaways/polygonmulti_giveaway_v2_1/claims_0_hardhat.json';
import {default as testData1} from '../../../data/giveaways/polygonmulti_giveaway_v2_1/claims_1_hardhat.json';
import {createClaimMerkleTreeV2} from '../../../data/giveaways/getClaimsV2';
import MerkleTree from '../../../lib/merkleTree';
import helpers, {MultiClaim} from '../../../lib/merkleTreeHelper';
import {expect} from '../../chai-setup';
import {zeroAddress} from '../../land-sale/fixtures';
import {depositViaChildChainManager} from '../../polygon/sand/fixtures';
import {
  expectReceiptEventWithArgs,
  sequentially,
  waitFor,
  withSnapshot,
} from '../../utils';

const {createDataArrayMultiClaim} = helpers;

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

type Options = {
  mint?: boolean; // supply assets and lands to MultiGiveaway
  sand?: boolean; // supply sand to MultiGiveaway
  multi?: boolean; // set up more than one giveaway (ie more than one claim hash)
  mintSingleAsset?: number; // mint a single asset and add to blank testData for mintSingleAsset number of users
  numberOfAssets?: number; // specify a given number of assets to mint and test
  badData?: boolean; // set the merkle tree up with bad contract addresses and input values for ERC1155, ERC721 and ERC20 assets
  duration?: number; // set the expiry time of the giveaway
};

export const setupTestGiveaway = withSnapshot(
  ['PolygonAssetERC1155', 'PolygonGems', 'PolygonSand', 'PolygonCatalysts'],
  async function (hre, options?: Options) {
    const {
      mint,
      sand,
      multi,
      mintSingleAsset,
      numberOfAssets,
      badData,
      duration,
    } = options || {};
    const {
      deployer,
      assetBouncerAdmin,
      landAdmin,
      sandAdmin,
      catalystMinter,
      gemMinter,
      multiGiveawayAdmin,
    } = await getNamedAccounts();
    const otherAccounts = await getUnnamedAccounts();
    const others = otherAccounts;
    const sandContract = await ethers.getContract('PolygonSand');
    const assetContract = await ethers.getContract('PolygonAssetERC1155');
    const speedGemContract = await ethers.getContract('PolygonGem_SPEED');
    const rareCatalystContract = await ethers.getContract(
      'PolygonCatalyst_RARE'
    );

    await deployments.deploy('TestMetaTxForwarder', {
      from: deployer,
    });
    const trustedForwarder = await ethers.getContract('TestMetaTxForwarder');
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

    await deployments.deploy('MockLand', {
      from: deployer,
      args: [sandContract.address, landAdmin],
      deterministicDeployment: true, // Set a fixed address for MockLand, so that the address can be used in the test claim data
    });

    const sandContractAsAdmin = await sandContract.connect(
      ethers.provider.getSigner(sandAdmin)
    );

    const SAND_AMOUNT = BigNumber.from(20000).mul('1000000000000000000');

    await depositViaChildChainManager(
      {sand: sandContract, childChainManager},
      sandAdmin,
      SAND_AMOUNT
    );

    await deployments.deploy('Test_Multi_Giveaway_1_with_ERC20', {
      from: deployer,
      contract: 'MultiGiveawayV2',
      args: [sandAdmin, multiGiveawayAdmin, trustedForwarder.address],
    });

    const giveawayContract = await ethers.getContract(
      'Test_Multi_Giveaway_1_with_ERC20',
      deployer
    );

    // Contract setup admin is DEFAULT_ADMIN_ROLE
    const giveawayContractAsAdmin = await ethers.getContract(
      'Test_Multi_Giveaway_1_with_ERC20',
      sandAdmin
    );

    // Business-related admin is MULTIGIVEAWAY_ROLE (can call addNewGiveaway)
    const multiGiveawayRole = await await giveawayContract.MULTIGIVEAWAY_ROLE();
    const giveawayContractAsMultiGiveawayAdmin = await ethers.getContract(
      'Test_Multi_Giveaway_1_with_ERC20',
      multiGiveawayAdmin
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
      'PolygonAssetERC1155',
      assetBouncerAdmin
    );

    async function mintTestAssets(id: string, value: number): Promise<string> {
      // Asset to be minted
      const creator = others[0];
      const packId = id;
      const hash = ipfsHashString;
      const supply = value;
      const owner = giveawayContract.address;
      const data = '0x';

      await assetContractAsBouncerAdmin.setBouncer(creator, true);

      const assetContractAsCreator = await assetContract.connect(
        ethers.provider.getSigner(creator)
      );

      const receipt = await waitFor(
        assetContractAsCreator[
          'mint(address,uint40,bytes32,uint256,address,bytes)'
        ](creator, packId, hash, supply, owner, data)
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

    async function mintNewAssetIds(dataSet: MultiClaim[]) {
      return await sequentially(dataSet, async (claim) => {
        if (claim.erc1155) {
          const newAsset = {
            ids: [] as string[],
            values: [] as number[],
            contractAddress: '',
          };
          return {
            ...claim,
            erc1155: await sequentially(
              claim.erc1155,
              async (asset, assetIndex: number) => {
                newAsset.ids = await sequentially(
                  asset.ids,
                  async (assetPackId: string, index: number) =>
                    await mintTestAssets(assetPackId, asset.values[index])
                );
                newAsset.values = claim.erc1155[assetIndex].values;
                newAsset.contractAddress =
                  claim.erc1155[assetIndex].contractAddress;
                return newAsset;
              }
            ),
          };
        } else return claim;
      });
    }

    function assignReservedAddressToClaim(dataSet: MultiClaim[]) {
      return dataSet.map((claim) => {
        claim.to = others[0];
        return claim;
      });
    }

    function assignTestContractAddressesToClaim(dataSet: MultiClaim[]) {
      return dataSet.map((claim) => {
        if (claim.erc1155) {
          claim.erc1155.map((asset) => {
            asset.contractAddress = assetContract.address;
            return asset;
          });
        }
        if (claim.erc721) {
          claim.erc721.map((land) => {
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

    function setAssets(dataSet: MultiClaim[], amount: number) {
      dataSet[0].erc1155[0].ids = [];
      dataSet[0].erc1155[0].values = [];
      for (let i = 0; i < amount; i++) {
        // a big id to avoid collision with other setups
        dataSet[0].erc1155[0].ids.push((i + 1000).toString());
        dataSet[0].erc1155[0].values.push(5);
      }
    }

    let dataWithIds0 = JSON.parse(JSON.stringify(testData0));

    let dataWithIds1 = JSON.parse(JSON.stringify(testData1));

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
      dataWithIds0 = await mintNewAssetIds(dataWithIds0);
      if (multi) {
        dataWithIds1 = await mintNewAssetIds(dataWithIds1);
      }

      await mintTestLands();
    }

    async function mintSingleAssetWithId(claim: MultiClaim) {
      const newAsset = {
        ids: [] as string[],
        values: [] as number[],
        contractAddress: '',
      };
      return {
        ...claim,
        erc1155: await sequentially(
          claim.erc1155,
          async (asset, assetIndex: number) => {
            newAsset.ids = await sequentially(
              asset.ids,
              async (assetPackId: string, index: number) =>
                await mintTestAssets(assetPackId, asset.values[index])
            );
            newAsset.values = claim.erc1155[assetIndex].values;
            newAsset.contractAddress =
              claim.erc1155[assetIndex].contractAddress;
            return newAsset;
          }
        ),
      };
    }

    if (mintSingleAsset) {
      await mintTestLands();
      // Set up blank testData for thousands of users
      const emptyData = [];
      for (let i = 0; i < 1; i++) {
        const claim: MultiClaim = {
          to: others[0],
          erc1155: [
            {
              ids: [i.toString()],
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
        const claim = {
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
    } = createClaimMerkleTreeV2(hre, dataWithIds0, 'Multi_Giveaway_V2_1');

    const allMerkleRoots = [];
    const allClaims = [claims0];
    const allTrees = [];

    let expiryTime;
    if (duration) {
      const latestBlock = await ethers.provider.getBlock('latest');
      expiryTime = latestBlock.timestamp + duration;
    } else {
      expiryTime =
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    }

    // Single giveaway
    const hashArray = createDataArrayMultiClaim(claims0);
    await giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
      merkleRootHash0,
      expiryTime
    );
    allMerkleRoots.push(merkleRootHash0);
    allTrees.push(new MerkleTree(hashArray));

    // Multi giveaway
    if (multi) {
      const {
        claims: claims1,
        merkleRootHash: merkleRootHash1,
      } = createClaimMerkleTreeV2(hre, dataWithIds1, 'Multi_Giveaway_V2_1');
      allClaims.push(claims1);
      allMerkleRoots.push(merkleRootHash1);
      const hashArray2 = createDataArrayMultiClaim(claims1);
      allTrees.push(new MerkleTree(hashArray2));
      await giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
        merkleRootHash1,
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      ); // no expiry
    }

    // Set up bad contract addresses and input amounts in merkle tree data and claim
    if (badData) {
      dataWithIds0[0].erc1155[0].values = [5, 5, 5, 5, 5, 5, 5, 5];
      dataWithIds0[1].erc20.amounts = [200, 300, 200];
      dataWithIds0[3].erc1155[0].contractAddress = zeroAddress;
      dataWithIds0[2].erc721[0].contractAddress = zeroAddress;
      dataWithIds0[4].erc20.contractAddresses[0] = zeroAddress;

      const {
        claims: badClaims0,
        merkleRootHash: badMerkleRootHash0,
      } = createClaimMerkleTreeV2(hre, dataWithIds0, 'Multi_Giveaway_V2_1');
      allClaims.push(badClaims0);
      allMerkleRoots.push(badMerkleRootHash0);
      const hashArray2 = createDataArrayMultiClaim(badClaims0);
      allTrees.push(new MerkleTree(hashArray2));
      await giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
        badMerkleRootHash0,
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      ); // no expiry
    }

    return {
      giveawayContract,
      giveawayContractAsAdmin, // DEFAULT_ADMIN_ROLE
      giveawayContractAsMultiGiveawayAdmin, // MULTIGIVEAWAY_ROLE
      sandContract,
      assetContract,
      landContract,
      speedGemContract,
      rareCatalystContract,
      others,
      allTrees,
      allClaims,
      allMerkleRoots,
      trustedForwarder,
      multiGiveawayAdmin,
      sandAdmin,
      multiGiveawayRole,
    };
  }
);
