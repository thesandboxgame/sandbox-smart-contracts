import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {AbiCoder} from '@ethersproject/contracts/node_modules/@ethersproject/abi';

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

  const Sand = await ethers.getContract('SandBaseToken');
  const Asset = await ethers.getContract('Asset', assetBouncerAdmin);
  const PolygonAssetERC1155 = await ethers.getContract(
    'PolygonAssetERC1155',
    assetBouncerAdmin
  );
  await waitFor(PolygonAssetERC1155.setBouncer(minter, true));

  const assetSignedAuctionAuthContract = await ethers.getContract(
    'AssetSignedAuctionAuth'
  );

  await waitFor(Asset.setBouncer(minter, true));

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
    assetSignedAuctionAuthContract,
    users,
    minter,
    mintAsset,
    trustedForwarder,
  };
};

export const setupAssetERC1155Tunnels = deployments.createFixture(
  async function () {
    await deployments.fixture([
      'PolygonAssetERC1155',
      'Asset',
      'PolygonAssetERC1155Tunnel',
      'AssetERC1155Tunnel',
      'FXROOT',
      'FXCHILD',
      'CHECKPOINTMANAGER',
      'MockAssetERC1155Tunnel',
    ]);
    const PolygonAssetERC1155 = await ethers.getContract('PolygonAssetERC1155');
    const AssetERC1155 = await ethers.getContract('Asset');
    const PolygonAssetERC1155Tunnel = await ethers.getContract(
      'PolygonAssetERC1155Tunnel'
    );
    const AssetERC1155Tunnel = await ethers.getContract('AssetERC1155Tunnel');
    const FxRoot = await ethers.getContract('FXROOT');
    const FxChild = await ethers.getContract('FXCHILD');
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
    const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
    const MockAssetERC1155Tunnel = await ethers.getContract(
      'MockAssetERC1155Tunnel'
    );
    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    const trustedForwarder = await ethers.getContractAt(
      'TestMetaTxForwarder',
      TRUSTED_FORWARDER.address
    );

    const namedAccounts = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();
    const otherAccounts = [...unnamedAccounts];
    const minter = otherAccounts[0];
    otherAccounts.splice(0, 1);

    const users = await setupUsers(otherAccounts, {
      PolygonAssetERC1155,
      AssetERC1155,
      PolygonAssetERC1155Tunnel,
      AssetERC1155Tunnel,
      FxRoot,
      FxChild,
      MockAssetERC1155Tunnel,
    });
    const deployer = await setupUser(namedAccounts.deployer, {
      PolygonAssetERC1155,
      AssetERC1155,
      PolygonAssetERC1155Tunnel,
      AssetERC1155Tunnel,
      FxRoot,
      FxChild,
      CheckpointManager,
      MockAssetERC1155Tunnel,
    });
    const assetAdmin = await setupUser(namedAccounts.assetAdmin, {
      AssetERC1155,
      PolygonAssetERC1155,
    });

    const assetMinter = await setupUser(minter, {
      AssetERC1155,
      PolygonAssetERC1155,
    });

    await assetAdmin.AssetERC1155.setPredicate(MockAssetERC1155Tunnel.address);

    await deployer.FxRoot.setFxChild(FxChild.address);
    await deployer.PolygonAssetERC1155Tunnel.setFxRootTunnel(
      MockAssetERC1155Tunnel.address
    );
    await deployer.MockAssetERC1155Tunnel.setFxChildTunnel(
      PolygonAssetERC1155Tunnel.address
    );

    await assetAdmin.PolygonAssetERC1155.setBouncer(
      PolygonAssetERC1155Tunnel.address,
      true
    );

    await assetAdmin.PolygonAssetERC1155.setBouncer(minter, true);

    let id = 0;
    const ipfsHashString =
      '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

    const data = '0x';

    async function mintAssetOnL2(
      to: string,
      value: number,
      hash = ipfsHashString
    ) {
      // Asset to be minted
      const creator = to;
      const packId = ++id;
      const supply = value;
      const owner = to;

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

    async function mintAssetOnL1(
      to: string,
      generatedId: string,
      value: number
    ) {
      // Only the predicate can mint on L1
      // "minter"  used for test minting only, this is put back to MockAssetERC1155Tunnel in tests immediately after mint
      await assetAdmin.AssetERC1155.setPredicate(minter);

      // L1 minting must have metadata passed in as data param
      // Test IDs must also be in expected format (eg as generated by L2 contract) otherwise contract will revert with 'ID_TAKEN'
      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');
      const MOCK_DATA = new AbiCoder().encode(['bytes32'], [testMetadataHash]);

      const receipt = await waitFor(
        assetMinter.AssetERC1155['mint(address,uint256,uint256,bytes)'](
          to,
          generatedId,
          value,
          MOCK_DATA
        )
      );
      // Change predicate to the actual predicate once user's test assets have been minted
      await assetAdmin.AssetERC1155.setPredicate(
        MockAssetERC1155Tunnel.address
      );

      const transferEvent = await expectEventWithArgs(
        AssetERC1155,
        receipt,
        'TransferSingle'
      );
      const tokenId = transferEvent.args[3];

      return tokenId;
    }

    return {
      users,
      deployer,
      assetAdmin,
      assetMinter,
      PolygonAssetERC1155,
      AssetERC1155,
      PolygonAssetERC1155Tunnel,
      AssetERC1155Tunnel,
      mintAssetOnL1,
      mintAssetOnL2,
      FxRoot,
      FxChild,
      CheckpointManager,
      childChainManager,
      MockAssetERC1155Tunnel,
      trustedForwarder,
    };
  }
);

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
    'PolygonAssetERC1155Tunnel',
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
