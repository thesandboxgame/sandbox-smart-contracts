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

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('Land.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForRoyalty(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForAdmin(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForSuperOperators(setupLand, 'Land');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForOperatorFilter(setupLandOperatorFilter, 'Land');

  describe('LandBaseToken', function () {
    describe(`should NOT be able to transfer quad twice`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {LandContract, deployer, landAdmin, mintQuad} =
              await loadFixture(setupLand);
            await mintQuad(deployer, outerSize, 0, 0);
            await LandContract.transferQuad(
              deployer.address,
              landAdmin,
              innerSize,
              0,
              0,
              '0x',
            );
            await expect(
              LandContract.transferQuad(
                deployer.address,
                landAdmin,
                innerSize,
                0,
                0,
                '0x',
              ),
            ).to.be.revertedWith('not owner');
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
            const {LandContract, deployer, mintQuad} =
              await loadFixture(setupLand);
            // minting the quad of size1 *size1 at x size1 and y size1
            await mintQuad(deployer, outerSize, outerSize, outerSize);
            expect(
              await LandContract.exists(outerSize, outerSize, outerSize),
            ).to.be.equal(true);
          });
        });
      });
    });

    describe(`should return false for quad not minted`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {LandContract} = await loadFixture(setupLand);
          expect(
            await LandContract.exists(quadSize, quadSize, quadSize),
          ).to.be.equal(false);
        });
      });
    });

    describe(`should return true for quad not minted`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {LandContract, deployer, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, quadSize, quadSize, quadSize);
          expect(
            await LandContract.exists(quadSize, quadSize, quadSize),
          ).to.be.equal(true);
        });
      });
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

    it(`should revert for invalid size`, async function () {
      const {LandContract} = await loadFixture(setupLand);
      await expect(LandContract.exists(5, 5, 5)).to.be.revertedWith(
        'Invalid size',
      );
    });

    describe(`should NOT be able to transfer burned quad twice `, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {LandContract, deployer, landAdmin, mintQuad} =
              await loadFixture(setupLand);
            await mintQuad(deployer, outerSize, 0, 0);
            for (let x = 0; x < innerSize; x++) {
              for (let y = 0; y < innerSize; y++) {
                const tokenId = x + y * GRID_SIZE;
                await LandContract.burn(tokenId);
              }
            }
            await expect(
              LandContract.transferQuad(
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
      const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;
      await mintQuad(deployer, 3, x, y);
      await LandContract.burn(tokenId);
      await expect(mintQuad(deployer, 1, x, y)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should not be a landMinter by default', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);
      expect(await LandContract.isMinter(deployer)).to.be.false;
    });

    it('should be an admin to set landMinter', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);
      await expect(LandContract.setMinter(deployer, true)).to.be.revertedWith(
        'only admin allowed',
      );
      expect(await LandContract.isMinter(deployer)).to.be.false;
    });

    it('should enable a landMinter', async function () {
      const {LandAsAdmin, deployer} = await setupLand();
      await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
      expect(await LandAsAdmin.isMinter(deployer)).to.be.true;
    });

    it('should disable a landMinter', async function () {
      const {LandAsAdmin, deployer} = await setupLand();
      await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
      await expect(LandAsAdmin.setMinter(deployer, false)).not.to.be.reverted;
      expect(await LandAsAdmin.isMinter(deployer)).to.be.false;
    });

    it('should not accept address 0 as landMinter', async function () {
      const {LandAsAdmin} = await setupLand();
      await expect(
        LandAsAdmin.setMinter(ZeroAddress, false),
      ).to.be.revertedWith('address 0 is not allowed');
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

    it('should return the grid height', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const height = await LandContract.height();
      expect(height).to.be.equal(408);
    });

    it('should return the grid width', async function () {
      const {LandContract} = await setupLand();
      const width = await LandContract.width();
      expect(width).to.be.equal(408);
    });

    it('should return quad coordinates', async function () {
      const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);

      const id = getId(4, 0, 0);
      await mintQuad(deployer, 12, 0, 0);
      const x = await LandContract.getX(id);
      expect(x).to.be.equal(0);
      const y = await LandContract.getY(id);
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

    it('should revert when to signer is not landMinter', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);
      await expect(
        LandContract.mintQuad(deployer, 3, 0, 0, '0x'),
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
      const {LandContract, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
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

    it('should revert when sizes, x, y are not of same length', async function () {
      const {LandContract, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith("sizes's and x's are different");
    });

    it('should revert when x, y are not of same length', async function () {
      const {LandContract, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6, 6],
          [0, 6],
          [6],
          '0x',
        ),
      ).to.be.revertedWith("x's and y's are different");
    });

    it('should revert when size, x are not of same length', async function () {
      const {LandContract, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith("sizes's and x's are different");
    });

    it('should revert when to is a contract and not a ERC721 receiver', async function () {
      const {LandContract, TestERC721TokenReceiver, mintQuad, deployer} =
        await loadFixture(setupLand);
      await TestERC721TokenReceiver.returnWrongBytes();
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          TestERC721TokenReceiver,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith('erc721 batchTransfer rejected');
    });

    it('should revert when to is zero address', async function () {
      const {LandContract, mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
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
      const {LandContract, mintQuad, deployer} = await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.batchTransferQuad(
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
      const {LandAsAdmin, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandAsAdmin.batchTransferQuad(deployer, landAdmin, [6], [0], [0], '0x'),
      ).to.be.revertedWith('not authorized');
    });

    it('should revert if signer is not approved', async function () {
      const {LandAsAdmin, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandAsAdmin.transferQuad(deployer, landAdmin, 6, 0, 0, '0x'),
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert for invalid coordinates', async function () {
      const {LandContract, mintQuad, deployer, landAdmin} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 6, 1, 1, '0x'),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert for owner of by invalid x coordinate', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(3, 3, 0);
      await expect(LandContract.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert for owner of by invalid y coordinate', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(3, 0, 3);
      await expect(LandContract.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when x coordinate is out of bounds (transferQuad)', async function () {
      const {LandContract, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 3, 441, 0, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when transfer quad when y is out of bounds (transferQuad)', async function () {
      const {LandContract, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 3, 0, 441, '0x'),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert for invalid size', async function () {
      const {LandContract, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 6, 0, 0);
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 9, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is ZeroAddress', async function () {
      const {LandAsAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.mintAndTransferQuad(ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when y is out of bound', async function () {
      const {LandAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintAndTransferQuad(landAdmin, 3, 0, 441, '0x'),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert when x is out of bound', async function () {
      const {LandAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintAndTransferQuad(landAdmin, 3, 441, 0, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {LandAsMinter, TestERC721TokenReceiver, landMinter, mintQuad} =
        await loadFixture(setupLand);
      await TestERC721TokenReceiver.returnWrongBytes();
      await mintQuad(landMinter, 3, 0, 0);
      await expect(
        LandAsMinter.mintAndTransferQuad(
          TestERC721TokenReceiver,
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('erc721 batchTransfer rejected');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {LandAsMinter, TestERC721TokenReceiver, landMinter, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(landMinter, 3, 0, 0);
      await LandAsMinter.mintAndTransferQuad(
        TestERC721TokenReceiver,
        6,
        0,
        0,
        '0x',
      );
      expect(await LandAsMinter.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        36,
      );
    });

    it('should revert when to is ZeroAddress (transferQuad)', async function () {
      const {LandAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        LandAsAdmin.transferQuad(landAdmin, ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should clear operator for Land when parent Quad is mintAndTransfer', async function () {
      const {
        LandContract,
        LandAsMinter,
        deployer,
        landMinter,
        mintQuad,
        other: landSaleFeeRecipient,
      } = await loadFixture(setupLand);
      await mintQuad(landMinter, 1, 0, 0);
      const id = getId(1, 0, 0);
      await LandAsMinter.approve(deployer, id);
      expect(await LandContract.ownerOf(id)).to.be.equal(landMinter);
      expect(await LandContract.getApproved(id)).to.be.equal(deployer);
      await LandAsMinter.mintAndTransferQuad(
        landSaleFeeRecipient,
        3,
        0,
        0,
        '0x',
      );
      expect(await LandContract.getApproved(id)).to.be.equal(ZeroAddress);
      expect(await LandContract.ownerOf(id)).to.be.equal(landSaleFeeRecipient);
    });

    it('should revert when from is ZeroAddress (transferQuad)', async function () {
      const {LandAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        LandAsAdmin.transferQuad(ZeroAddress, landAdmin, 3, 0, 0, '0x'),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when operator is not approved (transferQuad)', async function () {
      const {LandContract, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(landAdmin, 3, 0, 0);
      await expect(
        LandContract.transferQuad(landAdmin, deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert ownerOf invalid tokenId', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(3, 0, 1);
      await expect(LandContract.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when from is not owner of land (transferQuad)', async function () {
      const {LandAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.transferQuad(landAdmin, deployer, 1, 0, 0, '0x'),
      ).to.be.revertedWith('token does not exist');
    });

    it('should revert when transfer Quad of zero size', async function () {
      const {LandAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.transferQuad(landAdmin, deployer, 0, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when from is not owner of Quad (transferQuad)', async function () {
      const {LandAsAdmin, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 3, 0, 0);
      await expect(
        LandAsAdmin.transferQuad(landAdmin, deployer, 6, 0, 0, '0x'),
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should not revert when from is owner of all subQuads of Quad (transferQuad)', async function () {
      const {LandContract, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer, 3, 0, 0);
      await mintQuad(deployer, 3, 0, 3);
      await mintQuad(deployer, 3, 3, 0);
      await mintQuad(deployer, 3, 3, 3);
      await LandContract.transferQuad(deployer, landAdmin, 6, 0, 0, '0x');
      expect(await LandContract.balanceOf(landAdmin)).to.be.equal(36);
    });

    it('should revert when size is invalid (transferQuad)', async function () {
      const {LandAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.transferQuad(landAdmin, deployer, 4, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should return the name of the token contract', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.name()).to.be.equal("Sandbox's LANDs");
    });

    it('should return the symbol of the token contract', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.symbol()).to.be.equal('LAND');
    });

    it('should return correct tokenUri for quad', async function () {
      const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer, 1, 1, 1);
      const id = getId(1, 1, 1);
      expect(await LandContract.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/409/metadata.json',
      );
    });

    it('should revert when id is not minted', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(1, 2, 2);
      await expect(LandContract.tokenURI(id)).to.be.revertedWith(
        'Land: Id does not exist',
      );
    });

    it('should return tokenUri for tokenId zero', async function () {
      const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer, 1, 0, 0);
      const id = getId(1, 0, 0);
      expect(await LandContract.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/0/metadata.json',
      );
    });

    it('it should revert approveFor for unauthorized sender', async function () {
      const {LandAsOther, other, deployer, other1, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
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
      const {LandAsOther, other1, other, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
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
      const {LandAsOther, other, deployer, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 2, 2);
      await expect(LandAsOther.approve(deployer, id)).to.be.revertedWith(
        'token does not exist',
      );
    });

    it('should revert approveFor for unauthorized sender', async function () {
      const {LandAsOther, other, deployer, other1, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(other, 1, 0, 0);
      const id = getId(1, 0, 0);
      await expect(
        LandAsOther.approveFor(deployer, other1, id),
      ).to.be.revertedWith('not authorized to approve');
    });

    it('should revert for transfer when to is ZeroAddress(mintAndTransferQuad)', async function () {
      const {LandAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin, 6, 0, 0);
      await expect(
        LandAsAdmin.mintAndTransferQuad(ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when signer is not a landMinter', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);
      await expect(
        LandContract.mintAndTransferQuad(deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when coordinates are wrong', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintAndTransferQuad(deployer, 3, 5, 5, '0x'),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert when x coordinate is out of bounds (mintAndTransferQuad)', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintAndTransferQuad(deployer, 3, 441, 441, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });
  });

  describe(`should mint quads`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`quadSize ${quadSize}x${quadSize}`, async function () {
        const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);
        await mintQuad(deployer, quadSize, quadSize, quadSize);
        expect(
          await LandContract.exists(quadSize, quadSize, quadSize),
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
    const {LandContract, deployer, mintQuad} = await loadFixture(setupLand);
    await mintQuad(deployer, 1, 1, 1);
    expect(await LandContract.ownerOf(getId(1, 1, 1))).to.be.equal(deployer);
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {LandContract} = await loadFixture(setupLand);
    await expect(LandContract.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id',
    );
  });

  describe(`should NOT be able to mint and transfer quad if signer is not the owner of child quad`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((outerSize) => {
      sizes.forEach((innerSize) => {
        if (innerSize >= outerSize) return;
        it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
          const {LandAsMinter, deployer, landMinter, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, innerSize, 0, 0);
          await expect(
            LandAsMinter.mintAndTransferQuad(landMinter, outerSize, 0, 0, '0x'),
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
          const {LandAsMinter, deployer, landAdmin, mintQuad} =
            await loadFixture(setupLand);
          await mintQuad(deployer, innerSize, 0, 0);
          await expect(
            LandAsMinter.mintAndTransferQuad(landAdmin, outerSize, 0, 0, '0x'),
          ).to.be.revertedWith('not owner');
        });
      });
    });
  });

  describe('MetaTransactionReceiver', function () {
    it('should not be a meta transaction processor', async function () {
      const {LandContract, MetaTransactionContract} =
        await loadFixture(setupLand);
      expect(
        await LandContract.isMetaTransactionProcessor(MetaTransactionContract),
      ).to.be.false;
    });

    it('should enable a meta transaction processor', async function () {
      const {LandAsAdmin, MetaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, true),
      ).not.to.be.reverted;
      expect(
        await LandAsAdmin.isMetaTransactionProcessor(MetaTransactionContract),
      ).to.be.true;
    });

    it('should disable a meta transaction processor', async function () {
      const {LandAsAdmin, MetaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, false),
      ).not.to.be.reverted;
      expect(
        await LandAsAdmin.isMetaTransactionProcessor(MetaTransactionContract),
      ).to.be.false;
    });

    it('should only be a contract as meta transaction processor', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.setMetaTransactionProcessor(landAdmin.address, true),
      ).to.be.revertedWith('invalid address');
    });

    it('should only be the admin able to set a meta transaction processor', async function () {
      const {LandContract, LandAsAdmin, MetaTransactionContract} =
        await loadFixture(setupLand);
      await expect(
        LandContract.setMetaTransactionProcessor(MetaTransactionContract, true),
      ).to.be.revertedWith('only admin allowed');
      await expect(
        LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, true),
      ).not.to.be.reverted;
    });
  });

  it('should return royaltyManager address', async function () {
    const {LandContract, manager} = await loadFixture(setupLand);
    expect(await LandContract.getRoyaltyManager()).to.be.equal(manager);
  });

  it('should not set royaltyManager if caller is not admin', async function () {
    const {LandAsOther, other} = await loadFixture(setupLand);
    await expect(LandAsOther.setRoyaltyManager(other)).to.be.revertedWith(
      'only admin allowed',
    );
  });

  it('should emit RoyaltyManagerSet event', async function () {
    const {LandAsAdmin, other} = await loadFixture(setupLand);
    const tx = await LandAsAdmin.setRoyaltyManager(other);
    await expect(tx).to.emit(LandAsAdmin, 'RoyaltyManagerSet').withArgs(other);
  });

  it('should set royaltyManager', async function () {
    const {LandAsAdmin, other, manager} = await loadFixture(setupLand);
    expect(await LandAsAdmin.getRoyaltyManager()).to.be.equal(manager);
    await LandAsAdmin.setRoyaltyManager(other);
    expect(await LandAsAdmin.getRoyaltyManager()).to.be.equal(other);
  });

  it('should return owner address', async function () {
    const {LandContract, landOwner} = await loadFixture(setupLand);
    expect(await LandContract.owner()).to.be.equal(landOwner);
  });

  it('should not set owner if caller is not admin', async function () {
    const {LandAsOther, other} = await loadFixture(setupLand);
    await expect(LandAsOther.transferOwnership(other)).to.be.revertedWith(
      'only admin allowed',
    );
  });

  it('should emit OwnershipTransferred event', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupLand);
    const tx = await LandAsAdmin.transferOwnership(other);
    await expect(tx)
      .to.emit(LandAsAdmin, 'OwnershipTransferred')
      .withArgs(landOwner, other);
  });

  it('should set owner', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupLand);
    expect(await LandAsAdmin.owner()).to.be.equal(landOwner);
    await LandAsAdmin.transferOwnership(other);
    expect(await LandAsAdmin.owner()).to.be.equal(other);
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
