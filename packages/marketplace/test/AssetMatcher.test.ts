import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {AssetClassType} from './utils/assets';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';

async function deployLibAssetMock() {
  const [deployer, user] = await ethers.getSigners();
  const LibAssetMock = await ethers.getContractFactory('LibAssetMock');
  const libAssetMock = await LibAssetMock.deploy();
  const assetMatcherAsUser = libAssetMock.connect(user);
  return {
    deployer,
    user,
    assetMatcherAsUser,
  };
}

describe('AssetMatcher.sol', function () {
  let assetMatcherAsUser: Contract;

  beforeEach(async function () {
    ({assetMatcherAsUser} = await loadFixture(deployLibAssetMock));
  });

  it('should revert matchAsset call if asset class is invalid', async function () {
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
    ).to.be.revertedWith('invalid left asset class');
    await expect(
      assetMatcherAsUser.matchAssets(rightAssetType, leftAssetType)
    ).to.be.revertedWith('invalid right asset class');
  });

  it('should call return the expected AssetType', async function () {
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

  it('should revert when asset class does not match', async function () {
    const leftAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };

    const rightAssetType = {
      assetClass: AssetClassType.ERC20_ASSET_CLASS,
      data: '0x1234',
    };

    await expect(
      assetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
    ).to.revertedWith("assets don't match");
  });

  it('should revert when data does not match', async function () {
    const leftAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0x1234',
    };

    const rightAssetType = {
      assetClass: AssetClassType.ERC721_ASSET_CLASS,
      data: '0xFFFF',
    };

    await expect(
      assetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
    ).to.revertedWith("assets don't match");
  });
});
