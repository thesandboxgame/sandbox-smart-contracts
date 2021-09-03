import {Event} from '@ethersproject/contracts';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

import {setupUsers, waitFor, withSnapshot} from '../../utils';
import {assetFixtures} from '../../common/fixtures/asset';
import {Contract} from 'ethers';
// import asset_regenerate_and_distribute from '../../setup/asset_regenerate_and_distribute';

const polygonAssetFixtures = async function () {
  // await asset_regenerate_and_distribute(hre);
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  otherAccounts.splice(0, 1);

  const {assetBouncerAdmin} = await getNamedAccounts();

  const assetContractAsBouncerAdmin = await ethers.getContract(
    'PolygonAsset',
    assetBouncerAdmin
  );

  await waitFor(assetContractAsBouncerAdmin.setBouncer(minter, true));
  const Asset = await ethers.getContract('PolygonAsset', minter);
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  // Set childChainManager Asset
  try {
    await waitFor(childChainManager.setPolygonAsset(Asset.address));
  } catch (e) {
    console.log(e);
  }

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

    let receipt;
    try {
      receipt = await waitFor(
        Asset.mint(creator, packId, hash, supply, rarity, owner, data)
      );
    } catch (e) {
      console.log(e);
    }

    const event = receipt?.events?.filter(
      (event: Event) => event.event === 'TransferSingle'
    )[0];
    if (!event) {
      throw new Error('no TransferSingle event after mint single');
    }
    return event.args?.id;
  }

  async function mintMultiple(
    to: string,
    supplies: number[],
    hash = ipfsHashString
  ): Promise<number[]> {
    const creator = to;
    const packId = ++id;
    const rarity = 0;
    const owner = to;
    const data = '0x';

    const tx = await Asset.mintMultiple(
      creator,
      packId,
      hash,
      supplies,
      rarity,
      owner,
      data
    );
    const receipt = await tx.wait();
    return receipt.events.find((v: Event) => v.event === 'TransferBatch')
      .args[3];
  }

  const users = await setupUsers(otherAccounts, {Asset});

  return {
    Asset,
    users,
    mintAsset,
    mintMultiple,
    trustedForwarder,
    childChainManager,
  };
};

export const setupAssetRegistry = deployments.createFixture(async function () {
  const {assetAttributesRegistryAdmin} = await getNamedAccounts();
  const assetAttributesRegistry: Contract = await ethers.getContract(
    'AssetAttributesRegistry'
  );
  const assetAttributesRegistryAsRegistryAdmin = await assetAttributesRegistry.connect(
    ethers.provider.getSigner(assetAttributesRegistryAdmin)
  );

  return {
    assetAttributesRegistryAsRegistryAdmin,
  };
});

export const setupPolygonAsset = withSnapshot(
  ['PolygonAsset', 'Asset'],
  polygonAssetFixtures
);

export const setupMainnetAndPolygonAsset = withSnapshot(
  ['PolygonAsset', 'Asset'],
  async () => {
    return {
      polygon: await polygonAssetFixtures(),
      mainnet: await assetFixtures(),
    };
  }
);
