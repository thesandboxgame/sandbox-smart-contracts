import {ethers} from 'hardhat';
import {expect} from 'chai';
import {solidityPack} from 'ethers/lib/utils';
import {addMinter, addPauser, setupAvatarTest} from './fixtures';

describe('Avatar.sol', function () {
  describe('initialization', function () {
    it('creation', async function () {
      const fixtures = await setupAvatarTest();
      expect(await fixtures.avatar.name()).to.be.equal(fixtures.name);
      expect(await fixtures.avatar.symbol()).to.be.equal(fixtures.symbol);
      expect(await fixtures.avatar.baseTokenURI()).to.be.equal(
        fixtures.baseUri
      );
    });

    it('interfaces', async function () {
      const fixtures = await setupAvatarTest();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IERC721: '0x80ac58cd',
        IERC721Metadata: '0x5b5e139f',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.avatar.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAvatarTest();
        const defaultAdminRole = await fixtures.avatar.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.avatar.hasRole(defaultAdminRole, fixtures.adminRole)
        ).to.be.true;
      });
      it('admin can set the trusted forwarder', async function () {
        const fixtures = await setupAvatarTest();

        const avatarAsAdmin = await ethers.getContract(
          'Avatar',
          fixtures.adminRole
        );
        expect(await fixtures.avatar.getTrustedForwarder()).to.be.equal(
          fixtures.trustedForwarder
        );
        await avatarAsAdmin.setTrustedForwarder(fixtures.other);
        expect(await fixtures.avatar.getTrustedForwarder()).to.be.equal(
          fixtures.other
        );
      });
      it('other should fail to set the trusted forwarder', async function () {
        const fixtures = await setupAvatarTest();
        await expect(
          fixtures.avatar.setTrustedForwarder(fixtures.other)
        ).to.revertedWith('must have admin role');
      });
      it('admin can set the base Url', async function () {
        const fixtures = await setupAvatarTest();

        const avatarAsAdmin = await ethers.getContract(
          'Avatar',
          fixtures.adminRole
        );
        expect(await fixtures.avatar.baseTokenURI()).to.be.equal(
          fixtures.baseUri
        );
        const otherUri = 'http://somethingelse';
        await avatarAsAdmin.setBaseUrl(otherUri);
        expect(await fixtures.avatar.baseTokenURI()).to.be.equal(otherUri);
      });
      it('other should fail to set the base Url', async function () {
        const fixtures = await setupAvatarTest();
        await expect(fixtures.avatar.setBaseUrl('test')).to.revertedWith(
          'must have admin role'
        );
      });
    });
    describe('minter', function () {
      it('mint', async function () {
        const fixtures = await setupAvatarTest();
        const avatarAsMinter = await ethers.getContract(
          'Avatar',
          fixtures.minter
        );
        await expect(
          avatarAsMinter['mint(address,uint256)'](fixtures.other, 123)
        ).to.revertedWith('must have minter role');
        await expect(
          fixtures.avatar['mint(address,uint256)'](fixtures.other, 123)
        ).to.revertedWith('must have minter role');

        await addMinter(fixtures.adminRole, fixtures.avatar, fixtures.minter);
        const minterRole = await fixtures.avatar.MINTER_ROLE();
        expect(await fixtures.avatar.hasRole(minterRole, fixtures.minter)).to.be
          .true;
        await expect(fixtures.avatar.ownerOf(123)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
        await avatarAsMinter['mint(address,uint256)'](fixtures.other, 123);
        expect(await fixtures.avatar.ownerOf(123)).to.be.equal(fixtures.other);
        expect(await fixtures.avatar.exists(123)).to.be.true;
        await expect(
          avatarAsMinter['mint(address,uint256)'](fixtures.other, 123)
        ).to.revertedWith('ERC721: token already minted');
      });
    });
    it('metaTX trusted forwarder', async function () {
      const fixtures = await setupAvatarTest();
      await addMinter(fixtures.adminRole, fixtures.avatar, fixtures.minter);
      // Regular transfer
      const avatarAsMinter = await ethers.getContract(
        'Avatar',
        fixtures.minter
      );
      await avatarAsMinter['mint(address,uint256)'](fixtures.other, 123);
      expect(await fixtures.avatar.ownerOf(123)).to.be.equal(fixtures.other);
      const avatarAsOther = await ethers.getContract('Avatar', fixtures.other);
      await avatarAsOther.transferFrom(fixtures.other, fixtures.dest, 123);
      expect(await fixtures.avatar.ownerOf(123)).to.be.equal(fixtures.dest);

      // MetaTX transfer
      await avatarAsMinter['mint(address,uint256)'](fixtures.other, 124);
      expect(await fixtures.avatar.ownerOf(124)).to.be.equal(fixtures.other);
      const avatarAsTrustedForwarder = await ethers.getContract(
        'Avatar',
        fixtures.trustedForwarder
      );
      const txData = await avatarAsTrustedForwarder.populateTransaction.transferFrom(
        fixtures.other,
        fixtures.dest,
        124
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await avatarAsTrustedForwarder.signer.sendTransaction(txData);
      expect(await fixtures.avatar.ownerOf(124)).to.be.equal(fixtures.dest);
    });
    describe('pauser role', function () {
      it('pauser role is set', async function () {
        const fixtures = await setupAvatarTest();
        await addPauser(fixtures.adminRole, fixtures.avatar, fixtures.pauser);
        const pauseRole = await fixtures.avatar.PAUSE_ROLE();
        expect(await fixtures.avatar.hasRole(pauseRole, fixtures.pauser)).to.be
          .true;
      });
      it('pauser can can pause', async function () {
        const fixtures = await setupAvatarTest();
        await addPauser(fixtures.adminRole, fixtures.avatar, fixtures.pauser);
        const avatarAsPauser = await ethers.getContract(
          'Avatar',
          fixtures.pauser
        );
        expect(await avatarAsPauser.paused()).to.be.false;
        await avatarAsPauser.pause();
        expect(await avatarAsPauser.paused()).to.be.true;
      });
      it('other should fail to set pause', async function () {
        const fixtures = await setupAvatarTest();
        await expect(fixtures.avatar.pause()).to.revertedWith(
          'must have pause role'
        );
      });
    });
  });
  describe('pause/unpause', function () {
    it('should fail to mint when paused', async function () {
      const fixtures = await setupAvatarTest();

      await addPauser(fixtures.adminRole, fixtures.avatar, fixtures.pauser);
      const avatarAsPauser = await ethers.getContract(
        'Avatar',
        fixtures.pauser
      );

      await addMinter(fixtures.adminRole, fixtures.avatar, fixtures.minter);
      const avatarAsMinter = await ethers.getContract(
        'Avatar',
        fixtures.minter
      );

      await avatarAsPauser.pause();

      // Regular mint
      await expect(
        avatarAsMinter['mint(address,uint256)'](fixtures.other, 123)
      ).to.revertedWith('paused');
    });
    it('should success to mint when paused/unpaused', async function () {
      const fixtures = await setupAvatarTest();

      await addPauser(fixtures.adminRole, fixtures.avatar, fixtures.pauser);
      const avatarAsPauser = await ethers.getContract(
        'Avatar',
        fixtures.pauser
      );

      await addMinter(fixtures.adminRole, fixtures.avatar, fixtures.minter);
      const avatarAsMinter = await ethers.getContract(
        'Avatar',
        fixtures.minter
      );

      await avatarAsPauser.pause();
      await avatarAsPauser.unpause();

      // Regular mint
      await avatarAsMinter['mint(address,uint256)'](fixtures.dest, 123);
      expect(await fixtures.avatar.ownerOf(123)).to.be.equal(fixtures.dest);
    });
  });
});
