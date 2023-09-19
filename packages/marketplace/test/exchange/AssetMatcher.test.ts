import {deployAssetMatcher} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';

const MOCK_ADDRESS_1 = '0x0000000000000000000000000000000000000001';

describe('AssetMatcher.sol', function () {
  it('setAssetMatcher should revert if msg sender is not owner', async function () {
    const {assetMatcherAsUser} = await loadFixture(deployAssetMatcher);

    await expect(
      assetMatcherAsUser.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('setAssetMatcher works', async function () {
    const {assetMatcherAsDeployer} = await loadFixture(deployAssetMatcher);

    await expect(
      assetMatcherAsDeployer.setAssetMatcher('0x00000001', MOCK_ADDRESS_1)
    )
      .to.emit(assetMatcherAsDeployer, 'MatcherChange')
      .withArgs('0x00000001', MOCK_ADDRESS_1);
  });
});
