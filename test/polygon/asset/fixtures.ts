// import {Event} from '@ethersproject/contracts';
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
  otherAccounts.splice(0, 1);

  const {assetBouncerAdmin} = await getNamedAccounts();

  const PolygonAssetERC1155 = await ethers.getContract(
    'PolygonAssetERC1155',
    assetBouncerAdmin
  );
  await waitFor(PolygonAssetERC1155.setBouncer(minter, true));

  const Asset = await ethers.getContract('Asset', minter);
  const assetTunnel = await ethers.getContract('AssetERC1155Tunnel');
  const polygonAssetTunnel = await ethers.getContract(
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

  const deployerAccount = await setupUser(deployer, {
    PolygonAssetERC1155,
    Asset,
    FxRoot,
    FxChild,
    CheckpointManager,
    polygonAssetTunnel,
    assetTunnel,
  });

  await deployerAccount.FxRoot.setFxChild(FxChild.address);
  await deployerAccount.PolygonAssetERC1155.setPolygonLandTunnel(polygonAssetTunnel.address);
  await deployerAccount.PolygonAssetERC1155.setTrustedForwarder(trustedForwarder.address);

  const MOCK_DATA =
    '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000084e42535759334450000000000000000000000000000000000000000000000000';

  let id = 0;
  const ipfsHashString =
    '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

  async function mintAsset(to: string, value: number, hash = ipfsHashString) {
    // Asset to be minted
    const creator = to;
    const packId = ++id;
    const supply = value;
    const rarity = 0;
    const owner = to;
    const data = '0x';

    const receipt = await waitFor(
      PolygonAssetERC1155.connect(ethers.provider.getSigner(minter)).mint(
        creator,
        packId,
        hash,
        supply,
        rarity,
        owner,
        data
      )
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
    Asset,
    PolygonAssetERC1155,
    users,
    minter,
    mintAsset,
    assetTunnel,
    trustedForwarder,
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
    'Asset',
    'AssetERC1155Tunnel',
    'AssetSignedAuctionAuth',
    'SandBaseToken',
  ],
  polygonAssetFixtures
);

export const setupMainnetAndPolygonAsset = withSnapshot(
  [
    'SandBaseToken',
    'PolygonAsset',
    'Asset',
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
