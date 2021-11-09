import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {assetUpgraderFixtures} from '../../../common/fixtures/assetUpgrader';
import {withSnapshot} from '../../../utils';

const assetMinterFixtures = async () => {
  const assetMinterContract = await ethers.getContract('AssetMinter');
  const assetContract = await ethers.getContract('Asset');
  const user3 = (await getUnnamedAccounts())[3];
  const {assetMinterAdmin} = await getNamedAccounts();

  const assetMinterContractAsOwner = assetMinterContract.connect(
    ethers.provider.getSigner(assetMinterAdmin)
  );

  const assetMinterContractAsUser3 = assetMinterContract.connect(
    ethers.provider.getSigner(user3)
  );

  return {
    assetMinterContractAsOwner,
    assetMinterContract,
    assetContract,
    assetMinterContractAsUser3,
    user3,
  };
};

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
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetMinterFixtures()),
  })
);
export const setupAssetMinterAttributesRegistryGemsAndCatalysts = withSnapshot(
  [
    'AssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'AssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'GemsCatalystsRegistry_setup', // No Contract deployed with name Gem_POWER
  ],
  async () => ({
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetAttributesRegistryFixture()),
    ...(await assetMinterFixtures()),
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
    ...(await assetUpgraderFixtures()),
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetMinterFixtures()),
  })
);
