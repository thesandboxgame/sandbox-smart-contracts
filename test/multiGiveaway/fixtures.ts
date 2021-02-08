import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import {createClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1_with_erc20/getClaims';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayMultiClaim} = helpers;
import {default as testDataWithERC20} from '../../data/giveaways/multi_giveaway_1_with_erc20/claims_hardhat.json';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

type OptionsWithERC20 = {
  mint?: boolean;
  sand?: boolean;
};

export const setupTestGiveawayWithERC20 = deployments.createFixture(
  async function (hre, options?: OptionsWithERC20) {
    const {network, getChainId} = hre;
    const chainId = await getChainId();
    const {mint, sand} = options || {};
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
        contract: 'MultiGiveawayWithERC20',
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
      for (let i = 0; i < 8; i++) {
        await landContractAsAdmin.mint(owner, i);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataWithIds: any = testDataWithERC20;

    async function mintNewAssetIds() {
      return await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        testDataWithERC20.map(async (claim: any) => {
          if (claim.erc1155 && claim.erc1155.ids) {
            const newClaim = {
              ...claim,
              erc1155: {
                ids: await Promise.all(
                  claim.erc1155.ids.map(
                    async (assetPackId: number, index: number) =>
                      await mintTestAssets(
                        assetPackId,
                        claim.erc1155.values[index]
                      )
                  )
                ),
                values: claim.erc1155.values,
                contractAddress: claim.erc1155.contractAddress,
              },
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
    const {claims, merkleRootHash} = createClaimMerkleTree(
      network.live,
      chainId,
      dataWithIds
    );

    const giveawayContract = await ethers.getContract(
      'Test_Multi_Giveaway_1_with_ERC20'
    );

    const giveawayContractAsAdmin = await giveawayContract.connect(
      ethers.provider.getSigner(nftGiveawayAdmin)
    );

    const assetAndLandHashArray = createDataArrayMultiClaim(claims);
    const tree = new MerkleTree(assetAndLandHashArray);

    // Add new giveaway data
    await giveawayContractAsAdmin.addNewGiveaway(merkleRootHash, 1615194000);

    return {
      giveawayContract,
      sandContract,
      assetContract,
      landContract,
      others,
      tree,
      claims,
      nftGiveawayAdmin,
      merkleRootHash,
    };
  }
);

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
  const assetAndLandHashArray = createDataArrayMultiClaim(claims);
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
