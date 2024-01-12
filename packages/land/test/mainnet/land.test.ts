import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {getId} from '../fixtures';
import {ZeroAddress} from 'ethers';
import {setupLand, setupLandOperatorFilter} from './fixtures';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('LandV3', function () {
  describe('LandBaseTokenV2', function () {
    describe(`should NOT be able to transfer quad twice`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {landAsDeployer, deployer, landAdmin, mintQuad} =
              await loadFixture(setupLand);
            await mintQuad(deployer, outerSize, 0, 0);
            await landAsDeployer.transferQuad(
              deployer.address,
              landAdmin,
              innerSize,
              0,
              0,
              '0x',
            );
            await expect(
              landAsDeployer.transferQuad(
                deployer.address,
                landAdmin,
                innerSize,
                0,
                0,
                '0x',
              ),
            ).to.be.revertedWith(
              innerSize == 1
                ? 'not owner in _transferQuad'
                : 'not owner of all sub quads nor parent quads',
            );
          });
        });
      });
    });

    describe(`should return true for quad minted inside another quad`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {landAsDeployer, deployer, mintQuad} =
              await loadFixture(setupLand);
            // minting the quad of size1 *size1 at x size1 and y size1
            await mintQuad(deployer, outerSize, outerSize, outerSize);
            expect(
              await landAsDeployer.exists(outerSize, outerSize, outerSize),
            ).to.be.equal(true);
          });
        });
      });
    });

    describe(`should return false for quad not minted`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {landAsDeployer} = await loadFixture(setupLand);
          expect(
            await landAsDeployer.exists(quadSize, quadSize, quadSize),
          ).to.be.equal(false);
        });
      });
    });

    describe(`should return true for quad not minted`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {landAsDeployer, deployer, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, quadSize, quadSize, quadSize);
          expect(
            await landAsDeployer.exists(quadSize, quadSize, quadSize),
          ).to.be.equal(true);
        });
      });
    });

    describe(`should revert for invalid coordinates`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        if (quadSize == 1) return;
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {landAsDeployer} = await loadFixture(setupLand);
          await expect(
            landAsDeployer.exists(quadSize, quadSize + 1, quadSize + 1),
          ).to.be.revertedWith('Invalid x coordinate');
        });
      });
    });

    it(`should revert for invalid size`, async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      await expect(landAsDeployer.exists(5, 5, 5)).to.be.revertedWith(
        'Invalid size',
      );
    });

    describe(`should NOT be able to transfer burned quad twice `, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {landAsDeployer, deployer, landAdmin, mintQuad} =
              await loadFixture(setupLand);
            await mintQuad(deployer, outerSize, 0, 0);
            for (let x = 0; x < innerSize; x++) {
              for (let y = 0; y < innerSize; y++) {
                const tokenId = x + y * GRID_SIZE;
                await landAsDeployer.burn(tokenId);
              }
            }
            await expect(
              landAsDeployer.transferQuad(
                deployer,
                landAdmin,
                outerSize,
                0,
                0,
                '0x',
              ),
            ).to.be.revertedWith('not owner');
          });
        });
      });
    });

    it('Burnt land cannot be minted again', async function () {
      const {landAsDeployer, deployer, mintQuad} = await loadFixture(setupLand);
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;
      await mintQuad(deployer, 3, x, y);
      await landAsDeployer.burn(tokenId);
      await expect(mintQuad(deployer, 1, x, y)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should not be a minter by default', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      expect(await landAsDeployer.isMinter(deployer)).to.be.false;
    });

    it('should be an admin to set minter', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      await expect(landAsDeployer.setMinter(deployer, true)).to.be.revertedWith(
        'only admin allowed',
      );
      expect(await landAsDeployer.isMinter(deployer)).to.be.false;
    });

    it('should enable a minter', async function () {
      const {landAsAdmin, deployer} = await setupLand();
      await expect(
        landAsAdmin.setMinter(deployer, true),
      ).not.to.be.revertedWith('bla');
      expect(await landAsAdmin.isMinter(deployer)).to.be.true;
    });

    it('should disable a minter', async function () {
      const {landAsAdmin, deployer} = await setupLand();
      await expect(
        landAsAdmin.setMinter(deployer, true),
      ).not.to.be.revertedWith('bla');
      await expect(
        landAsAdmin.setMinter(deployer, false),
      ).not.to.be.revertedWith('bla');
      expect(await landAsAdmin.isMinter(deployer)).to.be.false;
    });

    it('should not accept address 0 as minter', async function () {
      const {landAsAdmin} = await setupLand();
      await expect(
        landAsAdmin.setMinter(ZeroAddress, false),
      ).to.be.revertedWith('address 0 is not allowed as minter');
      await expect(landAsAdmin.setMinter(ZeroAddress, true)).to.be.revertedWith(
        'address 0 is not allowed as minter',
      );
      expect(await landAsAdmin.isMinter(ZeroAddress)).to.be.false;
    });

    it('should only be able to disable an enabled minter', async function () {
      const {landAsAdmin, deployer} = await setupLand();
      await expect(
        landAsAdmin.setMinter(deployer, true),
      ).not.to.be.revertedWith('bla');
      expect(await landAsAdmin.isMinter(deployer)).to.be.true;
      await expect(landAsAdmin.setMinter(deployer, true)).to.be.revertedWith(
        'the status should be different than the current one',
      );
      await expect(
        landAsAdmin.setMinter(deployer, false),
      ).not.to.be.revertedWith('bla');
    });

    it('should only be able to enable a disabled minter', async function () {
      const {landAsAdmin, deployer} = await setupLand();
      expect(await landAsAdmin.isMinter(deployer)).to.be.false;
      await expect(landAsAdmin.setMinter(deployer, false)).to.be.revertedWith(
        'the status should be different than the current one',
      );
      await expect(
        landAsAdmin.setMinter(deployer, true),
      ).not.to.be.revertedWith('bla');
    });

    it('should return the grid height', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const height = await landAsDeployer.height();
      expect(height).to.be.equal(408);
    });

    it('should return the grid width', async function () {
      const {landAsDeployer} = await setupLand();
      const width = await landAsDeployer.width();
      expect(width).to.be.equal(408);
    });

    it('should return quad coordinates', async function () {
      const {landAsDeployer, deployer, mintQuad} = await loadFixture(setupLand);

      const id = getId(4, 0, 0);
      await mintQuad(deployer, 12, 0, 0);
      const x = await landAsDeployer.getX(id);
      expect(x).to.be.equal(0);
      const y = await landAsDeployer.getY(id);
      expect(y).to.be.equal(0);
    });

    it('should revert when to address is zero', async function () {
      const {mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(ZeroAddress, 3, 0, 0)).to.be.revertedWith(
        'to is zero address',
      );
    });

    it('should revert when size wrong', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 9, 0, 0)).to.be.revertedWith(
        'Invalid size',
      );
    });

    it('should revert when to x coordinates are wrong', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 3, 5, 5)).to.be.revertedWith(
        'Invalid x coordinate',
      );
    });

    it('should revert when to y coordinates are wrong', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 3, 0, 5)).to.be.revertedWith(
        'Invalid y coordinate',
      );
    });

    it('should revert when x quad is out of bounds (mintQuad)', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 3, 441, 0)).to.be.revertedWith(
        'x out of bounds',
      );
    });

    it('should revert when y quad is out of bounds (mintQuad)', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 3, 0, 441)).to.be.revertedWith(
        'y out of bounds',
      );
    });

    it('should revert when to signer is not minter', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      await expect(
        landAsDeployer.mintQuad(deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when parent quad is already minted', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 24, 0, 0);
      await expect(mintQuad(deployer, 3, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when minted with zero size', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await expect(mintQuad(deployer, 0, 0, 0)).to.be.revertedWith(
        'size cannot be zero',
      );
    });

    it('should revert when child quad is already minted', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 3, 0, 0);
      await expect(mintQuad(deployer, 6, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when  1x1 Land token is already minted', async function () {
      const {mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 1, 0, 0);
      await expect(mintQuad(deployer, 6, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when from is zero address', async function () {
      const {landAsDeployer, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          ZeroAddress,
          landAdmin,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when sizes, x, y are not of same length', async function () {
      const {landAsDeployer, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith(
        "LandBaseTokenV3: sizes's and x's length are different",
      );
    });

    it('should revert when x, y are not of same length', async function () {
      const {landAsDeployer, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          landAdmin,
          [6, 6],
          [0, 6],
          [6],
          '0x',
        ),
      ).to.be.revertedWith("LandBaseTokenV3: x's and y's length are different");
    });

    it('should revert when size, x are not of same length', async function () {
      const {landAsDeployer, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith(
        "LandBaseTokenV3: sizes's and x's length are different",
      );
    });

    it('should revert when to is a contract and not a ERC721 receiver', async function () {
      const {landAsDeployer, testERC721TokenReceiver, mintQuad, deployer} =
        await loadFixture(setupLand);
      await testERC721TokenReceiver.returnWrongBytes();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          testERC721TokenReceiver,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('should revert when to is zero address', async function () {
      const {landAsDeployer, mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          ZeroAddress,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when size array and coordinates array are of different length', async function () {
      const {landAsDeployer, mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          ZeroAddress,
          [6, 3],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when signer is not approved', async function () {
      const {landAsAdmin, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsAdmin.batchTransferQuad(deployer, landAdmin, [6], [0], [0], '0x'),
      ).to.be.revertedWith('not authorized to transferMultiQuads');
    });

    it('should revert if signer is not approved', async function () {
      const {landAsAdmin, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsAdmin.transferQuad(deployer, landAdmin, 6, 0, 0, '0x'),
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert for invalid coordinates', async function () {
      const {landAsDeployer, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.transferQuad(deployer, landAdmin, 6, 1, 1, '0x'),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert for owner of by invalid x coordinate', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const id = getId(3, 3, 0);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert for owner of by invalid y coordinate', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const id = getId(3, 0, 3);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when x coordinate is out of bounds (transferQuad)', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.transferQuad(deployer, landAdmin, 3, 441, 0, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when transfer quad when y is out of bounds (transferQuad)', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.transferQuad(deployer, landAdmin, 3, 0, 441, '0x'),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert for invalid size', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        landAsDeployer.transferQuad(deployer, landAdmin, 9, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is ZeroAddress', async function () {
      const {landAsAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.mintAndTransferQuad(ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when y is out of bound', async function () {
      const {landAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsMinter.mintAndTransferQuad(landAdmin, 3, 0, 441, '0x'),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert when x is out of bound', async function () {
      const {landAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsMinter.mintAndTransferQuad(landAdmin, 3, 441, 0, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {landAsMinter, testERC721TokenReceiver, minter, mintQuad} =
        await loadFixture(setupLand);
      await testERC721TokenReceiver.returnWrongBytes();
      await mintQuad(minter, 3, 0, 0);
      await expect(
        landAsMinter.mintAndTransferQuad(
          testERC721TokenReceiver,
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {landAsMinter, testERC721TokenReceiver, minter, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(minter, 3, 0, 0);
      await landAsMinter.mintAndTransferQuad(
        testERC721TokenReceiver,
        6,
        0,
        0,
        '0x',
      );
      expect(await landAsMinter.balanceOf(testERC721TokenReceiver)).to.be.equal(
        36,
      );
    });

    it('should revert when to is ZeroAddress (transferQuad)', async function () {
      const {landAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landAsAdmin.transferQuad(landAdmin, ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should clear operator for Land when parent Quad is mintAndTransfer', async function () {
      const {
        landAsDeployer,
        landAsMinter,
        deployer,
        minter,
        mintQuad,
        other: landSaleFeeRecipient,
      } = await loadFixture(setupLand);
      await mintQuad(minter, 1, 0, 0);
      const id = getId(1, 0, 0);
      await landAsMinter.approve(deployer, id);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(minter);
      expect(await landAsDeployer.getApproved(id)).to.be.equal(deployer);
      await landAsMinter.mintAndTransferQuad(
        landSaleFeeRecipient,
        3,
        0,
        0,
        '0x',
      );
      expect(await landAsDeployer.getApproved(id)).to.be.equal(ZeroAddress);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(
        landSaleFeeRecipient,
      );
    });

    it('should revert when from is ZeroAddress (transferQuad)', async function () {
      const {landAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landAsAdmin.transferQuad(ZeroAddress, landAdmin, 3, 0, 0, '0x'),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when operator is not approved (transferQuad)', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        landAsDeployer.transferQuad(landAdmin, deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert ownerOf invalid tokenId', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const id = getId(3, 0, 1);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when from is not owner of land (transferQuad)', async function () {
      const {landAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.transferQuad(landAdmin, deployer, 1, 0, 0, '0x'),
      ).to.be.revertedWith('token does not exist');
    });

    it('should revert when transfer Quad of zero size', async function () {
      const {landAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.transferQuad(landAdmin, deployer, 0, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when from is not owner of Quad (transferQuad)', async function () {
      const {landAsAdmin, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 3, 0, 0);
      await expect(
        landAsAdmin.transferQuad(landAdmin, deployer, 6, 0, 0, '0x'),
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should not revert when from is owner of all subQuads of Quad (transferQuad)', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 3, 0, 0);
      await mintQuad(deployer, 3, 0, 3);
      await mintQuad(deployer, 3, 3, 0);
      await mintQuad(deployer, 3, 3, 3);
      await landAsDeployer.transferQuad(deployer, landAdmin, 6, 0, 0, '0x');
      expect(await landAsDeployer.balanceOf(landAdmin)).to.be.equal(36);
    });

    it('should revert when size is invalid (transferQuad)', async function () {
      const {landAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.transferQuad(landAdmin, deployer, 4, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should return the name of the token contract', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      expect(await landAsDeployer.name()).to.be.equal("Sandbox's LANDs");
    });

    it('should return the symbol of the token contract', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      expect(await landAsDeployer.symbol()).to.be.equal('LAND');
    });

    it('should return correct tokenUri for quad', async function () {
      const {landAsDeployer, deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer, 1, 1, 1);
      const id = getId(1, 1, 1);
      expect(await landAsDeployer.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/409/metadata.json',
      );
    });

    it('should revert when id is not minted', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const id = getId(1, 2, 2);
      await expect(landAsDeployer.tokenURI(id)).to.be.revertedWith(
        'LandV3: Id does not exist',
      );
    });

    it('should return tokenUri for tokenId zero', async function () {
      const {landAsDeployer, deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer, 1, 0, 0);
      const id = getId(1, 0, 0);
      expect(await landAsDeployer.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/0/metadata.json',
      );
    });

    it('it should revert approveFor for unauthorized sender', async function () {
      const {landAsOther, other, deployer, other1, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(deployer, other1, id),
      ).to.be.revertedWith('not authorized to approve');
    });

    it('it should revert for setApprovalForAllFor of zero address', async function () {
      const {landAsOther, other1} = await loadFixture(setupLand);
      await expect(
        landAsOther.setApprovalForAllFor(ZeroAddress, other1, true),
      ).to.be.revertedWith('Invalid sender address');
    });

    it('should revert approveFor of operator is ZeroAddress', async function () {
      const {landAsOther, other1, other, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(ZeroAddress, other1, id),
      ).to.be.revertedWith('sender is zero address');
    });

    it('it should revert setApprovalForAllFor for unauthorized sender', async function () {
      const {landAsOther, other1, deployer} = await loadFixture(setupLand);
      await expect(
        landAsOther.setApprovalForAllFor(deployer, other1, true),
      ).to.be.revertedWith('not authorized to approve for all');
    });

    it('it should revert Approval for invalid token', async function () {
      const {landAsOther, other, deployer, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 2, 2);
      await expect(landAsOther.approve(deployer, id)).to.be.revertedWith(
        'token does not exist',
      );
    });

    it('should revert approveFor for unauthorized sender', async function () {
      const {landAsOther, other, deployer, other1, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(deployer, other1, id),
      ).to.be.revertedWith('not authorized to approve');
    });

    it('should revert for transfer when to is ZeroAddress(mintAndTransferQuad)', async function () {
      const {landAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 6, 0, 0);
      await expect(
        landAsAdmin.mintAndTransferQuad(ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when signer is not a minter', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      await expect(
        landAsDeployer.mintAndTransferQuad(deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when coordinates are wrong', async function () {
      const {landAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        landAsMinter.mintAndTransferQuad(deployer, 3, 5, 5, '0x'),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert when x coordinate is out of bounds (mintAndTransferQuad)', async function () {
      const {landAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        landAsMinter.mintAndTransferQuad(deployer, 3, 441, 441, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });
  });

  describe(`should mint quads`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`quadSize ${quadSize}x${quadSize}`, async function () {
        const {landAsDeployer, deployer, mintQuad} =
          await loadFixture(setupLand);
        await mintQuad(deployer, quadSize, quadSize, quadSize);
        expect(
          await landAsDeployer.exists(quadSize, quadSize, quadSize),
        ).to.be.equal(true);
      });
    });
  });

  describe(`should NOT be able to mint child quad if parent quad is already minted`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((outerSize) => {
      sizes.forEach((innerSize) => {
        if (innerSize <= outerSize) return;
        it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
          const {deployer, mintQuad} = await loadFixture(setupLand);
          await mintQuad(deployer, outerSize, 0, 0);
          await expect(mintQuad(deployer, innerSize, 0, 0)).to.be.revertedWith(
            'Already minted',
          );
        });
      });
    });
  });

  describe(`should NOT be able to mint parent quad if child quad is already minted`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((outerSize) => {
      sizes.forEach((innerSize) => {
        if (innerSize <= outerSize) return;
        it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
          const {deployer, mintQuad} = await loadFixture(setupLand);
          await mintQuad(deployer, innerSize, 0, 0);
          await expect(mintQuad(deployer, outerSize, 0, 0)).to.be.revertedWith(
            'Already minted',
          );
        });
      });
    });
  });

  it('should return correct ownerOf 1*1 quad minted', async function () {
    const {landAsDeployer, deployer, mintQuad} = await loadFixture(setupLand);
    await mintQuad(deployer, 1, 1, 1);
    expect(await landAsDeployer.ownerOf(getId(1, 1, 1))).to.be.equal(deployer);
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {landAsDeployer} = await loadFixture(setupLand);
    await expect(landAsDeployer.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id',
    );
  });

  describe(`should NOT be able to mint and transfer quad if signer is not the owner of child quad`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((outerSize) => {
      sizes.forEach((innerSize) => {
        if (innerSize >= outerSize) return;
        it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
          const {landAsMinter, deployer, minter, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, innerSize, 0, 0);
          await expect(
            landAsMinter.mintAndTransferQuad(minter, outerSize, 0, 0, '0x'),
          ).to.be.revertedWith('Already minted');
        });
      });
    });
  });

  describe(`should NOT be able to transfer quad if signer is not the owner of parent`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((outerSize) => {
      sizes.forEach((innerSize) => {
        if (innerSize <= outerSize) return;
        it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
          const {landAsMinter, deployer, landAdmin, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, innerSize, 0, 0);
          await expect(
            landAsMinter.mintAndTransferQuad(landAdmin, outerSize, 0, 0, '0x'),
          ).to.be.revertedWith(
            outerSize == 1
              ? 'not owner in _transferQuad'
              : 'not owner of all sub quads nor parent quads',
          );
        });
      });
    });
  });

  describe('MetaTransactionReceiverV2', function () {
    it('should not be a meta transaction processor', async function () {
      const {landAsDeployer, metaTransactionContract} =
        await loadFixture(setupLand);
      expect(
        await landAsDeployer.isMetaTransactionProcessor(
          metaTransactionContract,
        ),
      ).to.be.false;
    });

    it('should enable a meta transaction processor', async function () {
      const {landAsAdmin, metaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, true),
      ).not.to.be.revertedWith('bla');
      expect(
        await landAsAdmin.isMetaTransactionProcessor(metaTransactionContract),
      ).to.be.true;
    });

    it('should disable a meta transaction processor', async function () {
      const {landAsAdmin, metaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, false),
      ).not.to.be.revertedWith('bla');
      expect(
        await landAsAdmin.isMetaTransactionProcessor(metaTransactionContract),
      ).to.be.false;
    });

    it('should only be a contract as meta transaction processor', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(landAdmin.address, true),
      ).to.be.revertedWith('only contracts can be meta transaction processor');
    });

    it('should only be the admin able to set a meta transaction processor', async function () {
      const {landAsDeployer, landAsAdmin, metaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        landAsDeployer.setMetaTransactionProcessor(
          metaTransactionContract,
          true,
        ),
      ).to.be.revertedWith('only admin allowed');
      await expect(
        landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, true),
      ).not.to.be.revertedWith('bla');
    });
  });

  describe('AdminV2', function () {
    it('should get the current admin', async function () {
      const {landAsDeployer, landAdmin} = await loadFixture(setupLand);
      expect(await landAsDeployer.getAdmin()).to.be.equal(landAdmin);
    });

    it('should change the admin to a new address', async function () {
      const {landAsAdmin, deployer} = await loadFixture(setupLand);
      await expect(landAsAdmin.changeAdmin(deployer)).not.to.be.revertedWith(
        'bla',
      );
      expect(await landAsAdmin.getAdmin()).to.be.equal(deployer);
    });

    it('should only be changed to a new admin', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.changeAdmin(landAdmin.address),
      ).to.be.revertedWith('it can be only changed to a new admin');
    });
  });

  describe('SuperOperatorsV2', function () {
    it('should not be a super operator by default', async function () {
      const {landAsDeployer, landAdmin} = await loadFixture(setupLand);
      expect(await landAsDeployer.isSuperOperator(landAdmin)).to.be.false;
    });

    it('should be an admin to set super operator', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      await expect(
        landAsDeployer.setSuperOperator(deployer, true),
      ).to.be.revertedWith('only admin allowed');
      expect(await landAsDeployer.isSuperOperator(deployer)).to.be.false;
    });

    it('should enable a super operator', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(landAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      expect(await landAsAdmin.isSuperOperator(landAdmin.address)).to.be.true;
    });

    it('should disable a super operator', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(landAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      await expect(
        landAsAdmin.setSuperOperator(landAdmin.address, false),
      ).not.to.be.revertedWith('bla');
      expect(await landAsAdmin.isSuperOperator(landAdmin.address)).to.be.false;
    });

    it('should not accept address 0 as super operator', async function () {
      const {landAsAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.setSuperOperator(ZeroAddress, false),
      ).to.be.revertedWith('address 0 is not allowed as super operator');
      await expect(
        landAsAdmin.setSuperOperator(ZeroAddress, true),
      ).to.be.revertedWith('address 0 is not allowed as super operator');
      expect(await landAsAdmin.isSuperOperator(ZeroAddress)).to.be.false;
    });

    it('should only be able to disable an enabled super operator', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(landAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      expect(await landAsAdmin.isSuperOperator(landAdmin.address)).to.be.true;
      await expect(
        landAsAdmin.setSuperOperator(landAdmin.address, true),
      ).to.be.revertedWith(
        'the status should be different than the current one',
      );
      await expect(
        landAsAdmin.setSuperOperator(landAdmin.address, false),
      ).not.to.be.revertedWith('bla');
    });

    it('should only be able to enable a disabled super operator', async function () {
      const {landAsAdmin, landAdmin} = await loadFixture(setupLand);
      expect(await landAsAdmin.isSuperOperator(landAdmin.address)).to.be.false;
      await expect(
        landAsAdmin.setSuperOperator(landAdmin.address, false),
      ).to.be.revertedWith(
        'the status should be different than the current one',
      );
      await expect(landAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
    });
  });

  describe('OperatorFilterer', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, landAsOther} = await loadFixture(
        setupLandOperatorFilter,
      );
      expect(
        await operatorFilterRegistry.isRegistered(landAsOther),
      ).to.be.equal(true);
    });

    it('would not register on the operator filter registry if not set on the Land', async function () {
      const {operatorFilterRegistry, landRegistryNotSetAsAdmin} =
        await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.registerFilterer(ZeroAddress, false);
      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsAdmin),
      ).to.be.equal(false);
    });

    it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        landRegistryNotSetAsAdmin,
      } = await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsAdmin.registerFilterer(ZeroAddress, false);
      await landRegistryNotSetAsAdmin.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(landRegistryNotSetAsAdmin),
      ).to.be.equal(ZeroAddress);
    });

    it('should be registered through OperatorFiltererUpgradeable', async function () {
      const {operatorFilterRegistry, landRegistryNotSetAsAdmin} =
        await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsAdmin.registerFilterer(ZeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsAdmin),
      ).to.be.equal(true);
    });

    it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        landRegistryNotSetAsAdmin,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsAdmin.registerFilterer(
        operatorFilterSubscription.address,
        false,
      );

      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsAdmin),
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(landRegistryNotSetAsAdmin),
      ).to.be.equal(ZeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          landRegistryNotSetAsAdmin,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
      const {
        landRegistryNotSetAsAdmin,
        landRegistryNotSetAsOther,
        operatorFilterSubscription,
        mockMarketPlace1,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.mintQuadWithOutMinterCheck(
        other,
        1,
        0,
        0,
        '0x',
      );
      await landRegistryNotSetAsAdmin.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      await landRegistryNotSetAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(
        await landRegistryNotSetAsAdmin.isApprovedForAll(
          other,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
      const {
        landRegistryNotSetAsAdmin,
        landRegistryNotSetAsOther,
        operatorFilterSubscription,
        mockMarketPlace1,
        other,
        other1,
      } = await loadFixture(setupLandOperatorFilter);
      await landRegistryNotSetAsAdmin.mintQuadWithOutMinterCheck(
        other,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 0, 0);
      await landRegistryNotSetAsAdmin.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      await landRegistryNotSetAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(
        await landRegistryNotSetAsAdmin.isApprovedForAll(
          other,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        landRegistryNotSetAsAdmin,
        other,
        other1,
        id,
      );

      expect(await landRegistryNotSetAsAdmin.ownerOf(id)).to.be.equal(
        other1.address,
      );
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {operatorFilterRegistry, operatorFilterSubscription, landAsOther} =
        await loadFixture(setupLandOperatorFilter);
      expect(
        await operatorFilterRegistry.subscriptionOf(landAsOther),
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be able to transfer land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await landAsOther.transferFrom(other, other1, id);
      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('should be able to safe transfer land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther['safeTransferFrom(address,address,uint256)'](
        other,
        other1,
        Number(id),
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther['safeTransferFrom(address,address,uint256,bytes)'](
        other,
        other1,
        id,
        '0x',
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.safeBatchTransferFrom(other, other1, [id1, id2], '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(2);
    });
    it('should be able to batch transfer Land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.batchTransferFrom(other, other1, [id1, id2], '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(2);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.transferFrom(other, mockMarketPlace1, id);

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(1);
    });

    it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther['safeTransferFrom(address,address,uint256)'](
        other,
        mockMarketPlace1,
        id,
      );

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther['safeTransferFrom(address,address,uint256,bytes)'](
        other,
        mockMarketPlace1,
        id,
        '0x',
      );

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.safeBatchTransferFrom(
        other,
        mockMarketPlace1,
        [id1, id2],
        '0x',
      );

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(2);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.batchTransferFrom(
        other,
        mockMarketPlace1,
        [id1, id2],
        '0x',
      );

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(2);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther} = await loadFixture(
        setupLandOperatorFilter,
      );
      await expect(landAsOther.approve(mockMarketPlace1, 1)).to.be.revertedWith(
        'Address is filtered',
      );
    });

    it('it should not approveFor blacklisted market places', async function () {
      const {mockMarketPlace1, other, landAsOther} = await loadFixture(
        setupLandOperatorFilter,
      );
      await expect(
        landAsOther.approveFor(other, mockMarketPlace1, 1),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther} = await loadFixture(
        setupLandOperatorFilter,
      );
      await expect(
        landAsOther.setApprovalForAll(mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not setApprovalForAllFor blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await expect(
        landAsOther.setApprovalForAllFor(other, mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should approve non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.approve(mockMarketPlace3, id);
      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace3);
    });

    it('it should approveFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id);
      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace3);
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.setApprovalForAll(mockMarketPlace3, true);
      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);
    });

    it('it should setApprovalForAllFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);
      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approve(mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approve(mockMarketPlace3, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace3, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.setApprovalForAll(mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAll(mockMarketPlace3, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
        other1,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAllFor(other1, mockMarketPlace3, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approve(mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approve(mockMarketPlace3, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace3, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.setApprovalForAll(mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAll(mockMarketPlace3, true),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
        other1,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAllFor(other1, mockMarketPlace3, true),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        landAsOther.approve(mockMarketPlace1, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );

      await landAsOther.approve(mockMarketPlace1, id);

      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace1);
    });

    it('it should be able to approveFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace1, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );

      await landAsOther.approveFor(other, mockMarketPlace1, id);

      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace1);
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await expect(
        landAsOther.setApprovalForAll(mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );

      await landAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace1),
      ).to.be.equal(true);
    });

    it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await expect(
        landAsOther.setApprovalForAllFor(other, mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );

      await landAsOther.setApprovalForAllFor(other, mockMarketPlace1, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace1),
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace1, true);
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landAsOther,
          other,
          other1,
          id,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landAsOther,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id1, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landAsOther,
          other,
          other1,
          id2,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        landAsOther,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id1, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);
      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landAsOther,
          other,
          other1,
          id2,
          '0x',
        ),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landAsOther,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace1, true);

      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landAsOther,
          other,
          other1,
          id,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );
      await mockMarketPlace1[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('it should not be able to transfer(without data) through blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace1, true);
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landAsOther,
          other,
          other1,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer(without data) through non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other, other1} = await loadFixture(
        setupLandOperatorFilter,
      );
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landAsOther,
        other,
        other1,
        id,
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('it should be not be able to transfer(without data) through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landAsOther,
        landAsOther1,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landAsOther,
        other,
        other1,
        id,
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3,
        true,
      );

      await landAsOther1.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landAsOther,
          other1,
          other,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to transfer(without data) through market places after their codeHash is blackListed', async function () {
      const {
        mockMarketPlace3,
        landAsOther,
        landAsOther1,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landAsOther,
        other,
        other1,
        id,
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await landAsOther1.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landAsOther,
          other1,
          other,
          id,
        ),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer(without data) through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landAsOther,
        other,
        other1,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);
      await landAsOther.mintQuadWithOutMinterCheck(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace1, true);
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landAsOther,
          other,
          other1,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1,
        false,
      );

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        landAsOther,
        other,
        other1,
        id,
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });
  });
});
