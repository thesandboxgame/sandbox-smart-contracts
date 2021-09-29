import {ethers, getNamedAccounts} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {assetUpgraderFixtures} from '../../../common/fixtures/assetUpgrader';
import {withSnapshot} from '../../../utils';

const assetMinterFixtures = async () => {
  const assetMinterContract = await ethers.getContract('AssetMinter');
  const assetContract = await ethers.getContract('Asset');

  const {deployer} = await getNamedAccounts();

  const assetMinterContractAsOwner = assetMinterContract.connect(
    ethers.provider.getSigner(deployer)
  );
  return {
    assetMinterContractAsOwner,
    assetMinterContract,
    assetContract,
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
