import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {assetUpgraderFixtures} from '../../../common/fixtures/assetUpgrader';
import {withSnapshot} from '../../../utils';

// Deployed on Polygon
const assetMinterFixtures = async () => {
  const assetMinterContract = await ethers.getContract('PolygonAssetMinter');
  const assetContract = await ethers.getContract('PolygonAssetERC1155');
  const user3 = (await getUnnamedAccounts())[3];
  const {assetMinterAdmin, sandAdmin} = await getNamedAccounts();

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
    sandAdmin,
  };
};

export const setupAssetMinter = withSnapshot(
  ['PolygonAssetMinter', 'L2'],
  assetMinterFixtures
);

export const setupAssetMinterGemsAndCatalysts = withSnapshot(
  [
    'PolygonAssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'PolygonAssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'PolygonGemsCatalystsRegistry_setup',
    'L2',
  ],
  async () => ({
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetMinterFixtures()),
  })
);
export const setupAssetMinterAttributesRegistryGemsAndCatalysts = withSnapshot(
  [
    'PolygonAssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'PolygonAssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'PolygonGemsCatalystsRegistry_setup',
    'L2',
  ],
  async () => ({
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetAttributesRegistryFixture()),
    ...(await assetMinterFixtures()),
  })
);

export const setupAssetMinterUpgraderGemsAndCatalysts = withSnapshot(
  [
    'PolygonAssetMinter_setup', // we need to set up the bouncer, 'only bouncer allowed to mint'
    'PolygonAssetAttributesRegistry_setup', // we need to set AssetMinter as AuthorizedMinter NOT_AUTHORIZED_MINTER
    'PolygonGemsCatalystsRegistry_setup',
    'PolygonAssetUpgrader_setup',
    'PolygonAssetUpgraderFeeBurner_setup',
    'L2',
  ],
  async () => ({
    ...(await assetUpgraderFixtures()),
    ...(await gemsAndCatalystsFixtures()),
    ...(await assetMinterFixtures()),
  })
);
