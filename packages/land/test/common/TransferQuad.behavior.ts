import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Result, toUtf8Bytes, toUtf8String, ZeroAddress} from 'ethers';
import {getId} from '../fixtures';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

function getQuadIds(size: number, x0 = 0, y0 = 0) {
  const ret = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ret.push(x0 + x + (y0 + y) * 408);
    }
  }
  return ret;
}

function sort(arr: Result | number[] | string[]): number[] {
  return arr.map((x) => parseInt(x)).sort((a, b) => a - b);
}

// eslint-disable-next-line mocha/no-exports
export function shouldCheckTransferQuad(setupLand, Contract: string) {
  describe(Contract + ':transferQuad', function () {
    it('should revert if x co-ordinate of Quad is invalid', async function () {
      const {LandContract, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 6, 1, 1, '0x'),
      )
        .to.be.revertedWithCustomError(LandContract, 'InvalidCoordinates')
        .withArgs(6, 1, 1);
    });

    it('should revert if y co-ordinate of Quad is invalid', async function () {
      const {LandContract, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 6, 0, 5, '0x'),
      )
        .to.be.revertedWithCustomError(LandContract, 'InvalidCoordinates')
        .withArgs(6, 0, 5);
    });

    it('should revert when x coordinate is out of bounds', async function () {
      const {LandContract, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 3, 441, 0, '0x'),
      )
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(3, 441, 0);
    });

    it('should revert when y coordinate is out of bounds', async function () {
      const {LandContract, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 3, 0, 441, '0x'),
      )
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(3, 0, 441);
    });

    it('should revert for invalid size', async function () {
      const {LandContract, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(deployer, landAdmin, 9, 0, 0, '0x'),
      )
        .to.be.revertedWithCustomError(LandContract, 'InvalidCoordinates')
        .withArgs(9, 0, 0);
    });

    it('should revert when to is ZeroAddress', async function () {
      const {LandAsAdmin, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landAdmin, 3, 0, 0, '0x');
      await expect(
        LandAsAdmin.transferQuad(landAdmin, ZeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
    });

    it('should revert when from is ZeroAddress', async function () {
      const {LandAsAdmin, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landAdmin, 3, 0, 0, '0x');
      await expect(
        LandAsAdmin.transferQuad(ZeroAddress, landAdmin, 3, 0, 0, '0x'),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
    });

    it('should revert when operator is not approved', async function () {
      const {LandContract, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landAdmin, 3, 0, 0, '0x');
      await expect(
        LandContract.transferQuad(landAdmin, deployer, 3, 0, 0, '0x'),
      )
        .to.be.revertedWithCustomError(LandContract, 'ERC721InvalidOwner')
        .withArgs(deployer);
    });

    it('should revert when token does not exist', async function () {
      const {LandAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.transferQuad(landAdmin, deployer, 1, 0, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsAdmin, 'NotOwner')
        .withArgs(0, 0);
    });

    it('should revert for transfer Quad of zero size', async function () {
      const {LandAsAdmin, deployer, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.transferQuad(landAdmin, deployer, 0, 0, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsAdmin, 'InvalidCoordinates')
        .withArgs(0, 0, 0);
    });

    it('should revert when sender is not owner of Quad', async function () {
      const {LandAsAdmin, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 3, 0, 0, '0x');
      await expect(LandAsAdmin.transferQuad(landAdmin, deployer, 6, 0, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsAdmin, 'NotOwner')
        .withArgs(0, 0);
    });

    it('should revert if some sub-quads are not owned by the sender', async function () {
      const {LandAsMinter, LandAsOther, other, other1, other2} =
        await loadFixture(setupLand);

      await LandAsMinter.mintQuad(other, 6, 0, 0, '0x');
      await LandAsOther.transferQuad(other, other2, 1, 0, 0, '0x');
      await expect(LandAsOther.transferQuad(other, other1, 6, 0, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidOwner')
        .withArgs(other);
    });

    it('should not revert when from is owner of all subQuads of Quad', async function () {
      const {LandContract, deployer, landAdmin, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 3, 0, 0, '0x');
      await LandAsMinter.mintQuad(deployer, 3, 0, 3, '0x');
      await LandAsMinter.mintQuad(deployer, 3, 3, 0, '0x');
      await LandAsMinter.mintQuad(deployer, 3, 3, 3, '0x');
      await LandContract.transferQuad(deployer, landAdmin, 6, 0, 0, '0x');
      expect(await LandContract.balanceOf(landAdmin)).to.be.equal(36);
    });

    it('should not revert when some subquads are transferred to the sender before transferring the main quad', async function () {
      const {LandAsMinter, LandAsOther, other, other1} =
        await loadFixture(setupLand);

      const quadSize = 6;
      await LandAsMinter.mintQuad(other, quadSize, 0, 0, '0x');
      await LandAsOther.transferQuad(other, other, 1, 0, 0, '0x');

      expect(await LandAsOther.balanceOf(other)).to.be.equal(
        quadSize * quadSize,
      );
      expect(await LandAsOther.balanceOf(other1)).to.be.equal(0);

      await LandAsOther.transferQuad(other, other1, quadSize, 0, 0, '0x');

      expect(await LandAsOther.balanceOf(other)).to.be.equal(0);
      expect(await LandAsOther.balanceOf(other1)).to.be.equal(
        quadSize * quadSize,
      );
    });

    it('should revert transfer quad when to is a contract and not a ERC721 receiver', async function () {
      const {LandAsOther, TestERC721TokenReceiver, LandAsMinter, other} =
        await loadFixture(setupLand);
      await TestERC721TokenReceiver.returnWrongBytes();
      await LandAsMinter.mintQuad(other, 6, 0, 0, '0x');
      await expect(
        LandAsOther.transferQuad(other, TestERC721TokenReceiver, 6, 0, 0, '0x'),
      )
        .to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidReceiver')
        .withArgs(TestERC721TokenReceiver);
    });

    it('should transfer quads to a contract supporting ERC721 mandatory receiver', async function () {
      const {LandAsMinter, LandAsOther, other, TestERC721TokenReceiver} =
        await loadFixture(setupLand);

      const quadSize = 6;
      await LandAsMinter.mintQuad(other, quadSize, 0, 0, '0x');

      expect(await LandAsOther.balanceOf(other)).to.be.equal(
        quadSize * quadSize,
      );
      expect(await LandAsOther.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        0,
      );

      await LandAsOther.transferQuad(
        other,
        TestERC721TokenReceiver,
        quadSize,
        0,
        0,
        '0x',
      );

      expect(await LandAsOther.balanceOf(other)).to.be.equal(0);
      expect(await LandAsOther.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        quadSize * quadSize,
      );
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
            const {LandContract, LandAsMinter, deployer, other} =
              await loadFixture(setupLand);

            const bytes = '0x3333';
            await LandAsMinter.mintQuad(deployer, size1, 0, 0, bytes);
            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const tokenId = x + y * GRID_SIZE;
                await LandContract.burn(tokenId);
              }
            }
            await expect(
              LandContract.transferQuad(deployer, other, size1, 0, 0, '0x'),
            )
              .to.be.revertedWithCustomError(LandContract, 'NotOwner')
              .withArgs(0, 0);
          }
        }
      });

      it(`should NOT be able to transfer burned 1x1 through parent quad`, async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';

        // to have enough balance after burning a 1x1
        await LandAsMinter.mintQuad(deployer, 3, 3, 0, bytes);

        // let's mint all the 1x1 of a 3x3 quad
        for (let x = 0; x < 3; x++) {
          for (let y = 0; y < 3; y++) {
            await LandAsMinter.mintQuad(deployer, 1, x, y, bytes);
          }
        }

        await LandContract.burn(0);

        // should not be able to transfer a 3x3 quad that has a burnt 1x1
        await expect(LandContract.transferQuad(deployer, other, 3, 0, 0, '0x'))
          .to.be.revertedWithCustomError(LandContract, 'NotOwner')
          .withArgs(0, 0);
      });

      it('transfers of quads of all sizes from self', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {LandContract, LandAsMinter, deployer, other} =
            await loadFixture(setupLand);

          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await LandAsMinter.mintQuad(deployer, size, 0, 0, bytes);

          const num = await LandContract.balanceOf(deployer);
          expect(num).to.equal(plotCount);
          await LandContract.transferQuad(deployer, other, size, 0, 0, bytes);
          const num1 = await LandContract.balanceOf(deployer);
          expect(num1).to.equal(0);
          const num2 = await LandContract.balanceOf(other);
          expect(num2).to.equal(plotCount);
        }
      });
    });

    describe('Burn and transfer full quad', function () {
      it('should revert transfer quad from zero address', async function () {
        const {LandContract, deployer} = await loadFixture(setupLand);

        const bytes = '0x3333';

        await expect(
          LandContract.transferQuad(
            '0x0000000000000000000000000000000000000000',
            deployer,
            1,
            0,
            0,
            bytes,
          ),
        ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
      });

      it('should revert transfer quad to zero address', async function () {
        const {LandContract, deployer} = await loadFixture(setupLand);

        const bytes = '0x3333';

        await expect(
          LandContract.transferQuad(
            deployer,
            '0x0000000000000000000000000000000000000000',
            1,
            0,
            0,
            bytes,
          ),
        ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
      });

      describe('With approval', function () {
        it('should not transfer a burned 1x1 quad', async function () {
          const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
            await loadFixture(setupLand);

          const bytes = '0x3333';

          await LandAsMinter.mintQuad(other, 1, 0, 0, bytes);

          const num = await LandContract.balanceOf(other);
          expect(num).to.equal(1);

          await LandAsOther.setApprovalForAllFor(other, deployer, true);

          await LandAsOther.burn(0);

          await expect(
            LandContract.transferQuad(other, deployer, 1, 0, 0, bytes),
          )
            .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
            .withArgs(0, 0);
        });

        it('should not transfer burned quads', async function () {
          for (let i = 1; i < sizes.length; i++) {
            const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
              await loadFixture(setupLand);

            const bytes = '0x3333';
            const size = sizes[i];
            const plotCount = size * size;

            await LandAsMinter.mintQuad(other, size, 0, 0, bytes);

            const num = await LandContract.balanceOf(other);
            expect(num).to.equal(plotCount);

            await LandAsOther.setApprovalForAllFor(other, deployer, true);

            for (let x = 0; x < size; x++) {
              for (let y = 0; y < size; y++) {
                await LandAsOther.burn(x + y * 408);
              }
            }

            await expect(
              LandContract.transferQuad(other, deployer, size, 0, 0, bytes),
            )
              .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
              .withArgs(0, 0);
          }
        });
      });

      describe('From self', function () {
        it('should not transfer a burned 1x1 quad', async function () {
          const {LandContract, LandAsMinter, deployer, other} =
            await loadFixture(setupLand);

          const bytes = '0x3333';

          await LandAsMinter.mintQuad(deployer, 1, 0, 0, bytes);

          const num = await LandContract.balanceOf(deployer);
          expect(num).to.equal(1);

          await LandContract.burn(0);

          await expect(
            LandContract.transferQuad(deployer, other, 1, 0, 0, bytes),
          )
            .to.be.revertedWithCustomError(LandContract, 'NotOwner')
            .withArgs(0, 0);
        });

        it('should not transfer burned quads', async function () {
          for (let i = 1; i < sizes.length; i++) {
            const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
              await loadFixture(setupLand);

            const bytes = '0x3333';
            const size = sizes[i];
            const plotCount = size * size;

            await LandAsMinter.mintQuad(other, size, 0, 0, bytes);

            const num = await LandContract.balanceOf(other);
            expect(num).to.equal(plotCount);

            await LandAsOther.setApprovalForAllFor(other, deployer, true);

            for (let x = 0; x < size; x++) {
              for (let y = 0; y < size; y++) {
                await LandAsOther.burn(x + y * 408);
              }
            }

            await expect(
              LandAsOther.transferQuad(other, deployer, size, 0, 0, bytes),
            )
              .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
              .withArgs(0, 0);
          }
        });
      });

      it('burnt token cannot be approved', async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';

        await LandAsMinter.mintQuad(deployer, 1, 0, 0, bytes);

        await LandContract.burn(0);

        await expect(LandContract.approveFor(deployer, other, 0)).to.be
          .reverted;

        await expect(LandContract.approve(other, 0)).to.be.reverted;
      });
    });

    describe('Mint and transfer full quad', function () {
      describe('With approval', function () {
        it('transfers quads of all sizes', async function () {
          for (let i = 0; i < sizes.length; i++) {
            const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
              await loadFixture(setupLand);
            const bytes = '0x3333';
            const size = sizes[i];
            const plotCount = size * size;

            await LandAsMinter.mintQuad(other, size, 0, 0, bytes);
            const num = await LandAsMinter.balanceOf(other);
            expect(num).to.equal(plotCount);

            await LandAsOther.setApprovalForAllFor(other, deployer, true);
            await LandContract.transferQuad(other, deployer, size, 0, 0, bytes);
            const num1 = await LandContract.balanceOf(other);
            expect(num1).to.equal(0);
            const num2 = await LandContract.balanceOf(deployer);
            expect(num2).to.equal(plotCount);
          }
        });
      });

      describe('Without approval', function () {
        it('reverts transfers of quads', async function () {
          for (let i = 0; i < sizes.length; i++) {
            const {LandContract, LandAsMinter, deployer, other} =
              await loadFixture(setupLand);

            const bytes = '0x3333';
            const size = sizes[i];
            const plotCount = size * size;

            await LandAsMinter.mintQuad(other, size, 0, 0, bytes);

            const num = await LandContract.balanceOf(other);
            expect(num).to.equal(plotCount);

            await expect(
              LandContract.transferQuad(other, deployer, size, 0, 0, bytes),
            )
              .to.be.revertedWithCustomError(LandContract, 'ERC721InvalidOwner')
              .withArgs(deployer);
          }
        });
      });
    });

    describe(`should NOT be able to transfer quad twice`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {LandContract, deployer, landAdmin, LandAsMinter} =
              await loadFixture(setupLand);
            await LandAsMinter.mintQuad(deployer, outerSize, 0, 0, '0x');
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
            )
              .to.be.revertedWithCustomError(LandContract, 'ERC721InvalidOwner')
              .withArgs(deployer);
          });
        });
      });
    });

    describe('Mint and transfer a smaller quad', function () {
      it('transferring a 1X1 quad from a 3x3', async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 3, 3, 3, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(9);

        await LandContract.transferQuad(deployer, other, 1, 3, 3, bytes);

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(8);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(1);
      });

      it('transferring a 1X1 quad from a 12x12', async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(144);

        await LandContract.transferQuad(deployer, other, 1, 12, 12, bytes);

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(143);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(1);
      });

      it('transferring a 3X3 quad from a 6x6', async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 6, 6, 6, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(36);

        await LandContract.transferQuad(deployer, other, 3, 6, 6, bytes);

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(27);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(9);
      });

      it('transferring a 6X6 quad from a 12x12', async function () {
        const {LandContract, LandAsMinter, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(144);

        await LandContract.transferQuad(deployer, other, 6, 12, 12, bytes);

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(108);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(36);
      });
    });

    describe('Mint and transfer all its smaller quads', function () {
      it('transferring all 1X1 quad from a 3x3', async function () {
        const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 3, 3, 3, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(9);

        for (let x = 3; x < 6; x++) {
          for (let y = 3; y < 6; y++) {
            await LandContract.transferQuad(deployer, other, 1, x, y, bytes);
          }
        }

        //landowner2 will burn all his land
        for (let x = 3; x < 6; x++) {
          for (let y = 3; y < 6; y++) {
            await LandAsOther.burn(x + y * 408);
          }
        }

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(0);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(0);

        await expect(
          LandAsMinter.mintQuad(deployer, 3, 3, 3, bytes),
        ).to.be.revertedWithCustomError(LandAsOther, 'AlreadyMinted');
      });

      it('transferring all 1X1 quad from a 6x6', async function () {
        const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 6, 6, 6, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(36);

        for (let x = 6; x < 12; x++) {
          for (let y = 6; y < 12; y++) {
            await LandContract.transferQuad(deployer, other, 1, x, y, bytes);
          }
        }

        //landowner2 will burn all his land
        for (let x = 6; x < 12; x++) {
          for (let y = 6; y < 12; y++) {
            await LandAsOther.burn(x + y * 408);
          }
        }

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(0);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(0);

        await expect(
          LandAsMinter.mintQuad(deployer, 6, 6, 6, bytes),
        ).to.be.revertedWithCustomError(LandAsOther, 'AlreadyMinted');
      });

      it('transferring all 1X1 quad from a 12x12', async function () {
        const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, 12, 12, 12, bytes);
        const num = await LandContract.balanceOf(deployer);
        expect(num).to.equal(144);

        for (let x = 12; x < 24; x++) {
          for (let y = 12; y < 24; y++) {
            await LandContract.transferQuad(deployer, other, 1, x, y, bytes);
          }
        }

        for (let x = 12; x < 24; x++) {
          for (let y = 12; y < 24; y++) {
            await LandAsOther.burn(x + y * 408);
          }
        }

        const num1 = await LandContract.balanceOf(deployer);

        expect(num1).to.equal(0);

        const num2 = await LandContract.balanceOf(other);

        expect(num2).to.equal(0);

        await expect(
          LandAsMinter.mintQuad(deployer, 12, 12, 12, bytes),
        ).to.be.revertedWithCustomError(LandAsOther, 'AlreadyMinted');
      });
    });
  });

  describe(Contract + ':mintAndTransferQuad', function () {
    describe(`should NOT be able to mint and transfer quad if signer is not the owner of child quad`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {LandAsMinter, deployer, landMinter} =
              await loadFixture(setupLand);
            await LandAsMinter.mintQuad(deployer, innerSize, 0, 0, '0x');
            await expect(
              LandAsMinter.mintAndTransferQuad(
                landMinter,
                outerSize,
                0,
                0,
                '0x',
              ),
            ).to.be.revertedWithCustomError(LandAsMinter, 'AlreadyMinted');
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
            const {LandAsMinter, deployer, landAdmin, landMinter} =
              await loadFixture(setupLand);
            await LandAsMinter.mintQuad(deployer, innerSize, 0, 0, '0x');
            await expect(
              LandAsMinter.mintAndTransferQuad(
                landAdmin,
                outerSize,
                0,
                0,
                '0x',
              ),
            )
              .to.be.revertedWithCustomError(LandAsMinter, 'ERC721InvalidOwner')
              .withArgs(landMinter);
          });
        });
      });
    });

    it('should revert if signer is not landMinter', async function () {
      const {LandAsOther, other} = await loadFixture(setupLand);

      await expect(LandAsOther.mintAndTransferQuad(other, 3, 0, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidOwner')
        .withArgs(other);
    });

    it('should revert if to zero address', async function () {
      const {LandAsAdmin, LandContract, deployer} =
        await loadFixture(setupLand);
      await LandAsAdmin.setMinter(deployer, true);
      await expect(
        LandContract.mintAndTransferQuad(ZeroAddress, 3, 3, 3, '0x'),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
    });

    it('should revert when y is out of bound', async function () {
      const {LandAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsMinter.mintAndTransferQuad(landAdmin, 3, 0, 441, '0x'))
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(3, 0, 441);
    });

    it('should revert when x is out of bound', async function () {
      const {LandAsMinter, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsMinter.mintAndTransferQuad(landAdmin, 3, 441, 0, '0x'))
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(3, 441, 0);
    });

    it('should revert when size is invalid', async function () {
      const {LandAsMinter, landAdmin, TestERC721TokenReceiver} =
        await loadFixture(setupLand);
      const bytes = '0x3333';
      await LandAsMinter.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        LandAsMinter.mintAndTransferQuad(
          TestERC721TokenReceiver,
          9,
          0,
          0,
          '0x',
        ),
      )
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(9, 0, 0);
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {LandAsMinter, TestERC721TokenReceiver, landMinter} =
        await loadFixture(setupLand);
      await TestERC721TokenReceiver.returnWrongBytes();
      await LandAsMinter.mintQuad(landMinter, 3, 0, 0, '0x');
      await expect(
        LandAsMinter.mintAndTransferQuad(
          TestERC721TokenReceiver,
          6,
          0,
          0,
          '0x',
        ),
      )
        .to.be.revertedWithCustomError(LandAsMinter, 'ERC721InvalidReceiver')
        .withArgs(TestERC721TokenReceiver);
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {LandAsMinter, TestERC721TokenReceiver, landMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landMinter, 3, 0, 0, '0x');
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

    it('should not revert when to is ERC721 receiving contract with callback check and coverage', async function () {
      const {LandAsMinter, TestERC721TokenReceiver, landMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landMinter, 6, 0, 0, toUtf8Bytes('MINT'));
      await LandAsMinter.mintQuad(landMinter, 3, 6, 0, toUtf8Bytes('MINT'));
      await LandAsMinter.mintQuad(landMinter, 1, 7, 7, toUtf8Bytes('MINT'));
      const transferredIds = sort([
        ...getQuadIds(6, 0, 0),
        ...getQuadIds(3, 6, 0),
        7 + 7 * 408,
      ]);
      const mintedIds = getQuadIds(12).filter(
        (x) => !transferredIds.includes(x),
      );
      await LandAsMinter.mintAndTransferQuad(
        TestERC721TokenReceiver,
        12,
        0,
        0,
        toUtf8Bytes('MINT_AND_TRANSFER'),
      );
      expect(await LandAsMinter.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        12 * 12,
      );
      const callbacks = await TestERC721TokenReceiver.getBatchCalls();
      const minted = callbacks.find((x) => x.from == ZeroAddress);
      expect(minted.operator).to.be.equal(landMinter);
      expect(toUtf8String(minted.data)).to.be.equal('MINT_AND_TRANSFER');
      expect(sort(minted.ids)).to.be.eql(mintedIds);
      const transferred = callbacks.find((x) => x.from != ZeroAddress);
      expect(transferred.operator).to.be.equal(landMinter);
      expect(transferred.from).to.be.equal(landMinter);
      expect(toUtf8String(transferred.data)).to.be.equal('MINT_AND_TRANSFER');
      expect(sort(transferred.ids)).to.be.eql(transferredIds);
    });

    it('should clear operator for Land when parent Quad is mintAndTransfer', async function () {
      const {
        LandContract,
        LandAsMinter,
        deployer,
        landMinter,
        other: landSaleFeeRecipient,
      } = await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landMinter, 1, 0, 0, '0x');
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

    it('should revert when coordinates are wrong', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(LandAsMinter.mintAndTransferQuad(deployer, 3, 5, 5, '0x'))
        .to.be.revertedWithCustomError(LandAsMinter, 'InvalidCoordinates')
        .withArgs(3, 5, 5);
    });

    it('should mint and transfer quad when a part of quad is already minted', async function () {
      const {LandContract, LandAsMinter, landMinter, other} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(landMinter, 1, 0, 0, '0x');
      expect(await LandContract.balanceOf(other)).to.be.equal(0);
      await LandAsMinter.mintAndTransferQuad(other, 3, 0, 0, '0x');
      expect(await LandContract.balanceOf(other)).to.be.equal(3 * 3);
    });

    it('should transfer an already minted quad using mintAndTransferQuad', async function () {
      const {LandAsOther, LandAsAdmin, other, other1} =
        await loadFixture(setupLand);
      await LandAsAdmin.setMinter(other, true);
      await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
      expect(await LandAsOther.balanceOf(other)).to.be.equal(1);
      expect(await LandAsOther.balanceOf(other1)).to.be.equal(0);

      await LandAsOther.mintAndTransferQuad(other1, 1, 0, 0, '0x');

      expect(await LandAsOther.balanceOf(other)).to.be.equal(0);
      expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
    });
  });

  describe(Contract + ':batchTransferQuad', function () {
    it('should revert when from is zero address', async function () {
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
      ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
    });

    it('should revert when sizes, x, y are not of same length', async function () {
      const {LandContract, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidLength');
    });

    it('should revert when x, y are not of same length', async function () {
      const {LandContract, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6, 6],
          [0, 6],
          [6],
          '0x',
        ),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidLength');
    });

    it('should revert when size, x are not of same length', async function () {
      const {LandContract, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidLength');
    });

    it('should revert when to is a contract and not a ERC721 receiver', async function () {
      const {LandContract, TestERC721TokenReceiver, LandAsMinter, deployer} =
        await loadFixture(setupLand);
      await TestERC721TokenReceiver.returnWrongBytes();
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          TestERC721TokenReceiver,
          [6],
          [0],
          [0],
          '0x',
        ),
      )
        .to.be.revertedWithCustomError(LandContract, 'ERC721InvalidReceiver')
        .withArgs(TestERC721TokenReceiver);
    });

    it('should transfer quads to a contract supporting ERC721 receiver', async function () {
      const {LandAsMinter, LandAsOther, other, TestERC721TokenReceiver} =
        await loadFixture(setupLand);

      const quadSize = 6;
      await LandAsMinter.mintQuad(other, quadSize, 0, 0, '0x');

      expect(await LandAsOther.balanceOf(other)).to.be.equal(
        quadSize * quadSize,
      );
      expect(await LandAsOther.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        0,
      );

      await LandAsOther.batchTransferQuad(
        other,
        TestERC721TokenReceiver,
        [quadSize],
        [0],
        [0],
        '0x',
      );

      expect(await LandAsOther.balanceOf(other)).to.be.equal(0);
      expect(await LandAsOther.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        quadSize * quadSize,
      );
    });

    it('should reverts transfers batch of quads when to is zero address', async function () {
      const {LandContract, LandAsMinter, deployer} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          ZeroAddress,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
    });

    it('should revert when size array and coordinates array are of different length', async function () {
      const {LandContract, LandAsMinter, deployer} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandContract.batchTransferQuad(
          deployer,
          ZeroAddress,
          [6, 3],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWithCustomError(LandContract, 'InvalidAddress');
    });

    it('should revert when signer is not approved', async function () {
      const {LandAsAdmin, LandAsMinter, deployer, landAdmin} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 6, 0, 0, '0x');
      await expect(
        LandAsAdmin.batchTransferQuad(deployer, landAdmin, [6], [0], [0], '0x'),
      )
        .to.be.revertedWithCustomError(LandAsAdmin, 'ERC721InvalidOwner')
        .withArgs(landAdmin);
    });

    it('transfers batch of quads of different sizes', async function () {
      const {LandContract, LandAsMinter, LandAsOther, deployer, other} =
        await loadFixture(setupLand);

      const bytes = '0x3333';
      await LandAsMinter.mintQuad(other, 24, 0, 0, bytes);
      await LandAsMinter.mintQuad(other, 12, 300, 300, bytes);
      await LandAsMinter.mintQuad(other, 6, 30, 30, bytes);
      await LandAsMinter.mintQuad(other, 3, 24, 24, bytes);
      await LandAsOther.setApprovalForAllFor(other, deployer, true);
      await LandContract.batchTransferQuad(
        other,
        deployer,
        [24, 12, 6, 3],
        [0, 300, 30, 24],
        [0, 300, 30, 24],
        bytes,
      );
      const num1 = await LandContract.balanceOf(other);
      expect(num1).to.equal(0);
      const num2 = await LandContract.balanceOf(deployer);
      expect(num2).to.equal(765);
    });

    it('transfers batch of quads of different sizes from self', async function () {
      const {LandContract, LandAsMinter, deployer, other} =
        await loadFixture(setupLand);

      const bytes = '0x3333';
      await LandAsMinter.mintQuad(deployer, 24, 0, 0, bytes);
      await LandAsMinter.mintQuad(deployer, 12, 300, 300, bytes);
      await LandAsMinter.mintQuad(deployer, 6, 30, 30, bytes);
      await LandAsMinter.mintQuad(deployer, 3, 24, 24, bytes);
      await LandContract.batchTransferQuad(
        deployer,
        other,
        [24, 12, 6, 3],
        [0, 300, 30, 24],
        [0, 300, 30, 24],
        bytes,
      );
      const num1 = await LandContract.balanceOf(deployer);
      expect(num1).to.equal(0);
      const num2 = await LandContract.balanceOf(other);
      expect(num2).to.equal(765);
    });
  });
}
