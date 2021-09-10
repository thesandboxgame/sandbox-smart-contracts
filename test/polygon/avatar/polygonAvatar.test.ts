import {expect} from 'chai';
import {setupAvatarTest} from './fixtures';
import {BigNumber} from 'ethers';

describe('PolygonAvatar.sol differences with Avatar.sol', function () {
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAvatarTest();
        const defaultAdminRole = await fixtures.polygonAvatar.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.polygonAvatar.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
      it('admin can set maxMinLength', async function () {
        const fixtures = await setupAvatarTest();
        expect(await fixtures.polygonAvatar.maxMinLength()).to.be.equal(1);
        await fixtures.polygonAvatarAsAdmin.setMaxMintLength(5);
        expect(await fixtures.polygonAvatar.maxMinLength()).to.be.equal(5);
      });
      it('other should fail to set maxMinLength', async function () {
        const fixtures = await setupAvatarTest();
        await expect(
          fixtures.polygonAvatar.setMaxMintLength(5)
        ).to.revertedWith('must have admin role');
      });
    });
    describe('minter role', function () {
      it('minter role is set', async function () {
        const fixtures = await setupAvatarTest();
        expect(
          await fixtures.polygonAvatarAsMinter.hasRole(
            fixtures.minterRole,
            fixtures.minter
          )
        ).to.be.true;
      });
      it('minter can mint', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAvatarTest();
        await fixtures.polygonAvatarAsMinter.mint(fixtures.dest, tokenId);
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.dest
        );
      });
      it('other should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAvatarTest();
        await expect(
          fixtures.polygonAvatar.mint(fixtures.dest, tokenId)
        ).to.revertedWith('must have minter role');
      });
      it('minter can mintBatch', async function () {
        const cant = 3;
        const tokenIds = Array.from({length: cant}, () =>
          Math.floor(Math.random() * 1234567)
        );
        const fixtures = await setupAvatarTest();
        await fixtures.polygonAvatarAsAdmin.setMaxMintLength(cant);
        await fixtures.polygonAvatarAsMinter.mintBatch(fixtures.dest, tokenIds);
        for (const tokenId of tokenIds) {
          expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
            fixtures.dest
          );
        }
      });
      it('other should fail to mintBatch', async function () {
        const cant = 3;
        const tokenIds = Array.from({length: cant}, () =>
          Math.floor(Math.random() * 1234567)
        );
        const fixtures = await setupAvatarTest();
        await fixtures.polygonAvatarAsAdmin.setMaxMintLength(cant);
        await expect(
          fixtures.polygonAvatarAsOther.mintBatch(fixtures.dest, tokenIds)
        ).to.revertedWith('must have minter role');
      });
    });

    describe('pauser role', function () {
      it('pauser role is set', async function () {
        const fixtures = await setupAvatarTest();
        const pauseRole = await fixtures.polygonAvatar.PAUSE_ROLE();
        expect(await fixtures.polygonAvatar.hasRole(pauseRole, fixtures.pauser))
          .to.be.true;
      });
      it('pauser can can pause', async function () {
        const fixtures = await setupAvatarTest();
        expect(await fixtures.polygonAvatar.paused()).to.be.false;
        await fixtures.polygonAvatarAsPauser.pause();
        expect(await fixtures.polygonAvatar.paused()).to.be.true;
      });
      it('other should fail to set pause', async function () {
        const fixtures = await setupAvatarTest();
        await expect(fixtures.polygonAvatarAsOther.pause()).to.revertedWith(
          'must have pause role'
        );
      });
    });
  });
  it('should fail to set maxMinLength to zero', async function () {
    const fixtures = await setupAvatarTest();
    expect(await fixtures.polygonAvatar.maxMinLength()).to.be.equal(1);
    await expect(
      fixtures.polygonAvatarAsAdmin.setMaxMintLength(0)
    ).to.revertedWith('invalid value');
  });
  describe('pause/unpause', function () {
    it('should fail to mint when paused and success when unpaused', async function () {
      const fixtures = await setupAvatarTest();
      const tokenId = BigNumber.from('0xdada1');

      await fixtures.polygonAvatarAsPauser.pause();
      await expect(
        fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId)
      ).to.revertedWith('paused');

      await fixtures.polygonAvatarAsPauser.unpause();

      await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
      expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );
    });
    it('should fail to mintBatch when paused and success when unpaused', async function () {
      const cant = 3;
      const tokenIds = Array.from({length: cant}, () =>
        Math.floor(Math.random() * 1234567)
      );
      const fixtures = await setupAvatarTest();
      await fixtures.polygonAvatarAsAdmin.setMaxMintLength(cant);

      await fixtures.polygonAvatarAsPauser.pause();
      await expect(
        fixtures.polygonAvatarAsMinter.mintBatch(fixtures.dest, tokenIds)
      ).to.revertedWith('paused');

      await fixtures.polygonAvatarAsPauser.unpause();

      await fixtures.polygonAvatarAsMinter.mintBatch(fixtures.dest, tokenIds);
      for (const tokenId of tokenIds) {
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.dest
        );
      }
    });
  });
});
