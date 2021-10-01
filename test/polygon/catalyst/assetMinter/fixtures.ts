import {ethers} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {assetUpgraderFixtures} from '../../../common/fixtures/assetUpgrader';
import {withSnapshot} from '../../../utils';

const assetMinterFixtures = async () => ({
  assetMinterContract: await ethers.getContract('AssetMinter'),
  assetContract: await ethers.getContract('Asset'),
});

export const setupAssetMinter = withSnapshot(
  ['AssetMinter'],
  assetMinterFixtures
);

export const setupAssetMinterGemsAndCatalysts = withSnapshot(
  [
    'AssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'AssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER
  ],
  async () => ({
    ...(await assetMinterFixtures()),
    ...(await gemsAndCatalystsFixtures()),
  })
);
export const setupAssetMinterAttributesRegistryGemsAndCatalysts = withSnapshot(
  [
    'AssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'AssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER
  ],
  async () => ({
    ...(await assetMinterFixtures()),
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetAttributesRegistryFixture()),
  })
);

export const setupAssetMinterUpgraderGemsAndCatalysts = withSnapshot(
  [
    'AssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'AssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER
    'AssetUpgrader_setup',
    'AssetUpgraderFeeBurner_setup',
  ],
  async () => ({
    ...(await assetMinterFixtures()),
    ...(await assetUpgraderFixtures()),
    ...(await gemsAndCatalystsFixtures()),
  })
);
