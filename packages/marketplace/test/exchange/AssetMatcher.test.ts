import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';

const MOCK_ADDRESS_1 = '0x0000000000000000000000000000000000000001';

describe('AssetMatcher.sol', function () {
  it('should revert setAssetMatcher call if msg sender is not owner', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    await expect(
      assetMatcherAsUser.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to set matcher address', async function () {
    const {assetMatcherAsDeployer} = await loadFixture(deployFixtures);

    await expect(
      assetMatcherAsDeployer.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    )
      .to.emit(assetMatcherAsDeployer, 'MatcherChange')
      .withArgs('0x00000001', MOCK_ADDRESS_1);
  });

  it('should revert matchAsset call if asset class do not match', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    const leftAssetType = {assetClass: '0x00000001', data: '0x1234'};

    const rightAssetType = {assetClass: '0x00000002', data: '0x1234'};
    await expect(
      assetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
    ).to.be.revertedWith('not found IAssetMatcher');
  });

  it('should call return the expected AssetType', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

    const leftAssetType = {assetClass: '0x00000001', data: '0x1234'};

    const rightAssetType = {assetClass: '0x00000001', data: '0x1234'};
    const result = await assetMatcherAsUser.matchAssets(
      leftAssetType,
      rightAssetType
    );
    expect(result[0]).to.be.equal(leftAssetType.assetClass);
    expect(result[1]).to.be.equal(leftAssetType.data);
  });

  it('should return null when data does not match', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployFixtures);

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
