import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand, setupPolygonLandOperatorFilter} from './fixtures';
import {ZeroAddress} from 'ethers';
import {getId} from '../fixtures';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

// TODO: some test were testing the tunnel => not anymore. We need to check if we missed something.
describe('PolygonLandV2.sol', function () {
  it('creation', async function () {
    const {landAsAdmin} = await loadFixture(setupPolygonLand);

    expect(await landAsAdmin.name()).to.be.equal("Sandbox's LANDs");
    expect(await landAsAdmin.symbol()).to.be.equal('LAND');
  });

  it('Only admin can set minter', async function () {
    const {landAsDeployer, deployer} = await loadFixture(setupPolygonLand);
    await expect(landAsDeployer.setMinter(deployer, true)).to.be.revertedWith(
      'ADMIN_ONLY',
    );
  });

  it('cannot set polygon Land Tunnel to zero address', async function () {
    const {landAsAdmin} = await loadFixture(setupPolygonLand);

    await expect(
      landAsAdmin.setMinter('0x0000000000000000000000000000000000000000', true),
    ).to.be.revertedWith('PolygonLand: Invalid address');
  });

  describe('Mint and transfer full quad', function () {
    describe('With approval', function () {
      it('transfers quads of all sizes', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
            await loadFixture(setupPolygonLand);
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await landAsMinter.mintQuad(other, size, 0, 0, bytes);
          const num = await landAsMinter.balanceOf(other);
          expect(num).to.equal(plotCount);

          await landAsOther.setApprovalForAllFor(other, deployer, true);
          await landAsDeployer.transferQuad(other, deployer, size, 0, 0, bytes);
          const num1 = await landAsDeployer.balanceOf(other);
          expect(num1).to.equal(0);
          const num2 = await landAsDeployer.balanceOf(deployer);
          expect(num2).to.equal(plotCount);
        }
      });
    });

    describe('Without approval', function () {
      it('reverts transfers of quads', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsDeployer, landAsMinter, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await landAsMinter.mintQuad(other, size, 0, 0, bytes);

          const num = await landAsDeployer.balanceOf(other);
          expect(num).to.equal(plotCount);

          await expect(
            landAsDeployer.transferQuad(other, deployer, size, 0, 0, bytes),
          ).to.be.revertedWith('not authorized to transferQuad');
        }
      });
    });

    describe('From self', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      it(`should NOT be able to transfer burned quad twice through parent quad`, async function () {
        let size1;
        let size2;
        for (let i = 0; i < sizes.length; i++) {
          size1 = sizes[i];
          for (let j = 0; j < sizes.length; j++) {
            size2 = sizes[j];
            if (size2 >= size1) continue;
            const {landAsDeployer, landAsMinter, deployer, other} =
              await loadFixture(setupPolygonLand);

            const bytes = '0x3333';
            await landAsMinter.mintQuad(deployer, size1, 0, 0, bytes);
            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const tokenId = x + y * GRID_SIZE;
                await landAsDeployer.burn(tokenId);
              }
            }
            await expect(
              landAsDeployer.transferQuad(deployer, other, size1, 0, 0, '0x'),
            ).to.be.revertedWith('not owner');
          }
        }
      });

      it(`should NOT be able to transfer burned 1x1 through parent quad`, async function () {
        const {landAsDeployer, landAsMinter, deployer, other} =
          await loadFixture(setupPolygonLand);

        const bytes = '0x3333';

        // to have enough balance after burning a 1x1
        await landAsMinter.mintQuad(deployer, 3, 3, 0, bytes);

        // let's mint all the 1x1 of a 3x3 quad
        for (let x = 0; x < 3; x++) {
          for (let y = 0; y < 3; y++) {
            await landAsMinter.mintQuad(deployer, 1, x, y, bytes);
          }
        }

        await landAsDeployer.burn(0);

        // should not be able to transfer a 3x3 quad that has a burnt 1x1
        await expect(
          landAsDeployer.transferQuad(deployer, other, 3, 0, 0, '0x'),
        ).to.be.revertedWith('not owner');
      });

      it('transfers of quads of all sizes from self', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsDeployer, landAsMinter, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await landAsMinter.mintQuad(deployer, size, 0, 0, bytes);

          const num = await landAsDeployer.balanceOf(deployer);
          expect(num).to.equal(plotCount);
          await landAsDeployer.transferQuad(deployer, other, size, 0, 0, bytes);
          const num1 = await landAsDeployer.balanceOf(deployer);
          expect(num1).to.equal(0);
          const num2 = await landAsDeployer.balanceOf(other);
          expect(num2).to.equal(plotCount);
        }
      });
    });
  });

  describe('Burn and transfer full quad', function () {
    it('should revert transfer quad from zero address', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(
          '0x0000000000000000000000000000000000000000',
          deployer,
          1,
          0,
          0,
          bytes,
        ),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert transfer quad to zero address', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(
          deployer,
          '0x0000000000000000000000000000000000000000',
          1,
          0,
          0,
          bytes,
        ),
      ).to.be.revertedWith("can't send to zero address");
    });

    describe('With approval', function () {
      it('should not transfer a burned 1x1 quad', async function () {
        const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
          await loadFixture(setupPolygonLand);

        const bytes = '0x3333';

        await landAsMinter.mintQuad(other, 1, 0, 0, bytes);

        const num = await landAsDeployer.balanceOf(other);
        expect(num).to.equal(1);

        await landAsOther.setApprovalForAllFor(other, deployer, true);

        await landAsOther.burn(0);

        await expect(
          landAsDeployer.transferQuad(other, deployer, 1, 0, 0, bytes),
        ).to.be.revertedWith('token does not exist');
      });

      it('should not transfer burned quads', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await landAsMinter.mintQuad(other, size, 0, 0, bytes);

          const num = await landAsDeployer.balanceOf(other);
          expect(num).to.equal(plotCount);

          await landAsOther.setApprovalForAllFor(other, deployer, true);

          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              await landAsOther.burn(x + y * 408);
            }
          }

          await expect(
            landAsDeployer.transferQuad(other, deployer, size, 0, 0, bytes),
          ).to.be.revertedWith('not owner');
        }
      });
    });

    describe('From self', function () {
      it('should not transfer a burned 1x1 quad', async function () {
        const {landAsDeployer, landAsMinter, deployer, other} =
          await loadFixture(setupPolygonLand);

        const bytes = '0x3333';

        await landAsMinter.mintQuad(deployer, 1, 0, 0, bytes);

        const num = await landAsDeployer.balanceOf(deployer);
        expect(num).to.equal(1);

        await landAsDeployer.burn(0);

        await expect(
          landAsDeployer.transferQuad(deployer, other, 1, 0, 0, bytes),
        ).to.be.revertedWith('token does not exist');
      });

      it('should not transfer burned quads', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await landAsMinter.mintQuad(other, size, 0, 0, bytes);

          const num = await landAsDeployer.balanceOf(other);
          expect(num).to.equal(plotCount);

          await landAsOther.setApprovalForAllFor(other, deployer, true);

          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              await landAsOther.burn(x + y * 408);
            }
          }

          await expect(
            landAsOther.transferQuad(other, deployer, size, 0, 0, bytes),
          ).to.be.revertedWith('not owner');
        }
      });
    });

    it('burnt token cannot be approved', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await landAsMinter.mintQuad(deployer, 1, 0, 0, bytes);

      await landAsDeployer.burn(0);

      await expect(landAsDeployer.approveFor(deployer, other, 0)).to.be
        .reverted;

      await expect(landAsDeployer.approve(other, 0)).to.be.reverted;
    });
  });

  describe('mint and check URIs', function () {
    for (const size of [1, 3, 6, 12, 24]) {
      it(`mint and check URI ${size}`, async function () {
        const GRID_SIZE = 408;
        const {landAsDeployer, landAsMinter, deployer} =
          await loadFixture(setupPolygonLand);

        const bytes = '0x3333';
        await landAsMinter.mintQuad(deployer, size, size, size, bytes);
        const tokenId = size + size * GRID_SIZE;
        expect(await landAsDeployer.tokenURI(tokenId)).to.be.equal(
          `https://api.sandbox.game/lands/${tokenId}/metadata.json`,
        );
      });
    }

    it(`reverts check URI for non existing token`, async function () {
      const GRID_SIZE = 408;
      const {landAsDeployer} = await loadFixture(setupPolygonLand);

      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(landAsDeployer.tokenURI(tokenId)).to.be.revertedWith(
        'Id does not exist',
      );
    });
  });

  describe('testing mintQuad', function () {
    it('should revert if to address zero', async function () {
      const {landAsMinter} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsMinter.mintQuad(ZeroAddress, 3, 3, 3, bytes),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert if signer is not minter', async function () {
      const {landAsOther, other} = await loadFixture(setupPolygonLand);

      await expect(
        landAsOther.mintQuad(other, 3, 0, 0, '0x'),
      ).to.be.revertedWith('!AUTHORIZED');
    });

    it('should revert for wrong size', async function () {
      const {landAsMinter, deployer} = await loadFixture(setupPolygonLand);

      await expect(
        landAsMinter.mintQuad(deployer, 9, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 <= size1) return;
        it(`should NOT be able to mint child ${size1}x${size1} quad if parent ${size2}x${size2} quad is already minted`, async function () {
          const {landAsMinter, deployer} = await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          await landAsMinter.mintQuad(deployer, size2, 0, 0, bytes);

          await expect(
            landAsMinter.mintQuad(deployer, size1, 0, 0, bytes),
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to mint ${size1}x${size1} quad if child ${size2}x${size2} quad is already minted`, async function () {
          const {landAsMinter, deployer} = await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          await landAsMinter.mintQuad(deployer, size2, 0, 0, bytes);

          await expect(
            landAsMinter.mintQuad(deployer, size1, 0, 0, bytes),
          ).to.be.revertedWith('Already minted');
        });
      });
    });
  });

  describe('testing mintAndTransferQuad', function () {
    it('should revert if signer is not minter', async function () {
      const {landAsOther, other} = await loadFixture(setupPolygonLand);

      await expect(
        landAsOther.mintAndTransferQuad(other, 3, 0, 0, '0x'),
      ).to.be.revertedWith('!AUTHORIZED');
    });

    it('should revert for transfer if to address zero', async function () {
      const {landAsAdmin, landAsDeployer, deployer} =
        await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await landAsAdmin.setMinter(deployer, true);
      await expect(
        landAsDeployer.mintAndTransferQuad(ZeroAddress, 3, 3, 3, bytes),
      ).to.be.revertedWith('to is zero address');
    });

    it('should clear operator for Land when parent Quad is mintAndTransfer', async function () {
      const {
        landAsAdmin,
        landAsMinter,
        landAsDeployer,
        deployer,
        landAdmin,
        minter,
      } = await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await landAsAdmin.setMinter(deployer, true);
      await landAsMinter.mintQuad(deployer, 1, 0, 0, bytes);
      const id = getId(1, 0, 0);
      await landAsDeployer.approve(landAdmin, id);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(deployer);
      expect(await landAsDeployer.getApproved(id)).to.be.equal(landAdmin);
      await landAsDeployer.mintAndTransferQuad(minter, 3, 0, 0, bytes);
      expect(await landAsDeployer.getApproved(id)).to.be.equal(ZeroAddress);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(minter);
    });

    it('should revert for mint if to address zero', async function () {
      const {landAsMinter} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsMinter.mintAndTransferQuad(ZeroAddress, 3, 3, 3, bytes),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert for mint if x co-ordinates of Quad are invalid', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(deployer, other, 3, 4, 0, bytes),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert for mint if y co-ordinates of Quad are invalid', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(deployer, other, 3, 0, 4, bytes),
      ).to.be.revertedWith('Invalid y coordinate');
    });

    it('should revert for mint if x co-ordinate are out of bound', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(deployer, other, 3, 411, 0, bytes),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert for mint if y co-ordinates are out of bound', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await expect(
        landAsDeployer.transferQuad(deployer, other, 3, 0, 411, bytes),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert for mint if size is out of bound', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsDeployer.transferQuad(deployer, other, 25, 0, 0, bytes),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {landAsMinter, minter, testERC721TokenReceiver} =
        await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await testERC721TokenReceiver.returnWrongBytes();
      await landAsMinter.mintQuad(minter, 3, 0, 0, bytes);
      await expect(
        landAsMinter.mintAndTransferQuad(
          testERC721TokenReceiver,
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('erc721 batchTransfer rejected');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {landAsMinter, minter, testERC721TokenReceiver} =
        await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await landAsMinter.mintQuad(minter, 3, 0, 0, bytes);
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

    it('should revert when size is invalid', async function () {
      const {landAsMinter, landAdmin, testERC721TokenReceiver} =
        await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await landAsMinter.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        landAsMinter.mintAndTransferQuad(
          testERC721TokenReceiver,
          9,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is zero address', async function () {
      const {landAsMinter} = await loadFixture(setupPolygonLand);
      await expect(
        landAsMinter.mintAndTransferQuad(ZeroAddress, 9, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when sender is not the owner of child quad', async function () {
      const {
        landAsDeployer,
        landAsMinter,
        deployer,
        landAdmin,
        testERC721TokenReceiver,
      } = await loadFixture(setupPolygonLand);
      const bytes = '0x3333';
      await testERC721TokenReceiver.returnWrongBytes();
      await landAsMinter.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        landAsDeployer.transferQuad(
          deployer,
          testERC721TokenReceiver,
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should revert approveFor for ZeroAddress spender', async function () {
      const {landAsDeployer, landAsOther, mockMarketPlace3, other} =
        await loadFixture(setupPolygonLandOperatorFilter);
      await landAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(ZeroAddress, mockMarketPlace3, id),
      ).to.be.revertedWith('ZERO_ADDRESS_SENDER');
    });

    it('should revert approveFor for unauthorized user', async function () {
      const {landAsDeployer, landAsOther, mockMarketPlace3, other, other1} =
        await loadFixture(setupPolygonLandOperatorFilter);
      await landAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(other1, mockMarketPlace3, id),
      ).to.be.revertedWith('UNAUTHORIZED_APPROVAL');
    });

    it('should revert approveFor zero owner of tokenId', async function () {
      const {landAsOther, mockMarketPlace3, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      const GRID_SIZE = 408;
      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(
        landAsOther.approveFor(other, mockMarketPlace3, tokenId),
      ).to.be.revertedWith('NONEXISTENT_TOKEN');
    });

    it('should revert approve for zero address owner of token', async function () {
      const {landAsOther, mockMarketPlace3} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      const GRID_SIZE = 408;
      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(
        landAsOther.approve(mockMarketPlace3, tokenId),
      ).to.be.revertedWith('NONEXISTENT_TOKEN');
    });

    it('should revert approve for ZeroAddress spender', async function () {
      const {landAsDeployer, landAsOther1, mockMarketPlace3, other} =
        await loadFixture(setupPolygonLandOperatorFilter);
      await landAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        landAsOther1.approve(mockMarketPlace3, id),
      ).to.be.revertedWith('UNAUTHORIZED_APPROVAL');
    });

    it('should revert setApprovalForAllFor for ZeroAddress', async function () {
      const {landAsOther, mockMarketPlace3} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(
        landAsOther.setApprovalForAllFor(ZeroAddress, mockMarketPlace3, true),
      ).to.be.revertedWith('Invalid sender address');
    });

    it('should revert setApprovalForAllFor for unauthorized users', async function () {
      const {landAsOther, mockMarketPlace3} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(
        landAsOther.setApprovalForAllFor(
          mockMarketPlace3,
          mockMarketPlace3,
          true,
        ),
      ).to.be.revertedWith('UNAUTHORIZED_APPROVE_FOR_ALL');
    });

    it('should revert approvalFor for same sender and spender', async function () {
      const {landAsDeployer, deployer, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        landAsDeployer.approveFor(deployer, deployer, id),
      ).to.be.revertedWith('OWNER_NOT_SENDER');
    });

    it('subscription can not be zero address', async function () {
      const {landAsAdmin} = await loadFixture(setupPolygonLandOperatorFilter);
      await expect(landAsAdmin.register(ZeroAddress, true)).to.be.revertedWith(
        "subscription can't be zero",
      );
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to mint and transfer ${size1}x${size1} quad if signer is not the owner of child ${size2}x${size2} quad`, async function () {
          const {landAsMinter, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          await landAsMinter.mintQuad(other, size2, 0, 0, bytes);

          await expect(
            landAsMinter.mintAndTransferQuad(deployer, size1, 0, 0, bytes),
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 <= size1) return;
        it(`should NOT be able to transfer child ${size1}x${size1} quad if signer is not the owner of  parent ${size2}x${size2} quad `, async function () {
          const {landAsDeployer, landAsMinter, deployer, other} =
            await loadFixture(setupPolygonLand);

          const bytes = '0x3333';
          await landAsMinter.mintQuad(other, size2, 0, 0, bytes);
          await expect(
            landAsDeployer.mintAndTransferQuad(deployer, size1, 0, 0, bytes),
          ).to.be.reverted;
        });
      });
    });
  });

  it('supported interfaces', async function () {
    const {landAsAdmin} = await loadFixture(setupPolygonLand);

    expect(await landAsAdmin.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await landAsAdmin.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await landAsAdmin.supportsInterface('0x5b5e139f')).to.be.true;
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {landAsAdmin} = await loadFixture(setupPolygonLand);

    await expect(landAsAdmin.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id',
    );
  });

  it('should return correct ownerOf 1*1 quad minted', async function () {
    const {landAsMinter, deployer} = await loadFixture(setupPolygonLand);
    const bytes = '0x3333';
    await landAsMinter.mintQuad(deployer, 1, 1, 1, bytes);
    expect(await landAsMinter.ownerOf(getId(1, 1, 1))).to.be.equal(deployer);
  });

  describe('Mint and transfer a smaller quad', function () {
    it('transferring a 1X1 quad from a 3x3', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 3, 3, 3, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(9);

      await landAsDeployer.transferQuad(deployer, other, 1, 3, 3, bytes);

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(8);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(1);
    });

    it('transferring a 1X1 quad from a 12x12', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(144);

      await landAsDeployer.transferQuad(deployer, other, 1, 12, 12, bytes);

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(143);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(1);
    });

    it('transferring a 3X3 quad from a 6x6', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 6, 6, 6, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(36);

      await landAsDeployer.transferQuad(deployer, other, 3, 6, 6, bytes);

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(27);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(9);
    });

    it('transferring a 6X6 quad from a 12x12', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(144);

      await landAsDeployer.transferQuad(deployer, other, 6, 12, 12, bytes);

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(108);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(36);
    });
  });

  describe('Mint and transfer all its smaller quads', function () {
    it('transferring all 1X1 quad from a 3x3', async function () {
      const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 3, 3, 3, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(9);

      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await landAsDeployer.transferQuad(deployer, other, 1, x, y, bytes);
        }
      }

      //landowner2 will burn all his land
      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await landAsOther.burn(x + y * 408);
        }
      }

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(0);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(0);

      await expect(
        landAsMinter.mintQuad(deployer, 3, 3, 3, bytes),
      ).to.be.revertedWith('Already minted');
    });

    it('transferring all 1X1 quad from a 6x6', async function () {
      const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 6, 6, 6, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(36);

      for (let x = 6; x < 12; x++) {
        for (let y = 6; y < 12; y++) {
          await landAsDeployer.transferQuad(deployer, other, 1, x, y, bytes);
        }
      }

      //landowner2 will burn all his land
      for (let x = 6; x < 12; x++) {
        for (let y = 6; y < 12; y++) {
          await landAsOther.burn(x + y * 408);
        }
      }

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(0);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(0);

      await expect(
        landAsMinter.mintQuad(deployer, 6, 6, 6, bytes),
      ).to.be.revertedWith('Already minted');
    });

    it('transferring all 1X1 quad from a 12x12', async function () {
      const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
      const num = await landAsDeployer.balanceOf(deployer);
      expect(num).to.equal(144);

      for (let x = 12; x < 24; x++) {
        for (let y = 12; y < 24; y++) {
          await landAsDeployer.transferQuad(deployer, other, 1, x, y, bytes);
        }
      }

      for (let x = 12; x < 24; x++) {
        for (let y = 12; y < 24; y++) {
          await landAsOther.burn(x + y * 408);
        }
      }

      const num1 = await landAsDeployer.balanceOf(deployer);

      expect(num1).to.equal(0);

      const num2 = await landAsDeployer.balanceOf(other);

      expect(num2).to.equal(0);

      await expect(
        landAsMinter.mintQuad(deployer, 12, 12, 12, bytes),
      ).to.be.revertedWith('Already minted');
    });
  });

  describe('transfer batch', function () {
    it('transfers batch of quads of different sizes', async function () {
      const {landAsDeployer, landAsMinter, landAsOther, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(other, 24, 0, 0, bytes);
      await landAsMinter.mintQuad(other, 12, 300, 300, bytes);
      await landAsMinter.mintQuad(other, 6, 30, 30, bytes);
      await landAsMinter.mintQuad(other, 3, 24, 24, bytes);
      await landAsOther.setApprovalForAllFor(other, deployer, true);
      await landAsDeployer.batchTransferQuad(
        other,
        deployer,
        [24, 12, 6, 3],
        [0, 300, 30, 24],
        [0, 300, 30, 24],
        bytes,
      );
      const num1 = await landAsDeployer.balanceOf(other);
      expect(num1).to.equal(0);
      const num2 = await landAsDeployer.balanceOf(deployer);
      expect(num2).to.equal(765);
    });

    it('transfers batch of quads of different sizes from self', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 24, 0, 0, bytes);
      await landAsMinter.mintQuad(deployer, 12, 300, 300, bytes);
      await landAsMinter.mintQuad(deployer, 6, 30, 30, bytes);
      await landAsMinter.mintQuad(deployer, 3, 24, 24, bytes);
      await landAsDeployer.batchTransferQuad(
        deployer,
        other,
        [24, 12, 6, 3],
        [0, 300, 30, 24],
        [0, 300, 30, 24],
        bytes,
      );
      const num1 = await landAsDeployer.balanceOf(deployer);
      expect(num1).to.equal(0);
      const num2 = await landAsDeployer.balanceOf(other);
      expect(num2).to.equal(765);
    });

    it('reverts transfers batch of quads to address zero', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          '0x0000000000000000000000000000000000000000',
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes,
        ),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('reverts transfers batch of quads from address zero', async function () {
      const {landAsDeployer, other} = await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsDeployer.batchTransferQuad(
          '0x0000000000000000000000000000000000000000',
          other,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes,
        ),
      ).to.be.revertedWith('invalid from');
    });

    it('reverts transfers batch of quads for invalid parameters', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          other,
          [24, 12, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes,
        ),
      ).to.be.revertedWith("sizes's and x's are different");
    });

    it('reverts transfers batch of quads for invalid x and y length', async function () {
      const {landAsDeployer, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await expect(
        landAsDeployer.batchTransferQuad(
          deployer,
          other,
          [24, 12],
          [0, 300],
          [0, 300, 30, 24],
          bytes,
        ),
      ).to.be.revertedWith("x's and y's are different");
    });
  });

  describe('Testing transferFrom', function () {
    it('Transfer 1x1 without approval', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(other, 1, 0, 0, bytes);

      await expect(
        landAsDeployer.transferFrom(other, deployer, 0),
      ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
    });

    it('Transfer 1x1 with approval', async function () {
      const {landAsDeployer, landAsOther, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(other, 1, 0, 0, bytes);

      await landAsOther.approve(deployer, 0);

      await landAsDeployer.transferFrom(other, deployer, 0);
      const num1 = await landAsDeployer.balanceOf(other);
      expect(num1).to.equal(0);
      const num2 = await landAsDeployer.balanceOf(deployer);
      expect(num2).to.equal(1);
    });
  });

  describe('testing batchTransferFrom', function () {
    it('Mint 12x12 and transfer all internals 1x1s from it', async function () {
      const {landAsDeployer, landAsMinter, deployer, other} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';
      await landAsMinter.mintQuad(deployer, 12, 0, 0, bytes);

      await landAsDeployer.batchTransferFrom(
        deployer,
        other,
        [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 419, 418, 417, 416, 415, 414,
          413, 412, 411, 410, 409, 408, 816, 817, 818, 819, 820, 821, 822, 823,
          824, 825, 826, 827, 1235, 1234, 1233, 1232, 1231, 1230, 1229, 1228,
          1227, 1226, 1225, 1224, 1632, 1633, 1634, 1635, 1636, 1637, 1638,
          1639, 1640, 1641, 1642, 1643, 2051, 2050, 2049, 2048, 2047, 2046,
          2045, 2044, 2043, 2042, 2041, 2040, 2448, 2449, 2450, 2451, 2452,
          2453, 2454, 2455, 2456, 2457, 2458, 2459, 2867, 2866, 2865, 2864,
          2863, 2862, 2861, 2860, 2859, 2858, 2857, 2856, 3264, 3265, 3266,
          3267, 3268, 3269, 3270, 3271, 3272, 3273, 3274, 3275, 3683, 3682,
          3681, 3680, 3679, 3678, 3677, 3676, 3675, 3674, 3673, 3672, 4080,
          4081, 4082, 4083, 4084, 4085, 4086, 4087, 4088, 4089, 4090, 4091,
          4499, 4498, 4497, 4496, 4495, 4494, 4493, 4492, 4491, 4490, 4489,
          4488,
        ],
        bytes,
      );
      const num1 = await landAsDeployer.balanceOf(deployer);
      expect(num1).to.equal(0);
      const num2 = await landAsDeployer.balanceOf(other);
      expect(num2).to.equal(144);
    });
  });

  describe('Meta transactions', function () {
    describe('transferQuad without approval', function () {
      it('should not transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsMinter, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          const landHolder = other;
          const landReceiver = other1;
          // Mint LAND on L1
          await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );

          const {to, data} = await landAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await expect(sendMetaTx(landReceiver, to, data)).to.revertedWith(
            'not authorized to transferQuad',
          );
          expect(await landAsMinter.balanceOf(landReceiver)).to.be.equal(0);
          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );
        }
      });
    });

    describe('transferQuad with approval', function () {
      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );
          const {to, data} = await landAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await landAsOther.setApprovalForAll(landReceiver, true);

          await sendMetaTx(landHolder, to, data);

          expect(await landAsMinter.balanceOf(landReceiver)).to.be.equal(
            plotCount,
          );
          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(0);
        }
      });
    });

    describe('transferQuad from self', function () {
      it('should revert transfer of quad twice through parent quad', async function () {
        let size1;
        let size2;
        for (let i = 0; i < sizes.length; i++) {
          size1 = sizes[i];
          for (let j = 0; j < sizes.length; j++) {
            size2 = sizes[j];
            if (size2 < size1) {
              const {landAsMinter, landAsOther, other, other1, other2} =
                await loadFixture(setupPolygonLand);

              const landHolder = other;
              const landReceiver = other1;
              const landReceiver2 = other2;
              const x = 0;
              const y = 0;
              const bytes = '0x00';

              await landAsMinter.mintQuad(landHolder, size1, x, y, bytes);
              expect(await landAsMinter.ownerOf(0)).to.be.equal(landHolder);

              await landAsOther.transferQuad(
                landHolder,
                landReceiver,
                size2,
                x,
                y,
                bytes,
              );

              await expect(
                landAsOther.transferQuad(
                  landHolder,
                  landReceiver2,
                  size2,
                  x,
                  y,
                  bytes,
                ),
              ).to.be.revertedWith(/not owner/);
            }
          }
        }
      });

      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landAsMinter, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );

          const {to, data} = await landAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await sendMetaTx(landHolder, to, data);

          expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(0);
          expect(await landAsMinter.balanceOf(landReceiver)).to.be.equal(
            plotCount,
          );
        }
      });
    });

    describe('Burn and transfer full quad', function () {
      it('should revert transfer of 1x1 quad after burn', async function () {
        const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);

        const landHolder = other;
        const landReceiver = other1;
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
        const id = x + y * 408;
        const {to, data} =
          await landAsMinter['burn(uint256)'].populateTransaction(id);

        await sendMetaTx(landHolder, to, data);

        await expect(
          landAsOther.transferQuad(landHolder, landReceiver, size, x, y, bytes),
        ).to.be.revertedWith('token does not exist');
      });

      it('should revert transfer of quad if a sub quad is burned', async function () {
        let size1;
        let size2;
        for (let i = 0; i < sizes.length; i++) {
          size1 = sizes[i];
          for (let j = 0; j < sizes.length; j++) {
            size2 = sizes[j];
            if (size2 >= size1) continue;
            const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
              await loadFixture(setupPolygonLand);

            const landHolder = other;
            const landReceiver = other1;
            const x = 0;
            const y = 0;
            const bytes = '0x00';
            const plotCount = size1 * size1;

            // Mint LAND on L1
            await landAsMinter.mintQuad(landHolder, size1, x, y, bytes);
            expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(
              plotCount,
            );
            expect(await landAsOther.ownerOf(0)).to.be.equal(landHolder);

            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const id = x + y * GRID_SIZE;
                const {to, data} =
                  await landAsOther['burn(uint256)'].populateTransaction(id);

                await sendMetaTx(landHolder, to, data);
              }
            }

            await expect(landAsOther.ownerOf(0)).to.be.revertedWith(
              'NONEXISTANT_TOKEN',
            );

            await expect(
              landAsOther.transferQuad(
                landHolder,
                landReceiver,
                size1,
                x,
                y,
                bytes,
              ),
            ).to.be.revertedWith('not owner');

            //check override
            await expect(landAsOther.ownerOf(0)).to.be.revertedWith(
              'NONEXISTANT_TOKEN',
            );
          }
        }
      });

      it('should revert transfer of any size quad after burn', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';

          await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              const id = x + y * 408;
              const {to, data} =
                await landAsOther['burn(uint256)'].populateTransaction(id);

              await sendMetaTx(landHolder, to, data);
            }
          }

          await expect(
            landAsOther.transferQuad(
              landHolder,
              landReceiver,
              size,
              x,
              y,
              bytes,
            ),
          ).to.be.revertedWith('not owner');
        }
      });
    });

    describe('batchTransferQuad', function () {
      it('should batch transfer 1x1 quads', async function () {
        const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);

        const landHolder = other;
        const landReceiver = other1;
        const size = 1;
        const bytes = '0x00';

        // Mint LAND on L1
        await landAsMinter.mintQuad(landHolder, size, 0, 0, bytes);
        await landAsMinter.mintQuad(landHolder, size, 0, 1, bytes);

        expect(await landAsOther.balanceOf(landHolder)).to.be.equal(2);

        const {to, data} = await landAsOther[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ].populateTransaction(
          landHolder,
          landReceiver,
          [size, size],
          [0, 0],
          [0, 1],
          bytes,
        );
        await sendMetaTx(landHolder, to, data);
        expect(await landAsOther.balanceOf(landHolder)).to.be.equal(0);
        expect(await landAsOther.balanceOf(landReceiver)).to.be.equal(2);
      });

      it('should batch transfer quads of different sizes', async function () {
        const {landAsMinter, landAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);
        const bytes = '0x3333';
        const landHolder = other;
        const landReceiver = other1;

        await landAsMinter.mintQuad(landHolder, 12, 144, 144, bytes);
        await landAsMinter.mintQuad(landHolder, 6, 36, 36, bytes);
        await landAsMinter.mintQuad(landHolder, 3, 9, 9, bytes);
        await landAsMinter.mintQuad(landHolder, 1, 0, 0, bytes);

        expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(190);

        const {to, data} = await landAsOther[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ].populateTransaction(
          landHolder,
          landReceiver,
          [12, 6, 3, 1],
          [144, 36, 9, 0],
          [144, 36, 9, 0],
          bytes,
        );

        await sendMetaTx(landHolder, to, data);

        expect(await landAsOther.balanceOf(landHolder)).to.be.equal(0);
        expect(await landAsOther.balanceOf(landReceiver)).to.be.equal(190);
      });
    });
  });

  describe('Getters', function () {
    it('returns the width of the grid', async function () {
      const {landAsDeployer} = await loadFixture(setupPolygonLand);
      expect(await landAsDeployer.width()).to.be.equal(408);
    });

    it('returns the height of the grid', async function () {
      const {landAsDeployer} = await loadFixture(setupPolygonLand);
      expect(await landAsDeployer.height()).to.be.equal(408);
    });

    it('should fetch x and y values of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {landAsMinter, other} = await loadFixture(setupPolygonLand);

        const landHolder = other;
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
        expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(plotCount);
        const id = x + y * 408;
        expect(await landAsMinter.getX(id)).to.be.equal(x);
        expect(await landAsMinter.getY(id)).to.be.equal(y);
      }
    });

    it('should fetch owner of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {landAsMinter, other} = await loadFixture(setupPolygonLand);

        const landHolder = other;
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landAsMinter.mintQuad(landHolder, size, x, y, bytes);
        expect(await landAsMinter.balanceOf(landHolder)).to.be.equal(plotCount);
        const id = x + y * 408;

        expect(await landAsMinter.ownerOf(id)).to.be.equal(landHolder);
      }
    });

    it('should revert when fetching owner of given quad id with wrong size', async function () {
      const {landAsDeployer} = await loadFixture(setupPolygonLand);
      const id = getId(9, 0, 0);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when fetching owner of given quad id with invalid token', async function () {
      const {landAsDeployer} = await loadFixture(setupPolygonLand);
      const id = getId(3, 2, 2);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when fetching owner of given quad id with invalid token by(x)', async function () {
      const {landAsDeployer} = await loadFixture(setupPolygonLand);
      const id = getId(3, 2, 0);
      await expect(landAsDeployer.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should revert when fetching owner of given quad id with invalid token(y)', async function () {
      const {landAsMinter} = await loadFixture(setupPolygonLand);
      const id = getId(3, 0, 2);
      await expect(landAsMinter.ownerOf(id)).to.be.revertedWith(
        'Invalid token id',
      );
    });

    it('should return owner for quad id', async function () {
      const {landAsDeployer, landAsMinter, deployer} =
        await loadFixture(setupPolygonLand);

      await landAsMinter.mintQuad(deployer, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(deployer);
    });

    it('checks if a quad is valid & exists', async function () {
      const {landAsDeployer, landAsMinter, deployer} =
        await loadFixture(setupPolygonLand);

      const bytes = '0x3333';

      await landAsMinter.mintQuad(deployer, 24, 0, 0, bytes);

      for (const size of sizes) {
        expect(await landAsDeployer.exists(size, 0, 0)).to.be.true;
      }

      await expect(landAsDeployer.exists(4, 0, 0)).to.be.reverted;

      await expect(landAsDeployer.exists(1, 500, 0)).to.be.reverted;

      await expect(landAsDeployer.exists(1, 0, 500)).to.be.reverted;

      await expect(landAsDeployer.exists(3, 0, 500)).to.be.reverted;

      await expect(landAsDeployer.exists(3, 500, 0)).to.be.reverted;
    });
  });

  describe('OperatorFilterer', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, landAsDeployer} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      expect(
        await operatorFilterRegistry.isRegistered(landAsDeployer),
      ).to.be.equal(true);
    });

    it('would not register on the operator filter registry if not set on the Land', async function () {
      const {operatorFilterRegistry, landRegistryNotSetAsDeployer} =
        await loadFixture(setupPolygonLandOperatorFilter);
      await landRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);
      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsDeployer),
      ).to.be.equal(false);
    });

    it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        landRegistryNotSetAsDeployer,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landRegistryNotSetAsDeployer.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);
      await landRegistryNotSetAsDeployer.registerFilterer(
        operatorFilterSubscription,
        true,
      );

      expect(
        await operatorFilterRegistry.subscriptionOf(
          landRegistryNotSetAsDeployer,
        ),
      ).to.be.equal(ZeroAddress);
    });

    it('should could be registered through OperatorFiltererUpgradeable', async function () {
      const {operatorFilterRegistry, landRegistryNotSetAsDeployer} =
        await loadFixture(setupPolygonLandOperatorFilter);

      await landRegistryNotSetAsDeployer.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsDeployer),
      ).to.be.equal(true);
    });

    it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        landRegistryNotSetAsDeployer,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      await landRegistryNotSetAsDeployer.setOperatorRegistry(
        operatorFilterRegistry,
      );
      await landRegistryNotSetAsDeployer.registerFilterer(
        operatorFilterSubscription,
        false,
      );

      expect(
        await operatorFilterRegistry.isRegistered(landRegistryNotSetAsDeployer),
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(
          landRegistryNotSetAsDeployer,
        ),
      ).to.be.equal(ZeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          landRegistryNotSetAsDeployer,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
      const {
        landRegistryNotSetAsDeployer,
        landRegistryNotSetAsOther,
        operatorFilterSubscription,
        other,
        mockMarketPlace1,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      await landRegistryNotSetAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      await landRegistryNotSetAsDeployer.registerFilterer(
        operatorFilterSubscription,
        true,
      );

      await landRegistryNotSetAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(
        await landRegistryNotSetAsDeployer.isApprovedForAll(
          other,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
      const {
        landRegistryNotSetAsDeployer,
        landRegistryNotSetAsOther,
        operatorFilterSubscription,
        other,
        other1,
        mockMarketPlace1,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      await landRegistryNotSetAsDeployer.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await landRegistryNotSetAsDeployer.registerFilterer(
        operatorFilterSubscription,
        true,
      );

      await landRegistryNotSetAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(
        await landRegistryNotSetAsDeployer.isApprovedForAll(
          other,
          mockMarketPlace1,
        ),
      ).to.be.equal(true);

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        landRegistryNotSetAsDeployer,
        other,
        other1,
        id,
      );

      expect(await landRegistryNotSetAsDeployer.ownerOf(id)).to.be.equal(
        other1,
      );
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        landAsDeployer,
        operatorFilterRegistry,
        operatorFilterSubscription,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      expect(
        await operatorFilterRegistry.subscriptionOf(landAsDeployer),
      ).to.be.equal(operatorFilterSubscription);
    });

    it('should be able to transfer land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.transferFrom(other, other1, id);

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('should revert for minted invalid size', async function () {
      const {landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(
        landAsOther.mintQuad(other, 25, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    it('should be able to safe transfer land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther['safeTransferFrom(address,address,uint256)'](
        other,
        other1,
        id,
      );

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.safeBatchTransferFrom(other, other1, [id1, id2], '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(2);
    });
    it('should be able to batch transfer Land if from is the owner of token', async function () {
      const {landAsOther, other, other1} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landAsOther.batchTransferFrom(other, other1, [id1, id2], '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(2);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.transferFrom(other, mockMarketPlace1, id);

      expect(await landAsOther.balanceOf(mockMarketPlace1)).to.be.equal(1);
    });

    it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await expect(landAsOther.approve(mockMarketPlace1, 1)).to.be.reverted;
    });

    it('it should not approveFor blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther1, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(landAsOther1.approveFor(other, mockMarketPlace1, 1)).to.be
        .reverted;
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther1} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(landAsOther1.setApprovalForAll(mockMarketPlace1, true)).to.be
        .reverted;
    });

    it('it should not setApprovalForAllFor blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther1, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await expect(
        landAsOther1.setApprovalForAllFor(other, mockMarketPlace1, true),
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );

      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther.approve(mockMarketPlace3, id);
      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace3);
    });

    it('it should approveFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id);
      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace3);
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.setApprovalForAll(mockMarketPlace3, true);
      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);
    });

    it('it should setApprovalForAllFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landAsOther, other} = await loadFixture(
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);
      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approve(mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approve(mockMarketPlace3, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace3, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.setApprovalForAll(mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace3,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAll(mockMarketPlace3, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
        other1,
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace3,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAllFor(other1, mockMarketPlace3, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approve(mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace3CodeHash,
        true,
      );

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approve(mockMarketPlace3, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landAsOther.approveFor(other, mockMarketPlace3, id1);

      expect(await landAsOther.getApproved(id1)).to.be.equal(mockMarketPlace3);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace3CodeHash,
        true,
      );

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace3, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.setApprovalForAll(mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAll(mockMarketPlace3, true),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        landAsOther1,
        other,
        other1,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);

      await landAsOther.setApprovalForAllFor(other, mockMarketPlace3, true);

      expect(
        await landAsOther.isApprovedForAll(other, mockMarketPlace3),
      ).to.be.equal(true);

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        landAsOther1.setApprovalForAllFor(other1, mockMarketPlace3, true),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        landAsOther.approve(mockMarketPlace1, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace1,
        false,
      );

      await landAsOther.approve(mockMarketPlace1, id);

      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace1);
    });

    it('it should be able to approveFor blacklisted market places after they are removed from the blacklist', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        landAsOther.approveFor(other, mockMarketPlace1, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace1,
        false,
      );

      await landAsOther.approveFor(other, mockMarketPlace1, id);

      expect(await landAsOther.getApproved(id)).to.be.equal(mockMarketPlace1);
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await expect(
        landAsOther.setApprovalForAll(mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace1,
        false,
      );

      await landAsOther.setApprovalForAll(mockMarketPlace1, true);

      expect(await landAsOther.isApprovedForAll(other, mockMarketPlace1)).to.be
        .true;
    });

    it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistry,
        operatorFilterSubscription,
        landAsOther,
        other,
      } = await loadFixture(setupPolygonLandOperatorFilter);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);

      await expect(
        landAsOther.setApprovalForAllFor(other, mockMarketPlace1, true),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);

      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id1, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace3,
        true,
      );

      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landAsOther.setApprovalForAllWithOutFilter(mockMarketPlace3, true);
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id1, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace3);
      await operatorFilterRegistry.updateCodeHash(
        operatorFilterSubscription,
        mockMarketPlace3CodeHash,
        true,
      );
      await landAsOther.mintQuad(other, 1, 0, 1, '0x');
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
        mockMarketPlace1,
        false,
      );
      await mockMarketPlace1[
        'transferLand(address,address,address,uint256,bytes)'
      ](landAsOther, other, other1, id, '0x');

      expect(await landAsOther.balanceOf(other1)).to.be.equal(1);
    });

    it('it should not be able to transfer(without data) through blacklisted market places', async function () {
      const {mockMarketPlace1, landAsOther, landAsOther1, other, other1} =
        await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landAsOther1.setApprovalForAllWithOutFilter(mockMarketPlace1, true);
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
        setupPolygonLandOperatorFilter,
      );
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        operatorFilterSubscription,
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        operatorFilterSubscription,
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
      } = await loadFixture(setupPolygonLandOperatorFilter);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistry.codeHashOf(mockMarketPlace1);
      await landAsOther.mintQuad(other, 1, 0, 0, '0x');
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
        operatorFilterSubscription,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistry.updateOperator(
        operatorFilterSubscription,
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
