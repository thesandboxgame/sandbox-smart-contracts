import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import MerkleTree from '../../lib/merkleTree';
import {createAssetAndLandClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1/getClaims';
import {createAssetLandAndSandClaimMerkleTree} from '../../data/giveaways/multi_giveaway_1_with_erc20/getClaims';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayClaimableAssetsLandsAndSand} = helpers;
import {default as testData} from '../../data/giveaways/multi_giveaway_1/claims_hardhat.json';
import {default as testDataWithERC20} from '../../data/giveaways/multi_giveaway_1_with_erc20/claims_hardhat.json';

const ipfsHashString =
  '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

import {expectReceiptEventWithArgs, waitFor} from '../utils';

type Options = {
  mint?: boolean;
  assetsHolder?: boolean;
  landHolder?: boolean;
};

type OptionsWithERC20 = {
  mint?: boolean;
  assetsHolder?: boolean;
  landHolder?: boolean;
  sandHolder?: boolean;
  sand?: boolean;
};

export const setupTestGiveaway = deployments.createFixture(async function (
  hre,
  options?: Options
) {
  const {network, getChainId} = hre;
  const chainId = await getChainId();
  const {mint, assetsHolder, landHolder} = options || {};
  const {
    deployer,
    assetAdmin,
    assetBouncerAdmin,
    landAdmin,
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

  const landContract = await ethers.getContract('MockLand');

  const landContractAsAdmin = await landContract.connect(
    ethers.provider.getSigner(landAdmin)
  );

  const emptyBytes32 =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';
  const LAND_HOLDER = '0x0000000000000000000000000000000000000000';

  const testContract = await deployments.deploy('Test_Multi_Giveaway_1', {
    from: deployer,
    contract: 'MultiGiveaway',
    args: [
      assetContract.address,
      landContract.address,
      nftGiveawayAdmin,
      emptyBytes32,
      assetsHolder ? others[5] : ASSETS_HOLDER,
      landHolder ? others[5] : LAND_HOLDER,
      1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
    ],
  });

  if (assetsHolder) {
    const assetContractAsAdmin = await assetContract.connect(
      ethers.provider.getSigner(assetAdmin)
    );
    await assetContractAsAdmin.setSuperOperator(testContract.address, true);
  }

  if (landHolder) {
    await landContractAsAdmin.setSuperOperator(testContract.address, true);
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

  // Supply lands to contract for testing
  async function mintTestLands() {
    const owner = landHolder ? others[5] : testContract.address;
    for (let i = 0; i < 8; i++) {
      await landContractAsAdmin.mint(owner, i);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataWithIds: any = testData;

  async function mintNewAssetIds() {
    return await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testData.map(async (claim: any) => {
        if (claim.assetIds) {
          const newClaim = {
            ...claim,
            assetIds: await Promise.all(
              claim.assetIds.map(
                async (assetPackId: number, index: number) =>
                  await mintTestAssets(assetPackId, claim.assetValues[index])
              )
            ),
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
  const {claims, merkleRootHash} = createAssetAndLandClaimMerkleTree(
    network.live,
    chainId,
    dataWithIds
  );

  // Update the deployment with test asset data
  const deployment = await deployments.get('Test_Multi_Giveaway_1');
  deployment.linkedData = claims;
  await deployments.save('Test_Multi_Giveaway_1', deployment);

  const giveawayContract = await ethers.getContract('Test_Multi_Giveaway_1');
  const giveawayContractAsAdmin = await giveawayContract.connect(
    ethers.provider.getSigner(nftGiveawayAdmin)
  );

  const updatedDeployment = await deployments.get('Test_Multi_Giveaway_1');
  const updatedClaims = updatedDeployment.linkedData;
  const assetAndLandHashArray = createDataArrayClaimableAssetsLandsAndSand(
    updatedClaims
  );
  const tree = new MerkleTree(assetAndLandHashArray);
  await giveawayContractAsAdmin.setMerkleRoot(merkleRootHash); // Set the merkleRoot which could not have been known prior to generating the test asset IDs

  return {
    giveawayContract,
    sandContract,
    assetContract,
    landContract,
    others,
    tree,
    claims: updatedClaims,
    nftGiveawayAdmin,
    merkleRootHash,
  };
});

export const setupTestGiveawayWithERC20 = deployments.createFixture(
  async function (hre, options?: OptionsWithERC20) {
    const {network, getChainId} = hre;
    const chainId = await getChainId();
    const {mint, assetsHolder, landHolder, sandHolder, sand} = options || {};
    const {
      deployer,
      assetAdmin,
      assetBouncerAdmin,
      landAdmin,
      sandAdmin,
    } = await getNamedAccounts();
    const otherAccounts = await getUnnamedAccounts();
    const nftGiveawayAdmin = otherAccounts[0];
    const others = otherAccounts.slice(1);

    await deployments.fixture('Multi_Giveaway_1_with_ERC20');
    const sandContract = await ethers.getContract('Sand');
    await deployments.fixture(['Asset']);
    const assetContract = await ethers.getContract('Asset');

    await deployments.deploy('MockLand', {
      from: deployer,
      args: [sandContract.address, landAdmin],
    });

    const landContract = await ethers.getContract('MockLand');

    const landContractAsAdmin = await landContract.connect(
      ethers.provider.getSigner(landAdmin)
    );

    const sandContractAsAdmin = await sandContract.connect(
      ethers.provider.getSigner(sandAdmin)
    );

    const emptyBytes32 =
      '0x0000000000000000000000000000000000000000000000000000000000000000';

    const ASSETS_HOLDER = '0x0000000000000000000000000000000000000000';
    const LAND_HOLDER = '0x0000000000000000000000000000000000000000';
    const SAND_HOLDER = '0x0000000000000000000000000000000000000000';

    const SAND_AMOUNT = BigNumber.from(20000).mul('1000000000000000000');

    const assetDeployAddress = assetsHolder ? others[5] : ASSETS_HOLDER;
    const landDeployAddress = assetsHolder ? others[7] : LAND_HOLDER;
    const sandDeployAddress = assetsHolder ? others[6] : SAND_HOLDER;

    const testContract = await deployments.deploy(
      'Test_Multi_Giveaway_1_with_ERC20',
      {
        from: deployer,
        contract: 'MultiGiveawayWithERC20',
        args: [
          assetContract.address,
          landContract.address,
          sandContract.address,
          nftGiveawayAdmin,
          emptyBytes32,
          assetDeployAddress,
          landDeployAddress,
          sandDeployAddress,
          1615194000, // Sunday, 08-Mar-21 09:00:00 UTC
        ],
      }
    );

    const assetTestAddress = assetsHolder ? others[5] : testContract.address;
    const landTestAddress = assetsHolder ? others[7] : testContract.address;
    const sandTestAddress = assetsHolder ? others[6] : testContract.address;

    if (assetsHolder) {
      const assetContractAsAdmin = await assetContract.connect(
        ethers.provider.getSigner(assetAdmin)
      );
      await assetContractAsAdmin.setSuperOperator(testContract.address, true);
    }

    if (landHolder) {
      await landContractAsAdmin.setSuperOperator(testContract.address, true);
    }

    if (sandHolder) {
      await sandContractAsAdmin.setSuperOperator(testContract.address, true);
    }

    // Supply SAND
    if (sand) {
      await sandContractAsAdmin.transfer(sandTestAddress, SAND_AMOUNT);
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
      const owner = assetTestAddress;
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
        assetTestAddress,
        transferEvent.args[3]
      );
      expect(balanceAssetId).to.equal(supply);
      return transferEvent.args[3].toString(); // asset ID
    }

    // Supply lands to contract for testing
    async function mintTestLands() {
      const owner = landTestAddress;
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
          if (claim.assetIds) {
            const newClaim = {
              ...claim,
              assetIds: await Promise.all(
                claim.assetIds.map(
                  async (assetPackId: number, index: number) =>
                    await mintTestAssets(assetPackId, claim.assetValues[index])
                )
              ),
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
    const {claims, merkleRootHash} = createAssetLandAndSandClaimMerkleTree(
      network.live,
      chainId,
      dataWithIds
    );

    // Update the deployment with test asset data
    const deployment = await deployments.get(
      'Test_Multi_Giveaway_1_with_ERC20'
    );
    deployment.linkedData = claims;
    await deployments.save('Test_Multi_Giveaway_1_with_ERC20', deployment);

    const giveawayContract = await ethers.getContract(
      'Test_Multi_Giveaway_1_with_ERC20'
    );
    const giveawayContractAsAdmin = await giveawayContract.connect(
      ethers.provider.getSigner(nftGiveawayAdmin)
    );

    const updatedDeployment = await deployments.get(
      'Test_Multi_Giveaway_1_with_ERC20'
    );
    const updatedClaims = updatedDeployment.linkedData;
    const assetAndLandHashArray = createDataArrayClaimableAssetsLandsAndSand(
      updatedClaims
    );
    const tree = new MerkleTree(assetAndLandHashArray);
    await giveawayContractAsAdmin.setMerkleRoot(merkleRootHash); // Set the merkleRoot which could not have been known prior to generating the test asset IDs

    return {
      giveawayContract,
      sandContract,
      assetContract,
      landContract,
      others,
      tree,
      claims: updatedClaims,
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
  const assetAndLandHashArray = createDataArrayClaimableAssetsLandsAndSand(
    claims
  );
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
