import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

import {shouldCheckForRoyalty} from './common/Royalty.behavior';
import {shouldCheckForAdmin} from './common/WithAdmin.behavior';
import {shouldCheckForSuperOperators} from './common/WithSuperOperators.behavior';
import {shouldCheckForOperatorFilter} from './common/OperatorFilter.behavior';
import {shouldCheckLandGetter} from './common/LandGetter.behavior';
import {shouldCheckMintQuad} from './common/MintQuad.behavior';
import {shouldCheckTransferQuad} from './common/TransferQuad.behavior';
import {shouldCheckTransferFrom} from './common/TransferFrom.behavior';
import {shouldCheckForMetadataRegistry} from './common/WithMetadataRegistry.behavior';
import {landConfig} from './common/Config.behavior';
import {shouldCheckForERC721} from './common/ERC721.behavior';
import {setupContract, setupERC721Test, setupOperatorFilter} from './fixtures';

async function setupLandBase() {
  return setupContract('LandBaseMock');
}

async function setupLandBaseOperatorFilter() {
  return setupOperatorFilter(await setupLandBase());
}

async function setupLandBaseForERC721Tests() {
  return setupERC721Test(await setupLandBase());
}

describe('Land.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForRoyalty(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForAdmin(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForSuperOperators(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForOperatorFilter(setupLandBaseOperatorFilter, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckLandGetter(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckMintQuad(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferQuad(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferFrom(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForMetadataRegistry(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  landConfig(setupLandBase, 'LandBase');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForERC721(setupLandBaseForERC721Tests, 'LandBase');
  it(`should revert for invalid size`, async function () {
    const {LandContract} = await loadFixture(setupLandBase);
    await expect(LandContract.exists(5, 5, 5))
      .to.be.revertedWithCustomError(LandContract, 'InvalidCoordinates')
      .withArgs(5, 5, 5);
  });

  it('should not be a landMinter by default', async function () {
    const {LandContract, deployer} = await loadFixture(setupLandBase);
    expect(await LandContract.isMinter(deployer)).to.be.false;
  });

  it('should not accept zero address as landMinter', async function () {
    const {LandAsAdmin} = await setupLandBase();
    await expect(
      LandAsAdmin.setMinter(ZeroAddress, false),
    ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
    await expect(
      LandAsAdmin.setMinter(ZeroAddress, true),
    ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
    expect(await LandAsAdmin.isMinter(ZeroAddress)).to.be.false;
  });

  it('should only be able to disable an enabled landMinter', async function () {
    const {LandAsAdmin, deployer} = await setupLandBase();
    await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
    expect(await LandAsAdmin.isMinter(deployer)).to.be.true;
    await expect(
      LandAsAdmin.setMinter(deployer, true),
    ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidArgument');
    await expect(LandAsAdmin.setMinter(deployer, false)).not.to.be.reverted;
  });

  it('should only be able to enable a disabled landMinter', async function () {
    const {LandAsAdmin, deployer} = await setupLandBase();
    expect(await LandAsAdmin.isMinter(deployer)).to.be.false;
    await expect(
      LandAsAdmin.setMinter(deployer, false),
    ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidArgument');
    await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
  });

  it('should emit OwnershipTransferred event', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupLandBase);
    const tx = await LandAsAdmin.transferOwnership(other);
    await expect(tx)
      .to.emit(LandAsAdmin, 'OwnershipTransferred')
      .withArgs(landOwner, other);
  });
});
