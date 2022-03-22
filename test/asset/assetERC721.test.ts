import {ethers} from 'hardhat';
import {expect} from 'chai';
import {solidityPack, AbiCoder} from 'ethers/lib/utils';
import {setupAssetERC721Test} from './fixtures';

describe('AssetERC721.sol', function () {
  describe('initialization', function () {
    it('creation', async function () {
      const fixtures = await setupAssetERC721Test();
      expect(await fixtures.assetERC721.name()).to.be.equal(fixtures.name);
      expect(await fixtures.assetERC721.symbol()).to.be.equal(fixtures.symbol);
    });

    it('interfaces', async function () {
      const fixtures = await setupAssetERC721Test();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IERC721: '0x80ac58cd',
        IERC721Metadata: '0x5b5e139f',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.assetERC721.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAssetERC721Test();
        const defaultAdminRole = await fixtures.assetERC721.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.assetERC721.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
      it('admin can set the trusted forwarder', async function () {
        const fixtures = await setupAssetERC721Test();

        const assetERC721AsAdmin = await ethers.getContract(
          'AssetERC721',
          fixtures.adminRole
        );
        expect(await fixtures.assetERC721.getTrustedForwarder()).to.be.equal(
          fixtures.trustedForwarder
        );
        await assetERC721AsAdmin.setTrustedForwarder(fixtures.other);
        expect(await fixtures.assetERC721.getTrustedForwarder()).to.be.equal(
          fixtures.other
        );
      });
      it('other should fail to set the trusted forwarder', async function () {
        const fixtures = await setupAssetERC721Test();
        await expect(fixtures.assetERC721.setTrustedForwarder(fixtures.other))
          .to.be.reverted;
      });
    });
    describe('minter', function () {
      it('mint', async function () {
        const fixtures = await setupAssetERC721Test();
        const assetERC721AsMinter = await ethers.getContract(
          'AssetERC721',
          fixtures.minter
        );
        await expect(
          assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123)
        ).to.be.reverted;
        await expect(
          fixtures.assetERC721['mint(address,uint256)'](fixtures.other, 123)
        ).to.be.reverted;

        await fixtures.addMinter(
          fixtures.adminRole,
          fixtures.assetERC721,
          fixtures.minter
        );
        const minterRole = await fixtures.assetERC721.MINTER_ROLE();
        expect(await fixtures.assetERC721.hasRole(minterRole, fixtures.minter))
          .to.be.true;
        await expect(fixtures.assetERC721.ownerOf(123)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
        await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123);
        expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
          fixtures.other
        );
        expect(await fixtures.assetERC721.exists(123)).to.be.true;
        await expect(
          assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123)
        ).to.revertedWith('ERC721: token already minted');
      });
      it('mint with metadata', async function () {
        const fixtures = await setupAssetERC721Test();

        const abiCoder = new AbiCoder();
        const dummyMetadataHash = ethers.utils.keccak256('0x42');
        const metadata = abiCoder.encode(['bytes32'], [dummyMetadataHash]);

        // const metadata = ethers.utils.toUtf8Bytes('metadata');
        const assetERC721AsMinter = await ethers.getContract(
          'AssetERC721',
          fixtures.minter
        );
        await expect(
          assetERC721AsMinter['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.be.reverted;
        await expect(
          fixtures.assetERC721['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.be.reverted;

        await fixtures.addMinter(
          fixtures.adminRole,
          fixtures.assetERC721,
          fixtures.minter
        );
        const minterRole = await fixtures.assetERC721.MINTER_ROLE();
        expect(await fixtures.assetERC721.hasRole(minterRole, fixtures.minter))
          .to.be.true;
        await expect(fixtures.assetERC721.ownerOf(123)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
        await assetERC721AsMinter['mint(address,uint256,bytes)'](
          fixtures.other,
          123,
          metadata
        );
        expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
          fixtures.other
        );
        expect(await fixtures.assetERC721.exists(123)).to.be.true;
        await expect(
          assetERC721AsMinter['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.revertedWith('ERC721: token already minted');
      });
    });
    it('metaTX trusted forwarder', async function () {
      const fixtures = await setupAssetERC721Test();
      await fixtures.addMinter(
        fixtures.adminRole,
        fixtures.assetERC721,
        fixtures.minter
      );
      // Regular transfer
      const assetERC721AsMinter = await ethers.getContract(
        'AssetERC721',
        fixtures.minter
      );
      await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123);
      expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
        fixtures.other
      );
      const assetERC721AsOther = await ethers.getContract(
        'AssetERC721',
        fixtures.other
      );
      await assetERC721AsOther.transferFrom(fixtures.other, fixtures.dest, 123);
      expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
        fixtures.dest
      );

      // MetaTX transfer
      await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 124);
      expect(await fixtures.assetERC721.ownerOf(124)).to.be.equal(
        fixtures.other
      );
      const assetERC721AsTrustedForwarder = await ethers.getContract(
        'AssetERC721',
        fixtures.trustedForwarder
      );
      const txData = await assetERC721AsTrustedForwarder.populateTransaction.transferFrom(
        fixtures.other,
        fixtures.dest,
        124
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await assetERC721AsTrustedForwarder.signer.sendTransaction(txData);
      expect(await fixtures.assetERC721.ownerOf(124)).to.be.equal(
        fixtures.dest
      );
    });
  });
});
