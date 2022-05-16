import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {
  setupUsers,
  waitFor,
  withSnapshot,
  expectEventWithArgs,
  setupUser,
} from '../../utils';

import {
  assetFixtures,
  gemsAndCatalystsFixture,
} from '../../common/fixtures/asset';

const polygonAssetFixtures = async function () {
  const {deployer} = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  const extractor = otherAccounts[1];
  otherAccounts.splice(0, 2);

  const {assetBouncerAdmin, assetAdmin} = await getNamedAccounts();

  const Sand = await ethers.getContract('SandBaseToken');
  const Asset = await ethers.getContract('Asset', assetBouncerAdmin);
  const PolygonAssetERC1155 = await ethers.getContract(
    'PolygonAssetERC1155',
    assetBouncerAdmin
  );
  await waitFor(PolygonAssetERC1155.setBouncer(minter, true));

  // Set sender as bouncer (only bouncers can extract)
  await waitFor(PolygonAssetERC1155.setBouncer(extractor, true));

  const assetSignedAuctionAuthContract = await ethers.getContract(
    'AssetSignedAuctionAuth'
  );

  await waitFor(Asset.setBouncer(minter, true));

  // Set sender as bouncer (only bouncers can extract)
  await waitFor(Asset.setBouncer(extractor, true));

  const AssetERC1155Tunnel = await ethers.getContract('AssetERC1155Tunnel');
  const PolygonAssetERC1155Tunnel = await ethers.getContract(
    'PolygonAssetERC1155Tunnel'
  );
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');
  const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  // Set up ERC721 for extraction tests
  const PolygonAssetERC721 = await ethers.getContract(
    'PolygonAssetERC721',
    assetAdmin
  );
  const minterRole = await PolygonAssetERC721.MINTER_ROLE();
  await PolygonAssetERC721.grantRole(minterRole, PolygonAssetERC1155.address);

  const deployerAccount = await setupUser(deployer, {
    PolygonAssetERC1155,
    Asset,
    FxRoot,
    FxChild,
    CheckpointManager,
    PolygonAssetERC1155Tunnel,
    AssetERC1155Tunnel,
  });

  await deployerAccount.FxRoot.setFxChild(FxChild.address);

  let id = 0;
  const ipfsHashString =
    '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

  async function mintAsset(to: string, value: number, hash = ipfsHashString) {
    // Asset to be minted
    const creator = to;
    const packId = ++id;
    const supply = value;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      PolygonAssetERC1155.connect(ethers.provider.getSigner(minter))[
        'mint(address,uint40,bytes32,uint256,address,bytes)'
      ](creator, packId, hash, supply, owner, data)
    );

    const transferEvent = await expectEventWithArgs(
      PolygonAssetERC1155,
      receipt,
      'TransferSingle'
    );
    const tokenId = transferEvent.args[3];

    return tokenId;
  }

  const users = await setupUsers(otherAccounts, {Asset});

  return {
    Sand,
    Asset,
    PolygonAssetERC1155,
    AssetERC1155Tunnel,
    PolygonAssetERC1155Tunnel,
    PolygonAssetERC721,
    assetSignedAuctionAuthContract,
    users,
    minter,
    extractor,
    mintAsset,
    trustedForwarder,
    assetBouncerAdmin,
  };
};

async function gemsAndCatalystsFixtureL1() {
  return gemsAndCatalystsFixture(false);
}

async function gemsAndCatalystsFixtureL2() {
  return gemsAndCatalystsFixture(true);
}

export const setupPolygonAsset = withSnapshot(
  [
    'PolygonAssetERC1155',
    'PolygonAssetERC721',
    'Asset',
    'AssetERC1155Tunnel',
    'PolygonAssetERC1155Tunnel',
    'AssetSignedAuctionAuth',
    'SandBaseToken',
  ],
  polygonAssetFixtures
);

export const setupMainnetAndPolygonAsset = withSnapshot(
  [
    'AssetSignedAuctionAuth',
    'SandBaseToken',
    'PolygonAssetERC1155',
    'PolygonAssetERC721',
    'Asset',
    'AssetERC721',
    'PolygonAssetAttributesRegistry',
    'PolygonGemsCatalystsRegistry',
    'AssetAttributesRegistry',
    'GemsCatalystsRegistry',
  ],
  async () => {
    return {
      polygon: await polygonAssetFixtures(),
      mainnet: await assetFixtures(),
      polygonAssetRegistry: await gemsAndCatalystsFixtureL2(),
      assetRegistry: await gemsAndCatalystsFixtureL1(),
    };
  }
);
