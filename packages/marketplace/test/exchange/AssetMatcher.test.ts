import {deployAssetMatcher} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';

const MOCK_ADDRESS_1 = '0x0000000000000000000000000000000000000001';

describe('AssetMatcher contract', function () {
  it('setAssetMatcher should revert if msg sender is not owner', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployAssetMatcher);

    await expect(
      assetMatcherAsUser.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('setAssetMatcher should be able to set matcher address', async function () {
    const {assetMatcherAsDeployer} = await loadFixture(deployAssetMatcher);

    await expect(
      assetMatcherAsDeployer.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    )
      .to.emit(assetMatcherAsDeployer, 'MatcherChange')
      .withArgs('0x00000001', MOCK_ADDRESS_1);
  });

  it('matchAsset should revert if asset class do not match', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployAssetMatcher);

    const leftAssetType = {assetClass: '0x00000001', data: '0x1234'};

    const rightAssetType = {assetClass: '0x00000002', data: '0x1234'};
    await expect(
      assetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
    ).to.be.revertedWith('not found IAssetMatcher');
  });

  it('matchAsset should return the expected AssetType', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployAssetMatcher);

    const leftAssetType = {assetClass: '0x00000001', data: '0x1234'};

    const rightAssetType = {assetClass: '0x00000001', data: '0x1234'};
    const result = await assetMatcherAsUser.matchAssets(
      leftAssetType,
      rightAssetType
    );
    expect(result[0]).to.be.equal(leftAssetType.assetClass);
    expect(result[1]).to.be.equal(leftAssetType.data);
  });

  it('matchAsset should return null when data does not match', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployAssetMatcher);

    const leftAssetType = {assetClass: '0x00000001', data: '0x1234'};

    const rightAssetType = {assetClass: '0x00000001', data: '0x1254'};
    const nullAsetType = {assetClass: '0x00000000', data: '0x'};
    const result = await assetMatcherAsUser.matchAssets(
      leftAssetType,
      rightAssetType
    );
    expect(result[0]).to.be.equal(nullAsetType.assetClass);
    expect(result[1]).to.be.equal(nullAsetType.data);
  });
});
