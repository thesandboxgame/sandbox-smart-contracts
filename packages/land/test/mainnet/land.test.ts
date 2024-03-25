import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {getId} from '../fixtures';
import {ZeroAddress} from 'ethers';
import {setupLandOperatorFilter} from '../fixtures';
import {setupLand, setupLandMock} from './fixtures';
import {shouldCheckForRoyalty} from '../common/Royalty.behavior';
import {shouldCheckForAdmin} from '../common/WithAdmin.behavior';
import {shouldCheckForSuperOperators} from '../common/WithSuperOperators.behavior';
import {shouldCheckForOperatorFilter} from '../common/OperatorFilter.behavior';
import {shouldCheckLandGetter} from '../common/LandGetter.behavior';
import {shouldCheckMintQuad} from '../common/MintQuad.behavior';
import {shouldCheckTransferQuad} from '../common/TransferQuad.behavior';
import {shouldCheckTransferFrom} from '../common/TransferFrom.behavior';
import {landConfig} from '../common/Config.behavior';

const sizes = [1, 3, 6, 12, 24];

describe('Land.sol', function () {
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
  landConfig(setupLand, 'Land');

  it('should return the name of the token contract', async function () {
    const {LandContract} = await loadFixture(setupLand);
    expect(await LandContract.name()).to.be.equal("Sandbox's LANDs");
  });

  it('should return the symbol of the token contract', async function () {
    const {LandContract} = await loadFixture(setupLand);
    expect(await LandContract.symbol()).to.be.equal('LAND');
  });

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

  it('should revert when to signer is not landMinter', async function () {
    const {LandContract, deployer} = await loadFixture(setupLand);
    await expect(
      LandContract.mintQuad(deployer, 3, 0, 0, '0x'),
    ).to.be.revertedWith('Only a minter can mint');
  });

  it('should revert when minted with zero size', async function () {
    const {LandAsMinter, deployer} = await loadFixture(setupLand);
    await expect(
      LandAsMinter.mintQuad(deployer, 0, 0, 0, '0x'),
    ).to.be.revertedWith('size cannot be zero');
  });

  it('it should revert approveFor for unauthorized sender', async function () {
    const {LandAsOther, other, deployer, other1, LandAsMinter} =
      await loadFixture(setupLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther.approveFor(deployer, other1, id),
    ).to.be.revertedWith('not authorized to approve');
  });

  it('it should revert for setApprovalForAllFor of zero address', async function () {
    const {LandAsOther, other1} = await loadFixture(setupLand);
    await expect(
      LandAsOther.setApprovalForAllFor(ZeroAddress, other1, true),
    ).to.be.revertedWith('Invalid sender address');
  });

  it('should revert approveFor of operator is ZeroAddress', async function () {
    const {LandAsOther, other1, other, LandAsMinter} =
      await loadFixture(setupLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther.approveFor(ZeroAddress, other1, id),
    ).to.be.revertedWith('sender is zero address');
  });

  it('it should revert setApprovalForAllFor for unauthorized sender', async function () {
    const {LandAsOther, other1, deployer} = await loadFixture(setupLand);
    await expect(
      LandAsOther.setApprovalForAllFor(deployer, other1, true),
    ).to.be.revertedWith('not authorized');
  });

  it('it should revert Approval for invalid token', async function () {
    const {LandAsOther, other, deployer, LandAsMinter} =
      await loadFixture(setupLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 2, 2);
    await expect(LandAsOther.approve(deployer, id)).to.be.revertedWith(
      'token does not exist',
    );
  });

  it('should revert approveFor for unauthorized sender', async function () {
    const {LandAsOther, other, deployer, other1, LandAsMinter} =
      await loadFixture(setupLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther.approveFor(deployer, other1, id),
    ).to.be.revertedWith('not authorized to approve');
  });

  it('should revert when id is not minted', async function () {
    const {LandContract} = await loadFixture(setupLand);
    const id = getId(1, 2, 2);
    await expect(LandContract.tokenURI(id)).to.be.revertedWith(
      'Land: Id does not exist',
    );
  });

  it('should revert when from is zero address (batchTransferQuad)', async function () {
    const {LandContract, LandAsMinter, deployer, landAdmin} =
      await loadFixture(setupLand);
    await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
    await expect(
      LandContract.batchTransferQuad(
        ZeroAddress,
        landAdmin,
        [6],
        [0],
        [0],
        '0x',
      ),
    ).to.be.revertedWith('from is zero address');
  });

  it('should revert when to is ZeroAddress (mintAndTransferQuad)', async function () {
    const {LandAsAdmin, landAdmin, LandAsMinter} = await loadFixture(setupLand);
    await LandAsMinter.mintQuad(landAdmin, 6, 0, 0, '0x');
    await expect(
      LandAsAdmin.mintAndTransferQuad(ZeroAddress, 3, 0, 0, '0x'),
    ).to.be.revertedWith('to is zero address');
  });

  it('should revert when signer is not a landMinter (mintAndTransferQuad)', async function () {
    const {LandContract, deployer} = await loadFixture(setupLand);
    await expect(
      LandContract.mintAndTransferQuad(deployer, 3, 0, 0, '0x'),
    ).to.be.revertedWith('Only a minter can mint');
  });

  it('should emit RoyaltyManagerSet event', async function () {
    const {LandAsAdmin, other} = await loadFixture(setupLand);
    const tx = await LandAsAdmin.setRoyaltyManager(other);
    await expect(tx).to.emit(LandAsAdmin, 'RoyaltyManagerSet').withArgs(other);
  });

  it('should emit OwnershipTransferred event', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupLand);
    const tx = await LandAsAdmin.transferOwnership(other);
    await expect(tx)
      .to.emit(LandAsAdmin, 'OwnershipTransferred')
      .withArgs(landOwner, other);
  });

  it('Transfer 1x1 without approval', async function () {
    const {LandContract, LandAsMinter, deployer, other} =
      await loadFixture(setupLand);

    const bytes = '0x3333';
    await LandAsMinter.mintQuad(other, 1, 0, 0, bytes);

    await expect(
      LandContract.transferFrom(other, deployer, 0),
    ).to.be.revertedWith('not approved to transfer');
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

  describe(`should revert for invalid coordinates`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      if (quadSize == 1) return;
      it(`size ${quadSize}x${quadSize}`, async function () {
        const {LandContract} = await loadFixture(setupLand);
        await expect(
          LandContract.exists(quadSize, quadSize + 1, quadSize + 1),
        ).to.be.revertedWith('Invalid x coordinate');
      });
    });
  });
});
