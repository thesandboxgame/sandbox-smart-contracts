import {expect} from '../../chai-setup';
import {ethers, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor, withSnapshot} from '../../utils';
import {setupLand} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';

type User = {
  address: string;
  MockLandWithMint: Contract;
};

const setupTest = withSnapshot(
  ['MockLandWithMint'],
  async (): Promise<{
    MockLandWithMint: Contract;
    landOwners: User[];
  }> => {
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandWithMint});
    return {MockLandWithMint, landOwners};
  }
);

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('MockLandWithMint.sol', function () {
  it('creation', async function () {
    const {MockLandWithMint} = await setupTest();
    expect(await MockLandWithMint.name()).to.be.equal("Sandbox's LANDs");
    expect(await MockLandWithMint.symbol()).to.be.equal('LAND');
  });

  it('cannot set polygon Land Tunnel to zero address', async function () {
    const {deployer} = await setupLand();

    await expect(
      deployer.PolygonLand.setMinter(
        '0x0000000000000000000000000000000000000000',
        true
      )
    ).to.be.revertedWith('PolygonLand: Invalid address');
  });

  describe('Mint and transfer full quad', function () {
    describe('With approval', function () {
      it('transfers quads of all sizes', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await waitFor(
            landOwners[0].MockLandWithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[0].MockLandWithMint.connect(
              ethers.provider.getSigner(landOwners[1].address)
            ).setApprovalForAllFor(
              landOwners[1].address,
              landOwners[0].address,
              true
            )
          );

          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[1].address,
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          );
          const num1 = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num1).to.equal(0);
          const num2 = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[0].address
          );
          expect(num2).to.equal(plotCount);
        }
      });
    });

    describe('Without approval', function () {
      it('reverts transfers of quads', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await waitFor(
            landOwners[0].MockLandWithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await expect(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[1].address,
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
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
            const {landOwners} = await setupTest();
            const bytes = '0x3333';
            await waitFor(
              landOwners[0].MockLandWithMint.mintQuad(
                landOwners[0].address,
                size1,
                0,
                0,
                bytes
              )
            );
            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const tokenId = x + y * GRID_SIZE;
                await landOwners[0].MockLandWithMint.burn(tokenId);
              }
            }
            await expect(
              landOwners[0].MockLandWithMint.transferQuad(
                landOwners[0].address,
                landOwners[1].address,
                size1,
                0,
                0,
                '0x'
              )
            ).to.be.revertedWith('not owner');
          }
        }
      });

      it(`should NOT be able to transfer burned 1x1 through parent quad`, async function () {
        const {landOwners} = await setupTest();
        const bytes = '0x3333';

        // to have enough balance after burning a 1x1
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            3,
            3,
            0,
            bytes
          )
        );

        // let's mint all the 1x1 of a 3x3 quad
        for (let x = 0; x < 3; x++) {
          for (let y = 0; y < 3; y++) {
            await waitFor(
              landOwners[0].MockLandWithMint.mintQuad(
                landOwners[0].address,
                1,
                x,
                y,
                bytes
              )
            );
          }
        }

        await landOwners[0].MockLandWithMint.burn(0);

        // should not be able to transfer a 3x3 quad that has a burnt 1x1
        await expect(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[0].address,
            landOwners[1].address,
            3,
            0,
            0,
            '0x'
          )
        ).to.be.revertedWith('not owner');
      });

      it('transfers of quads of all sizes from self', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await waitFor(
            landOwners[0].MockLandWithMint.mintQuad(
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[0].address
          );
          expect(num).to.equal(plotCount);
          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );
          const num1 = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[0].address
          );
          expect(num1).to.equal(0);
          const num2 = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num2).to.equal(plotCount);
        }
      });
    });
  });

  describe('Burn and transfer full quad', function () {
    it('should revert transfer quad from zero address', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandWithMint.transferQuad(
          '0x0000000000000000000000000000000000000000',
          landOwners[0].address,
          1,
          0,
          0,
          bytes
        )
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert transfer quad to zero address', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          '0x0000000000000000000000000000000000000000',
          1,
          0,
          0,
          bytes
        )
      ).to.be.revertedWith("can't send to zero address");
    });

    describe('With approval', function () {
      it('should not transfer a burned 1x1 quad', async function () {
        const {landOwners} = await setupTest();
        const bytes = '0x3333';

        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[1].address,
            1,
            0,
            0,
            bytes
          )
        );

        const num = await landOwners[0].MockLandWithMint.balanceOf(
          landOwners[1].address
        );
        expect(num).to.equal(1);

        await waitFor(
          landOwners[0].MockLandWithMint.connect(
            ethers.provider.getSigner(landOwners[1].address)
          ).setApprovalForAllFor(
            landOwners[1].address,
            landOwners[0].address,
            true
          )
        );

        await waitFor(
          landOwners[1].MockLandWithMint.burn(
            0x0000000000000000000000000000000000000000000000000000000000000000 +
              (0 + 0 * 408)
          )
        );

        await expect(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[1].address,
            landOwners[0].address,
            1,
            0,
            0,
            bytes
          )
        ).to.be.revertedWith('token does not exist');
      });

      it('should not transfer burned quads', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await waitFor(
            landOwners[0].MockLandWithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[0].MockLandWithMint.connect(
              ethers.provider.getSigner(landOwners[1].address)
            ).setApprovalForAllFor(
              landOwners[1].address,
              landOwners[0].address,
              true
            )
          );

          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              await waitFor(
                landOwners[1].MockLandWithMint.burn(
                  0x0000000000000000000000000000000000000000000000000000000000000000 +
                    (x + y * 408)
                )
              );
            }
          }

          await expect(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[1].address,
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          ).to.be.revertedWith('not owner');
        }
      });
    });

    describe('From self', function () {
      it('should not transfer a burned 1x1 quad', async function () {
        const {landOwners} = await setupTest();
        const bytes = '0x3333';

        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            1,
            0,
            0,
            bytes
          )
        );

        const num = await landOwners[0].MockLandWithMint.balanceOf(
          landOwners[0].address
        );
        expect(num).to.equal(1);

        await waitFor(
          landOwners[0].MockLandWithMint.burn(
            0x0000000000000000000000000000000000000000000000000000000000000000 +
              (0 + 0 * 408)
          )
        );

        await expect(
          landOwners[0].MockLandWithMint.transferQuad(
            landOwners[0].address,
            landOwners[1].address,
            1,
            0,
            0,
            bytes
          )
        ).to.be.revertedWith('token does not exist');
      });

      it('should not transfer burned quads', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          const size = sizes[i];
          const plotCount = size * size;

          await waitFor(
            landOwners[0].MockLandWithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandWithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[1].MockLandWithMint.connect(
              ethers.provider.getSigner(landOwners[1].address)
            ).setApprovalForAllFor(
              landOwners[1].address,
              landOwners[0].address,
              true
            )
          );

          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              await waitFor(
                landOwners[1].MockLandWithMint.burn(
                  0x0000000000000000000000000000000000000000000000000000000000000000 +
                    (x + y * 408)
                )
              );
            }
          }

          await expect(
            landOwners[1].MockLandWithMint.transferQuad(
              landOwners[1].address,
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          ).to.be.revertedWith('not owner');
        }
      });
    });

    it('burnt token cannot be approved', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await landOwners[0].MockLandWithMint.mintQuad(
        landOwners[0].address,
        1,
        0,
        0,
        bytes
      );

      await landOwners[0].MockLandWithMint.burn(0);

      await expect(
        landOwners[0].MockLandWithMint.approveFor(
          landOwners[0].address,
          landOwners[1].address,
          0
        )
      ).to.be.reverted;

      await expect(
        landOwners[0].MockLandWithMint.approve(landOwners[1].address, 0)
      ).to.be.reverted;
    });
  });

  describe('mint and check URIs', function () {
    for (const size of [1, 3, 6, 12, 24]) {
      it(`mint and check URI ${size}`, async function () {
        const GRID_SIZE = 408;
        const {landOwners} = await setupTest();
        const bytes = '0x3333';
        await waitFor(
          landOwners[0].MockLandWithMint.mintQuad(
            landOwners[0].address,
            size,
            size,
            size,
            bytes
          )
        );
        const tokenId = size + size * GRID_SIZE;
        expect(
          await landOwners[0].MockLandWithMint.tokenURI(tokenId)
        ).to.be.equal(
          `https://api.sandbox.game/lands/${tokenId}/metadata.json`
        );
      });
    }

    it(`reverts check URI for non existing token`, async function () {
      const GRID_SIZE = 408;
      const {landOwners} = await setupTest();
      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(
        landOwners[0].MockLandWithMint.tokenURI(tokenId)
      ).to.be.revertedWith('Id does not exist');
    });
  });
  it('supported interfaces', async function () {
    const {MockLandWithMint} = await setupTest();
    expect(await MockLandWithMint.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await MockLandWithMint.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await MockLandWithMint.supportsInterface('0x5b5e139f')).to.be.true;
  });
  describe('Mint and transfer a smaller quad', function () {
    it('transferring a 1X1 quad from a 3x3', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(9);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          3,
          3,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(8);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(1);
    });

    it('transferring a 1X1 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          12,
          12,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(143);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(1);
    });

    it('transferring a 3X3 quad from a 6x6', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          6,
          6,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(36);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          3,
          6,
          6,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(27);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(9);
    });

    it('transferring a 6X6 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      await waitFor(
        landOwners[0].MockLandWithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          6,
          12,
          12,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(108);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(36);
    });
  });

  describe('Mint and transfer all its smaller quads', function () {
    it('transferring all 1X1 quad from a 3x3', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(9);

      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              x,
              y,
              bytes
            )
          );
        }
      }

      //landowner2 will burn all his land
      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await waitFor(
            landOwners[1].MockLandWithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      ).to.be.revertedWith('Already minted');
    });

    it('transferring all 1X1 quad from a 6x6', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          6,
          6,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(36);

      for (let x = 6; x < 12; x++) {
        for (let y = 6; y < 12; y++) {
          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              x,
              y,
              bytes
            )
          );
        }
      }

      //landowner2 will burn all his land
      for (let x = 6; x < 12; x++) {
        for (let y = 6; y < 12; y++) {
          await waitFor(
            landOwners[1].MockLandWithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          6,
          6,
          bytes
        )
      ).to.be.revertedWith('Already minted');
    });

    it('transferring all 1X1 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      for (let x = 12; x < 24; x++) {
        for (let y = 12; y < 24; y++) {
          await waitFor(
            landOwners[0].MockLandWithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              1,
              x,
              y,
              bytes
            )
          );
        }
      }

      for (let x = 12; x < 24; x++) {
        for (let y = 12; y < 24; y++) {
          await waitFor(
            landOwners[1].MockLandWithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      ).to.be.revertedWith('Already minted');
    });
  });

  describe('transfer batch', function () {
    it('transfers batch of quads of different sizes', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          3,
          24,
          24,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.connect(
          ethers.provider.getSigner(landOwners[1].address)
        ).setApprovalForAllFor(
          landOwners[1].address,
          landOwners[0].address,
          true
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[1].address,
          landOwners[0].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num2).to.equal(765);
    });

    it('transfers batch of quads of different sizes from self', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          3,
          24,
          24,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(765);
    });

    it('reverts transfers batch of quads to address zero', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await expect(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          '0x0000000000000000000000000000000000000000',
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      ).to.be.revertedWith("can't send to zero address");
    });

    it('reverts transfers batch of quads from address zero', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await expect(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          '0x0000000000000000000000000000000000000000',
          landOwners[1].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      ).to.be.revertedWith('from is zero address');
    });

    it('reverts transfers batch of quads for invalid parameters', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await expect(
        landOwners[0].MockLandWithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 12, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      ).to.be.revertedWith('invalid data');
    });
  });

  describe('Testing transferFrom', function () {
    it('Transfer 1x1 without approval', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          1,
          0,
          0,
          bytes
        )
      );

      await expect(
        landOwners[0].MockLandWithMint.transferFrom(
          landOwners[1].address,
          landOwners[0].address,
          0
        )
      ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
    });

    it('Transfer 1x1 with approval', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[1].address,
          1,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.connect(
          ethers.provider.getSigner(landOwners[1].address)
        ).approve(landOwners[0].address, 0)
      );

      await waitFor(
        landOwners[0].MockLandWithMint.transferFrom(
          landOwners[1].address,
          landOwners[0].address,
          0
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num2).to.equal(1);
    });
  });

  describe('testing batchTransferFrom', function () {
    it('Mint 12x12 and transfer all internals 1x1s from it', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          12,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandWithMint.batchTransferFrom(
          landOwners[0].address,
          landOwners[1].address,
          [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            419,
            418,
            417,
            416,
            415,
            414,
            413,
            412,
            411,
            410,
            409,
            408,
            816,
            817,
            818,
            819,
            820,
            821,
            822,
            823,
            824,
            825,
            826,
            827,
            1235,
            1234,
            1233,
            1232,
            1231,
            1230,
            1229,
            1228,
            1227,
            1226,
            1225,
            1224,
            1632,
            1633,
            1634,
            1635,
            1636,
            1637,
            1638,
            1639,
            1640,
            1641,
            1642,
            1643,
            2051,
            2050,
            2049,
            2048,
            2047,
            2046,
            2045,
            2044,
            2043,
            2042,
            2041,
            2040,
            2448,
            2449,
            2450,
            2451,
            2452,
            2453,
            2454,
            2455,
            2456,
            2457,
            2458,
            2459,
            2867,
            2866,
            2865,
            2864,
            2863,
            2862,
            2861,
            2860,
            2859,
            2858,
            2857,
            2856,
            3264,
            3265,
            3266,
            3267,
            3268,
            3269,
            3270,
            3271,
            3272,
            3273,
            3274,
            3275,
            3683,
            3682,
            3681,
            3680,
            3679,
            3678,
            3677,
            3676,
            3675,
            3674,
            3673,
            3672,
            4080,
            4081,
            4082,
            4083,
            4084,
            4085,
            4086,
            4087,
            4088,
            4089,
            4090,
            4091,
            4499,
            4498,
            4497,
            4496,
            4495,
            4494,
            4493,
            4492,
            4491,
            4490,
            4489,
            4488,
          ],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandWithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(144);
    });
  });

  describe('Meta transactions', function () {
    describe('transferQuad without approval', function () {
      it('should not transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {
            deployer,
            Land,
            landMinter,
            users,
            MockLandTunnel,
            PolygonLand,
            MockPolygonLandTunnel,
            trustedForwarder,
          } = await setupLand();

          const landHolder = users[0];
          const landReceiver = users[1];
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnel.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
            .be.true;

          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
          await landHolder.MockLandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          );

          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          const {to, data} = await PolygonLand.populateTransaction[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ](landHolder.address, landReceiver.address, size, x, y, bytes);

          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landReceiver.address,
            '10000000'
          );

          expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
            0
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
        }
      });
    });

    describe('transferQuad with approval', function () {
      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {
            deployer,
            Land,
            landMinter,
            users,
            MockLandTunnel,
            PolygonLand,
            MockPolygonLandTunnel,
            trustedForwarder,
          } = await setupLand();

          const landHolder = users[0];
          const landReceiver = users[1];
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );
          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnel.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
            .be.true;

          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
          await landHolder.MockLandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          const {to, data} = await PolygonLand.populateTransaction[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ](landHolder.address, landReceiver.address, size, x, y, bytes);

          await PolygonLand.connect(
            ethers.provider.getSigner(landHolder.address)
          ).setApprovalForAll(landReceiver.address, true);

          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '10000000'
          );

          expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
            plotCount
          );
          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            0
          );
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
              const {
                deployer,
                Land,
                landMinter,
                users,
                MockLandTunnel,
                PolygonLand,
                MockPolygonLandTunnel,
              } = await setupLand();

              const landHolder = users[0];
              const landReceiver = users[1];
              const landReceiver2 = users[2];
              const x = 0;
              const y = 0;
              const bytes = '0x00';
              const plotCount = size1 * size1;

              // Mint LAND on L1
              await landMinter.Land.mintQuad(
                landHolder.address,
                size1,
                x,
                y,
                bytes
              );
              expect(await Land.balanceOf(landHolder.address)).to.be.equal(
                plotCount
              );

              // Set Mock PolygonLandTunnel in PolygonLand
              await deployer.PolygonLand.setMinter(
                MockPolygonLandTunnel.address,
                true
              );
              expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address))
                .to.be.true;

              // Transfer to L1 Tunnel
              await landHolder.Land.setApprovalForAll(
                MockLandTunnel.address,
                true
              );
              await landHolder.MockLandTunnel.batchTransferQuadToL2(
                landHolder.address,
                [size1],
                [x],
                [y],
                bytes
              );

              expect(await landHolder.PolygonLand.ownerOf(0)).to.be.equal(
                landHolder.address
              );

              await landHolder.PolygonLand.transferQuad(
                landHolder.address,
                landReceiver.address,
                size2,
                x,
                y,
                bytes
              );

              await expect(
                landHolder.PolygonLand.transferQuad(
                  landHolder.address,
                  landReceiver2.address,
                  size2,
                  x,
                  y,
                  bytes
                )
              ).to.be.revertedWith('not owner');
            }
          }
        }
      });

      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {
            deployer,
            Land,
            landMinter,
            users,
            MockLandTunnel,
            PolygonLand,
            MockPolygonLandTunnel,
            trustedForwarder,
          } = await setupLand();

          const landHolder = users[0];
          const landReceiver = users[1];
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnel.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
            .be.true;

          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
          await landHolder.MockLandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          );

          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          const {to, data} = await PolygonLand.populateTransaction[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ](landHolder.address, landReceiver.address, size, x, y, bytes);

          await sendMetaTx(
            to,
            trustedForwarder,
            data,
            landHolder.address,
            '10000000'
          );

          expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
            0
          );
          expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
            plotCount
          );
        }
      });
    });

    describe('Burn and transfer full quad', function () {
      it('should revert transfer of 1x1 quad after burn', async function () {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        const id =
          0x0000000000000000000000000000000000000000000000000000000000000000 +
          (x + y * 408);
        const {to, data} = await PolygonLand.populateTransaction[
          'burn(uint256)'
        ](id);

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        await expect(
          landHolder.PolygonLand.transferQuad(
            landHolder.address,
            landReceiver.address,
            size,
            x,
            y,
            bytes
          )
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
            const {
              deployer,
              Land,
              landMinter,
              users,
              MockLandTunnel,
              PolygonLand,
              MockPolygonLandTunnel,
              trustedForwarder,
            } = await setupLand();

            const landHolder = users[0];
            const landReceiver = users[1];
            const x = 0;
            const y = 0;
            const bytes = '0x00';
            const plotCount = size1 * size1;

            // Mint LAND on L1
            await landMinter.Land.mintQuad(
              landHolder.address,
              size1,
              x,
              y,
              bytes
            );
            expect(await Land.balanceOf(landHolder.address)).to.be.equal(
              plotCount
            );

            // Set Mock PolygonLandTunnel in PolygonLand
            await deployer.PolygonLand.setMinter(
              MockPolygonLandTunnel.address,
              true
            );
            expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
              .be.true;

            // Transfer to L1 Tunnel
            await landHolder.Land.setApprovalForAll(
              MockLandTunnel.address,
              true
            );
            await landHolder.MockLandTunnel.batchTransferQuadToL2(
              landHolder.address,
              [size1],
              [x],
              [y],
              bytes
            );

            expect(await landHolder.PolygonLand.ownerOf(0)).to.be.equal(
              landHolder.address
            );

            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const id =
                  0x0000000000000000000000000000000000000000000000000000000000000000 +
                  (x + y * GRID_SIZE);
                const {to, data} = await PolygonLand.populateTransaction[
                  'burn(uint256)'
                ](id);

                await sendMetaTx(
                  to,
                  trustedForwarder,
                  data,
                  landHolder.address,
                  '10000000'
                );
              }
            }

            await expect(landHolder.PolygonLand.ownerOf(0)).to.be.revertedWith(
              'NONEXISTANT_TOKEN'
            );

            await expect(
              landHolder.PolygonLand.transferQuad(
                landHolder.address,
                landReceiver.address,
                size1,
                x,
                y,
                bytes
              )
            ).to.be.revertedWith('not owner');

            //check override
            await expect(landHolder.PolygonLand.ownerOf(0)).to.be.revertedWith(
              'NONEXISTANT_TOKEN'
            );
          }
        }
      });

      it('should revert transfer of any size quad after burn', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {
            deployer,
            Land,
            landMinter,
            users,
            MockLandTunnel,
            PolygonLand,
            MockPolygonLandTunnel,
            trustedForwarder,
          } = await setupLand();

          const landHolder = users[0];
          const landReceiver = users[1];
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
          expect(await Land.balanceOf(landHolder.address)).to.be.equal(
            plotCount
          );

          // Set Mock PolygonLandTunnel in PolygonLand
          await deployer.PolygonLand.setMinter(
            MockPolygonLandTunnel.address,
            true
          );
          expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to
            .be.true;

          // Transfer to L1 Tunnel
          await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
          await landHolder.MockLandTunnel.batchTransferQuadToL2(
            landHolder.address,
            [size],
            [x],
            [y],
            bytes
          );

          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              const id =
                0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408);
              const {to, data} = await PolygonLand.populateTransaction[
                'burn(uint256)'
              ](id);

              await sendMetaTx(
                to,
                trustedForwarder,
                data,
                landHolder.address,
                '10000000'
              );
            }
          }

          await expect(
            landHolder.PolygonLand.transferQuad(
              landHolder.address,
              landReceiver.address,
              size,
              x,
              y,
              bytes
            )
          ).to.be.revertedWith('not owner');
        }
      });
    });

    describe('batchTransferQuad', function () {
      it('should batch transfer 1x1 quads', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();

        const landHolder = users[0];
        const landReceiver = users[1];
        const size = 1;
        const bytes = '0x00';

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, 0, 0, bytes);
        await landMinter.Land.mintQuad(landHolder.address, size, 0, 1, bytes);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size],
          [0, 0],
          [0, 1],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(2);

        const {to, data} = await PolygonLand.populateTransaction[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ](
          landHolder.address,
          landReceiver.address,
          [size, size],
          [0, 0],
          [0, 1],
          bytes
        );

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          2
        );
      });

      it('should batch transfer quads of different sizes', async function () {
        const {
          deployer,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
          trustedForwarder,
        } = await setupLand();
        const bytes = '0x3333';
        const landHolder = users[0];
        const landReceiver = users[1];

        await waitFor(
          landMinter.Land.mintQuad(landHolder.address, 12, 144, 144, bytes)
        );
        await waitFor(
          landMinter.Land.mintQuad(landHolder.address, 6, 36, 36, bytes)
        );
        await waitFor(
          landMinter.Land.mintQuad(landHolder.address, 3, 9, 9, bytes)
        );
        await waitFor(
          landMinter.Land.mintQuad(landHolder.address, 1, 0, 0, bytes)
        );

        expect(await landHolder.Land.balanceOf(landHolder.address)).to.be.equal(
          190
        );

        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [12, 6, 3, 1],
          [144, 36, 9, 0],
          [144, 36, 9, 0],
          bytes
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
          190
        );

        const {to, data} = await PolygonLand.populateTransaction[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ](
          landHolder.address,
          landReceiver.address,
          [12, 6, 3, 1],
          [144, 36, 9, 0],
          [144, 36, 9, 0],
          bytes
        );

        await sendMetaTx(
          to,
          trustedForwarder,
          data,
          landHolder.address,
          '10000000'
        );

        expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(0);
        expect(await PolygonLand.balanceOf(landReceiver.address)).to.be.equal(
          190
        );
      });
    });
  });

  describe('Getters', function () {
    it('returns the width of the grid', async function () {
      const {PolygonLand} = await setupLand();
      expect(await PolygonLand.width()).to.be.equal(408);
    });

    it('returns the height of the grid', async function () {
      const {PolygonLand} = await setupLand();
      expect(await PolygonLand.height()).to.be.equal(408);
    });

    it('should fetch x and y values of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();

        const landHolder = users[0];
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        const id =
          0x0000000000000000000000000000000000000000000000000000000000000000 +
          (x + y * 408);

        expect(await PolygonLand.getX(id)).to.be.equal(x);
        expect(await PolygonLand.getY(id)).to.be.equal(y);
      }
    });

    it('cannot fetch x and y values of given non existing quad id', async function () {
      const {MockLandWithMint} = await setupTest();

      const id =
        0x0000000000000000000000000000000000000000000000000000000000000000 +
        (3 + 6 * 408);

      await expect(MockLandWithMint.getX(id)).to.be.revertedWith(
        'token does not exist'
      );
      await expect(MockLandWithMint.getY(id)).to.be.revertedWith(
        'token does not exist'
      );
    });

    it('should fetch owner of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {
          deployer,
          Land,
          landMinter,
          users,
          MockLandTunnel,
          PolygonLand,
          MockPolygonLandTunnel,
        } = await setupLand();

        const landHolder = users[0];
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await landMinter.Land.mintQuad(landHolder.address, size, x, y, bytes);
        expect(await Land.balanceOf(landHolder.address)).to.be.equal(plotCount);

        // Set Mock PolygonLandTunnel in PolygonLand
        await deployer.PolygonLand.setMinter(
          MockPolygonLandTunnel.address,
          true
        );
        expect(await PolygonLand.isMinter(MockPolygonLandTunnel.address)).to.be
          .true;

        // Transfer to L1 Tunnel
        await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
        await landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size],
          [x],
          [y],
          bytes
        );

        const id =
          0x0000000000000000000000000000000000000000000000000000000000000000 +
          (x + y * 408);

        expect(await PolygonLand.ownerOf(id)).to.be.equal(landHolder.address);
      }
    });

    it('checks if a quad is valid & exists', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandWithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      for (const size of sizes) {
        expect(await landOwners[0].MockLandWithMint.exists(size, 0, 0)).to.be
          .true;
      }

      await expect(landOwners[0].MockLandWithMint.exists(4, 0, 0)).to.be
        .reverted;

      await expect(landOwners[0].MockLandWithMint.exists(1, 500, 0)).to.be
        .reverted;

      await expect(landOwners[0].MockLandWithMint.exists(1, 0, 500)).to.be
        .reverted;
    });
  });
});
