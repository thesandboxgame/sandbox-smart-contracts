import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupLandForERC721Tests, setupLandOperatorFilter} from '../fixtures';
import {ZeroAddress} from 'ethers';
import {setupLand, setupLandMock} from './fixtures';
import {shouldCheckForRoyalty} from '../common/Royalty.behavior';
import {shouldCheckForAdmin} from '../common/WithAdmin.behavior';
import {shouldCheckForSuperOperators} from '../common/WithSuperOperators.behavior';
import {shouldCheckForOperatorFilter} from '../common/OperatorFilter.behavior';
import {shouldCheckLandGetter} from '../common/LandGetter.behavior';
import {shouldCheckMintQuad} from '../common/MintQuad.behavior';
import {shouldCheckTransferQuad} from '../common/TransferQuad.behavior';
import {shouldCheckTransferFrom} from '../common/TransferFrom.behavior';
import {shouldCheckForMetadataRegistry} from '../common/WithMetadataRegistry.behavior';
import {landConfig} from '../common/Config.behavior';
import {shouldCheckForERC721} from '../common/ERC721.behavior';
import {gasAndSizeChecks} from '../common/gasAndSizeChecks.behavior';

describe('Land.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  gasAndSizeChecks(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForRoyalty(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForAdmin(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForSuperOperators(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForOperatorFilter(setupLandOperatorFilter, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckLandGetter(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckMintQuad(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferQuad(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferFrom(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForMetadataRegistry(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  landConfig(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForERC721(setupLandForERC721Tests, 'Land');

  it(`should revert for invalid size`, async function () {
    const {LandContract} = await loadFixture(setupLand);
    await expect(LandContract.exists(5, 5, 5)).to.be.revertedWith(
      'Invalid size',
    );
  });

  it('should not be a landMinter by default', async function () {
    const {LandContract, deployer} = await loadFixture(setupLand);
    expect(await LandContract.isMinter(deployer)).to.be.false;
  });

  it('should not accept zero address as landMinter', async function () {
    const {LandAsAdmin} = await setupLand();
    await expect(LandAsAdmin.setMinter(ZeroAddress, false)).to.be.revertedWith(
      'address 0 is not allowed',
    );
    await expect(LandAsAdmin.setMinter(ZeroAddress, true)).to.be.revertedWith(
      'address 0 is not allowed',
    );
    expect(await LandAsAdmin.isMinter(ZeroAddress)).to.be.false;
  });

  it('should only be able to disable an enabled landMinter', async function () {
    const {LandAsAdmin, deployer} = await setupLand();
    await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
    expect(await LandAsAdmin.isMinter(deployer)).to.be.true;
    await expect(LandAsAdmin.setMinter(deployer, true)).to.be.revertedWith(
      'the status should be different',
    );
    await expect(LandAsAdmin.setMinter(deployer, false)).not.to.be.reverted;
  });

  it('should only be able to enable a disabled landMinter', async function () {
    const {LandAsAdmin, deployer} = await setupLand();
    expect(await LandAsAdmin.isMinter(deployer)).to.be.false;
    await expect(LandAsAdmin.setMinter(deployer, false)).to.be.revertedWith(
      'the status should be different',
    );
    await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
  });

  it('should emit OwnershipTransferred event', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupLand);
    const tx = await LandAsAdmin.transferOwnership(other);
    await expect(tx)
      .to.emit(LandAsAdmin, 'OwnershipTransferred')
      .withArgs(landOwner, other);
  });

  it('check storage structure', async function () {
    const {landContract} = await loadFixture(setupLandMock);
    const slots = await landContract.getStorageStructure();
    expect(slots._admin).to.be.equal(0);
    expect(slots._superOperators).to.be.equal(1);
    expect(slots._metaTransactionContracts).to.be.equal(2);
    expect(slots._numNFTPerAddress).to.be.equal(3);
    expect(slots._owners).to.be.equal(4);
    expect(slots._operatorsForAll).to.be.equal(5);
    expect(slots._operators).to.be.equal(6);
    expect(slots._initialized).to.be.equal(7);
    expect(slots._minters).to.be.equal(57);
    expect(slots.operatorFilterRegistry).to.be.equal(58);
  });
});
