import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {AssetClassType} from '../utils/assets';

describe('AssetMatcher.sol', function () {
  it('should revert matchAsset call if asset class is invalid', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    const leftAssetType = {
      assetClass: AssetClassType.INVALID_ASSET_CLASS,
      data: '0x1234',
    };

    const rightAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };
    await expect(
      assetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
    ).to.be.revertedWith('not found IAssetMatcher');
    await expect(
      assetMatcherAsUser.matchAssets(rightAssetType, leftAssetType)
    ).to.be.revertedWith('not found IAssetMatcher');
  });

  it('should call return the expected AssetType', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    const leftAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };

    const rightAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };
    const result = await assetMatcherAsUser.matchAssets(
      leftAssetType,
      rightAssetType
    );
    expect(result[0]).to.be.equal(leftAssetType.assetClass);
    expect(result[1]).to.be.equal(leftAssetType.data);
  });

  it('should return null when data does not match', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    const leftAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };

    const rightAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1254',
    };
    const nullAsetType = {
      assetClass: AssetClassType.INVALID_ASSET_CLASS,
      data: '0x',
    };
    const result = await assetMatcherAsUser.matchAssets(
      leftAssetType,
      rightAssetType
    );
    expect(result[0]).to.be.equal(nullAsetType.assetClass);
    expect(result[1]).to.be.equal(nullAsetType.data);
  });
});
