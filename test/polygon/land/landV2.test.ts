import {expect} from '../../chai-setup';
import {
  ethers,
  getUnnamedAccounts,
  getNamedAccounts,
  deployments,
} from 'hardhat';
import {Contract} from 'ethers';
import {setupUsers, waitFor, withSnapshot} from '../../utils';
import {setupLand, getId} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';
import {zeroAddress, setupOperatorFilter} from '../../land/fixtures';

const {deploy} = deployments;

type User = {
  address: string;
  MockLandV2WithMint: Contract;
};

const setupTest = withSnapshot(
  ['MockLandV2WithMint'],
  async (): Promise<{
    MockLandV2WithMint: Contract;
    landOwners: User[];
    TestERC1155ERC721TokenReceiver: Contract;
  }> => {
    const {deployer} = await getNamedAccounts();
    const MockLandV2WithMint = await ethers.getContract('MockLandV2WithMint');

    await deploy('TestERC1155ERC721TokenReceiver', {
      from: deployer,
      contract: 'TestERC1155ERC721TokenReceiver',
      args: [MockLandV2WithMint.address, true, true, true, true, false],
      log: true,
    });

    const TestERC1155ERC721TokenReceiver = await ethers.getContract(
      'TestERC1155ERC721TokenReceiver'
    );
    const unnamedAccounts = await getUnnamedAccounts();
    const landOwners = await setupUsers(unnamedAccounts, {MockLandV2WithMint});
    return {MockLandV2WithMint, landOwners, TestERC1155ERC721TokenReceiver};
  }
);

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('MockLandV2WithMint.sol', function () {
  it('creation', async function () {
    const {MockLandV2WithMint} = await setupTest();
    expect(await MockLandV2WithMint.name()).to.be.equal("Sandbox's LANDs");
    expect(await MockLandV2WithMint.symbol()).to.be.equal('LAND');
  });

  it('Only admin can set minter', async function () {
    const {MockLandV2WithMint, landOwners} = await setupTest();
    await expect(
      MockLandV2WithMint.setMinter(landOwners[0].address, true)
    ).to.be.revertedWith('only admin is allowed to add minters');
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
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[0].MockLandV2WithMint.connect(
              ethers.provider.getSigner(landOwners[1].address)
            ).setApprovalForAllFor(
              landOwners[1].address,
              landOwners[0].address,
              true
            )
          );

          await waitFor(
            landOwners[0].MockLandV2WithMint.transferQuad(
              landOwners[1].address,
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          );
          const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[1].address
          );
          expect(num1).to.equal(0);
          const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
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
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await expect(
            landOwners[0].MockLandV2WithMint.transferQuad(
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
              landOwners[0].MockLandV2WithMint.mintQuad(
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
                await landOwners[0].MockLandV2WithMint.burn(tokenId);
              }
            }
            await expect(
              landOwners[0].MockLandV2WithMint.transferQuad(
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
          landOwners[0].MockLandV2WithMint.mintQuad(
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
              landOwners[0].MockLandV2WithMint.mintQuad(
                landOwners[0].address,
                1,
                x,
                y,
                bytes
              )
            );
          }
        }

        await landOwners[0].MockLandV2WithMint.burn(0);

        // should not be able to transfer a 3x3 quad that has a burnt 1x1
        await expect(
          landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[0].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[0].address
          );
          expect(num).to.equal(plotCount);
          await waitFor(
            landOwners[0].MockLandV2WithMint.transferQuad(
              landOwners[0].address,
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );
          const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[0].address
          );
          expect(num1).to.equal(0);
          const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
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
        landOwners[0].MockLandV2WithMint.transferQuad(
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
        landOwners[0].MockLandV2WithMint.transferQuad(
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
          landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[1].address,
            1,
            0,
            0,
            bytes
          )
        );

        const num = await landOwners[0].MockLandV2WithMint.balanceOf(
          landOwners[1].address
        );
        expect(num).to.equal(1);

        await waitFor(
          landOwners[0].MockLandV2WithMint.connect(
            ethers.provider.getSigner(landOwners[1].address)
          ).setApprovalForAllFor(
            landOwners[1].address,
            landOwners[0].address,
            true
          )
        );

        await waitFor(
          landOwners[1].MockLandV2WithMint.burn(
            0x0000000000000000000000000000000000000000000000000000000000000000 +
              (0 + 0 * 408)
          )
        );

        await expect(
          landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[0].MockLandV2WithMint.connect(
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
                landOwners[1].MockLandV2WithMint.burn(
                  0x0000000000000000000000000000000000000000000000000000000000000000 +
                    (x + y * 408)
                )
              );
            }
          }

          await expect(
            landOwners[0].MockLandV2WithMint.transferQuad(
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
          landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[0].address,
            1,
            0,
            0,
            bytes
          )
        );

        const num = await landOwners[0].MockLandV2WithMint.balanceOf(
          landOwners[0].address
        );
        expect(num).to.equal(1);

        await waitFor(
          landOwners[0].MockLandV2WithMint.burn(
            0x0000000000000000000000000000000000000000000000000000000000000000 +
              (0 + 0 * 408)
          )
        );

        await expect(
          landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[1].address,
              size,
              0,
              0,
              bytes
            )
          );

          const num = await landOwners[0].MockLandV2WithMint.balanceOf(
            landOwners[1].address
          );
          expect(num).to.equal(plotCount);

          await waitFor(
            landOwners[1].MockLandV2WithMint.connect(
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
                landOwners[1].MockLandV2WithMint.burn(
                  0x0000000000000000000000000000000000000000000000000000000000000000 +
                    (x + y * 408)
                )
              );
            }
          }

          await expect(
            landOwners[1].MockLandV2WithMint.transferQuad(
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

      await landOwners[0].MockLandV2WithMint.mintQuad(
        landOwners[0].address,
        1,
        0,
        0,
        bytes
      );

      await landOwners[0].MockLandV2WithMint.burn(0);

      await expect(
        landOwners[0].MockLandV2WithMint.approveFor(
          landOwners[0].address,
          landOwners[1].address,
          0
        )
      ).to.be.reverted;

      await expect(
        landOwners[0].MockLandV2WithMint.approve(landOwners[1].address, 0)
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
          landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[0].address,
            size,
            size,
            size,
            bytes
          )
        );
        const tokenId = size + size * GRID_SIZE;
        expect(
          await landOwners[0].MockLandV2WithMint.tokenURI(tokenId)
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
        landOwners[0].MockLandV2WithMint.tokenURI(tokenId)
      ).to.be.revertedWith('Id does not exist');
    });
  });

  describe('testing mintQuad', function () {
    it('should revert if to address zero', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandV2WithMint.mintQuad(zeroAddress, 3, 3, 3, bytes)
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert if signer is not minter', async function () {
      const {users} = await setupLand();

      await expect(
        users[0].PolygonLand.mintQuad(users[0].address, 3, 0, 0, '0x')
      ).to.be.revertedWith('!AUTHORIZED');
    });

    it('should revert for wrong size', async function () {
      const {landOwners} = await setupTest();
      await expect(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          9,
          0,
          0,
          '0x'
        )
      ).to.be.revertedWith('Invalid size');
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 <= size1) return;
        it(`should NOT be able to mint child ${size1}x${size1} quad if parent ${size2}x${size2} quad is already minted`, async function () {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          await landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[0].address,
            size2,
            0,
            0,
            bytes
          );

          await expect(
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[0].address,
              size1,
              0,
              0,
              bytes
            )
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to mint ${size1}x${size1} quad if child ${size2}x${size2} quad is already minted`, async function () {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          await landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[0].address,
            size2,
            0,
            0,
            bytes
          );

          await expect(
            landOwners[0].MockLandV2WithMint.mintQuad(
              landOwners[0].address,
              size1,
              0,
              0,
              bytes
            )
          ).to.be.revertedWith('Already minted');
        });
      });
    });
  });

  describe('testing mintAndTransferQuad', function () {
    it('should revert if signer is not minter', async function () {
      const {users} = await setupLand();

      await expect(
        users[0].PolygonLand.mintAndTransferQuad(
          users[0].address,
          3,
          0,
          0,
          '0x'
        )
      ).to.be.revertedWith('!AUTHORIZED');
    });

    it('should revert for transfer if to address zero', async function () {
      const {deployer} = await setupLand();
      const bytes = '0x3333';
      await deployer.PolygonLand.setMinter(deployer.address, true);
      await expect(
        deployer.PolygonLand.mintAndTransferQuad(zeroAddress, 3, 3, 3, bytes)
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert for mint if to address zero', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandV2WithMint.mintAndTransferQuad(
          zeroAddress,
          3,
          3,
          3,
          bytes
        )
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert for mint if co-ordinates of Quad are invalid', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          3,
          4,
          4,
          bytes
        )
      ).to.be.revertedWith('Invalid coordinates');
    });

    it('should revert for mint if co-ordinates are out of bound', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await expect(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          3,
          411,
          411,
          bytes
        )
      ).to.be.revertedWith('Out of bounds');
    });

    it('should revert for mint if size is out of bound', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await expect(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          25,
          0,
          0,
          bytes
        )
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is non ERC721 receiving contract', async function () {
      const {
        MockLandV2WithMint,
        TestERC1155ERC721TokenReceiver,
      } = await setupTest();
      const {deployer, landAdmin} = await getNamedAccounts();
      const bytes = '0x3333';
      await TestERC1155ERC721TokenReceiver.connect(
        await ethers.getSigner(deployer)
      ).returnWrongBytes();
      await MockLandV2WithMint.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        MockLandV2WithMint.connect(
          ethers.provider.getSigner(landAdmin)
        ).mintAndTransferQuad(
          TestERC1155ERC721TokenReceiver.address,
          6,
          0,
          0,
          '0x'
        )
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {
        MockLandV2WithMint,
        TestERC1155ERC721TokenReceiver,
      } = await setupTest();
      const {landAdmin} = await getNamedAccounts();
      const bytes = '0x3333';
      await MockLandV2WithMint.mintQuad(landAdmin, 3, 0, 0, bytes);
      await MockLandV2WithMint.connect(
        ethers.provider.getSigner(landAdmin)
      ).mintAndTransferQuad(
        TestERC1155ERC721TokenReceiver.address,
        6,
        0,
        0,
        '0x'
      );
      const id = getId(3, 0, 0);
      expect(await MockLandV2WithMint.ownerOf(id)).to.be.equal(
        TestERC1155ERC721TokenReceiver.address
      );
    });

    it('should revert when size is invalid', async function () {
      const {
        MockLandV2WithMint,
        TestERC1155ERC721TokenReceiver,
      } = await setupTest();
      const {landAdmin} = await getNamedAccounts();
      const bytes = '0x3333';
      await MockLandV2WithMint.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        MockLandV2WithMint.connect(
          ethers.provider.getSigner(landAdmin)
        ).mintAndTransferQuad(
          TestERC1155ERC721TokenReceiver.address,
          9,
          0,
          0,
          '0x'
        )
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is zero address', async function () {
      const {MockLandV2WithMint} = await setupTest();
      const {landAdmin} = await getNamedAccounts();
      await expect(
        MockLandV2WithMint.connect(
          ethers.provider.getSigner(landAdmin)
        ).mintAndTransferQuad(zeroAddress, 9, 0, 0, '0x')
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when sender is not the owner of child quad', async function () {
      const {
        MockLandV2WithMint,
        TestERC1155ERC721TokenReceiver,
      } = await setupTest();
      const {deployer, landAdmin} = await getNamedAccounts();
      const bytes = '0x3333';
      await TestERC1155ERC721TokenReceiver.connect(
        await ethers.getSigner(deployer)
      ).returnWrongBytes();
      await MockLandV2WithMint.mintQuad(landAdmin, 3, 0, 0, bytes);
      await expect(
        MockLandV2WithMint.connect(
          ethers.provider.getSigner(deployer)
        ).transferQuad(
          deployer,
          TestERC1155ERC721TokenReceiver.address,
          6,
          0,
          0,
          '0x'
        )
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should revert approveFor for zeroAddress spender', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[0].polygonLandV2.approveFor(
          zeroAddress,
          mockMarketPlace3.address,
          id
        )
      ).to.be.revertedWith('PolygonLandV2: ZERO_ADDRESS_SENDER');
    });

    it('should revert approveFor for unauthorized user', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[0].polygonLandV2.approveFor(
          users[1].address,
          mockMarketPlace3.address,
          id
        )
      ).to.be.revertedWith('PolygonLandV2: UNAUTHORIZED_APPROVAL');
    });

    it('should revert approveFor zero owner of tokenId', async function () {
      const {mockMarketPlace3, users} = await setupOperatorFilter();
      const GRID_SIZE = 408;
      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(
        users[0].polygonLandV2.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          tokenId
        )
      ).to.be.revertedWith('PolygonLandV2: NONEXISTENT_TOKEN');
    });

    it('should revert approve for zero address owner of token', async function () {
      const {mockMarketPlace3, users} = await setupOperatorFilter();
      const GRID_SIZE = 408;
      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(
        users[0].polygonLandV2.approve(mockMarketPlace3.address, tokenId)
      ).to.be.revertedWith('PolygonLandV2: NONEXISTENT_TOKEN');
    });

    it('should revert approve for zeroAddress spender', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        users[1].polygonLandV2.approve(mockMarketPlace3.address, id)
      ).to.be.revertedWith('PolygonLandV2: UNAUTHORIZED_APPROVAL');
    });

    it('should revert setApprovalForAllFor for zeroAddress', async function () {
      const {mockMarketPlace3, users} = await setupOperatorFilter();
      await expect(
        users[0].polygonLandV2.setApprovalForAllFor(
          zeroAddress,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('PolygonLandV2: Invalid sender address');
    });

    it('should revert setApprovalForAllFor for unauthorized users', async function () {
      const {mockMarketPlace3, users} = await setupOperatorFilter();
      await expect(
        users[0].polygonLandV2.setApprovalForAllFor(
          mockMarketPlace3.address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('PolygonLandV2: UNAUTHORIZED_APPROVE_FOR_ALL');
    });

    it('should revert approvalFor for same sender and spender', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      const {deployer} = await getNamedAccounts();
      await polygonLandV2
        .connect(await ethers.getSigner(deployer))
        .mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await expect(
        polygonLandV2
          .connect(await ethers.getSigner(deployer))
          .approveFor(deployer, deployer, id)
      ).to.be.revertedWith('PolygonLandV2: OWNER_NOT_SENDER');
    });

    it('subscription can not be zero address', async function () {
      const {polygonLandV2} = await setupOperatorFilter();
      const {deployer} = await getNamedAccounts();
      await expect(
        polygonLandV2
          .connect(await ethers.getSigner(deployer))
          .register(zeroAddress, true)
      ).to.be.revertedWith("PolygonLandV2: subscription can't be zero address");
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to mint and transfer ${size1}x${size1} quad if signer is not the owner of child ${size2}x${size2} quad`, async function () {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          await landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[1].address,
            size2,
            0,
            0,
            bytes
          );

          await expect(
            landOwners[0].MockLandV2WithMint.mintAndTransferQuad(
              landOwners[0].address,
              size1,
              0,
              0,
              bytes
            )
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 <= size1) return;
        it(`should NOT be able to transfer child ${size1}x${size1} quad if signer is not the owner of  parent ${size2}x${size2} quad `, async function () {
          const {landOwners} = await setupTest();
          const bytes = '0x3333';
          await landOwners[0].MockLandV2WithMint.mintQuad(
            landOwners[1].address,
            size2,
            0,
            0,
            bytes
          );
          await expect(
            landOwners[0].MockLandV2WithMint.mintAndTransferQuad(
              landOwners[0].address,
              size1,
              0,
              0,
              bytes
            )
          ).to.be.reverted;
        });
      });
    });
  });

  it('supported interfaces', async function () {
    const {MockLandV2WithMint} = await setupTest();
    expect(await MockLandV2WithMint.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await MockLandV2WithMint.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await MockLandV2WithMint.supportsInterface('0x5b5e139f')).to.be.true;
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {MockLandV2WithMint} = await setupTest();

    await expect(MockLandV2WithMint.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id'
    );
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((quadSize) => {
    it('should return correct ownerOf ${quadSize}x${quadSize} quad  minted', async function () {
      const {MockLandV2WithMint, landOwners} = await setupTest();
      const bytes = '0x3333';
      await MockLandV2WithMint.mintQuad(
        landOwners[0].address,
        quadSize,
        quadSize,
        quadSize,
        bytes
      );
      let layer;
      if (quadSize == 1) {
        layer = 1;
      } else if (quadSize == 3) {
        layer = 2;
      } else if (quadSize == 6) {
        layer = 3;
      } else if (quadSize == 12) {
        layer = 4;
      } else {
        layer = 5;
      }
      expect(
        await MockLandV2WithMint.ownerOf(getId(layer, quadSize, quadSize))
      ).to.be.equal(landOwners[0].address);
    });
  });

  describe('Mint and transfer a smaller quad', function () {
    it('transferring a 1X1 quad from a 3x3', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(9);

      await waitFor(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          3,
          3,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(8);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(1);
    });

    it('transferring a 1X1 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      await waitFor(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          1,
          12,
          12,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(143);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(1);
    });

    it('transferring a 3X3 quad from a 6x6', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          6,
          6,
          6,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(36);

      await waitFor(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          3,
          6,
          6,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(27);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(9);
    });

    it('transferring a 6X6 quad from a 12x12', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      await waitFor(
        landOwners[0].MockLandV2WithMint.transferQuad(
          landOwners[0].address,
          landOwners[1].address,
          6,
          12,
          12,
          bytes
        )
      );

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(108);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          3,
          3,
          3,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(9);

      for (let x = 3; x < 6; x++) {
        for (let y = 3; y < 6; y++) {
          await waitFor(
            landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[1].MockLandV2WithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandV2WithMint.mintQuad(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          6,
          6,
          6,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(36);

      for (let x = 6; x < 12; x++) {
        for (let y = 6; y < 12; y++) {
          await waitFor(
            landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[1].MockLandV2WithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandV2WithMint.mintQuad(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          12,
          12,
          12,
          bytes
        )
      );
      const num = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num).to.equal(144);

      for (let x = 12; x < 24; x++) {
        for (let y = 12; y < 24; y++) {
          await waitFor(
            landOwners[0].MockLandV2WithMint.transferQuad(
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
            landOwners[1].MockLandV2WithMint.burn(
              0x0000000000000000000000000000000000000000000000000000000000000000 +
                (x + y * 408)
            )
          );
        }
      }

      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );

      expect(num1).to.equal(0);

      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );

      expect(num2).to.equal(0);

      await expect(
        landOwners[0].MockLandV2WithMint.mintQuad(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          3,
          24,
          24,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandV2WithMint.connect(
          ethers.provider.getSigner(landOwners[1].address)
        ).setApprovalForAllFor(
          landOwners[1].address,
          landOwners[0].address,
          true
        )
      );

      await waitFor(
        landOwners[0].MockLandV2WithMint.batchTransferQuad(
          landOwners[1].address,
          landOwners[0].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num2).to.equal(765);
    });

    it('transfers batch of quads of different sizes from self', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          12,
          300,
          300,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          6,
          30,
          30,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          3,
          24,
          24,
          bytes
        )
      );
      await waitFor(
        landOwners[0].MockLandV2WithMint.batchTransferQuad(
          landOwners[0].address,
          landOwners[1].address,
          [24, 12, 6, 3],
          [0, 300, 30, 24],
          [0, 300, 30, 24],
          bytes
        )
      );
      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );
      expect(num2).to.equal(765);
    });

    it('reverts transfers batch of quads to address zero', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';
      await expect(
        landOwners[0].MockLandV2WithMint.batchTransferQuad(
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
        landOwners[0].MockLandV2WithMint.batchTransferQuad(
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
        landOwners[0].MockLandV2WithMint.batchTransferQuad(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          1,
          0,
          0,
          bytes
        )
      );

      await expect(
        landOwners[0].MockLandV2WithMint.transferFrom(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[1].address,
          1,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandV2WithMint.connect(
          ethers.provider.getSigner(landOwners[1].address)
        ).approve(landOwners[0].address, 0)
      );

      await waitFor(
        landOwners[0].MockLandV2WithMint.transferFrom(
          landOwners[1].address,
          landOwners[0].address,
          0
        )
      );
      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[1].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
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
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          12,
          0,
          0,
          bytes
        )
      );

      await waitFor(
        landOwners[0].MockLandV2WithMint.batchTransferFrom(
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
      const num1 = await landOwners[0].MockLandV2WithMint.balanceOf(
        landOwners[0].address
      );
      expect(num1).to.equal(0);
      const num2 = await landOwners[0].MockLandV2WithMint.balanceOf(
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

    it('should revert when fetching owner of given quad id with wrong size', async function () {
      const {PolygonLand} = await setupLand();
      const id = getId(9, 0, 0);
      await expect(PolygonLand.ownerOf(id)).to.be.revertedWith(
        'Invalid token id'
      );
    });

    it('should revert when fetching owner of given quad id with invalid token', async function () {
      const {PolygonLand} = await setupLand();
      const id = getId(3, 2, 2);
      await expect(PolygonLand.ownerOf(id)).to.be.revertedWith(
        'Invalid token id'
      );
    });

    it('should return owner for quad id', async function () {
      const {landOwners} = await setupTest();

      await landOwners[0].MockLandV2WithMint.mintQuad(
        landOwners[0].address,
        24,
        0,
        0,
        '0x'
      );
      const id = getId(5, 0, 0);
      expect(await landOwners[0].MockLandV2WithMint.ownerOf(id)).to.be.equal(
        landOwners[0].address
      );
    });

    it('checks if a quad is valid & exists', async function () {
      const {landOwners} = await setupTest();
      const bytes = '0x3333';

      await waitFor(
        landOwners[0].MockLandV2WithMint.mintQuad(
          landOwners[0].address,
          24,
          0,
          0,
          bytes
        )
      );

      for (const size of sizes) {
        expect(await landOwners[0].MockLandV2WithMint.exists(size, 0, 0)).to.be
          .true;
      }

      await expect(landOwners[0].MockLandV2WithMint.exists(4, 0, 0)).to.be
        .reverted;

      await expect(landOwners[0].MockLandV2WithMint.exists(1, 500, 0)).to.be
        .reverted;

      await expect(landOwners[0].MockLandV2WithMint.exists(1, 0, 500)).to.be
        .reverted;

      await expect(landOwners[0].MockLandV2WithMint.exists(3, 0, 500)).to.be
        .reverted;

      await expect(landOwners[0].MockLandV2WithMint.exists(3, 500, 0)).to.be
        .reverted;
    });
  });

  describe('OperatorFilterer', function () {
    it('should be registered', async function () {
      const {
        operatorFilterRegistry,
        polygonLandV2,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(polygonLandV2.address)
      ).to.be.equal(true);
    });

    it('operator filterer registrant would not register on the operator filter registry if not set on it', async function () {
      const {
        operatorFilterRegistry,
        deployer,
        upgradeAdmin,
      } = await setupOperatorFilter();
      const OperatorFilterSubscription = await deploy(
        'MockOperatorFilterSubscription',
        {
          from: deployer,
          contract: 'OperatorFilterSubscription',
          proxy: {
            owner: upgradeAdmin,
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
              methodName: 'initialize',
              args: [],
            },
            upgradeIndex: 0,
          },
          log: true,
          skipIfAlreadyDeployed: true,
        }
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          OperatorFilterSubscription.address
        )
      ).to.be.equal(false);
    });

    it('would not register on the operator filter registry if not set on the Land', async function () {
      const {
        operatorFilterRegistry,
        PolygonLandV2WithRegistryNotSet,
      } = await setupOperatorFilter();
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        zeroAddress,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          PolygonLandV2WithRegistryNotSet.address
        )
      ).to.be.equal(false);
    });

    it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
      const {
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        PolygonLandV2WithRegistryNotSet,
      } = await setupOperatorFilter();
      await PolygonLandV2WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistryAsOwner.address
      );
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        zeroAddress,
        false
      );
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      expect(
        await operatorFilterRegistryAsOwner.subscriptionOf(
          PolygonLandV2WithRegistryNotSet.address
        )
      ).to.be.equal(zeroAddress);
    });

    it('should could be registered through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        PolygonLandV2WithRegistryNotSet,
      } = await setupOperatorFilter();

      await PolygonLandV2WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address
      );
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        zeroAddress,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          PolygonLandV2WithRegistryNotSet.address
        )
      ).to.be.equal(true);
    });

    it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        PolygonLandV2WithRegistryNotSet,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await PolygonLandV2WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address
      );
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        false
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          PolygonLandV2WithRegistryNotSet.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(
          PolygonLandV2WithRegistryNotSet.address
        )
      ).to.be.equal(zeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          PolygonLandV2WithRegistryNotSet.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
      const {
        PolygonLandV2WithRegistryNotSet,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await PolygonLandV2WithRegistryNotSet.mintQuad(
        users[0].address,
        1,
        0,
        0,
        '0x'
      );
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      await users[0].PolygonLandV2WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await PolygonLandV2WithRegistryNotSet.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
      const {
        PolygonLandV2WithRegistryNotSet,
        users,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await setupOperatorFilter();

      await PolygonLandV2WithRegistryNotSet.mintQuad(
        users[0].address,
        1,
        0,
        0,
        '0x'
      );
      const id = getId(1, 0, 0);
      await PolygonLandV2WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true
      );

      await users[0].PolygonLandV2WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await PolygonLandV2WithRegistryNotSet.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        PolygonLandV2WithRegistryNotSet.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await PolygonLandV2WithRegistryNotSet.ownerOf(id)).to.be.equal(
        users[1].address
      );
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        polygonLandV2,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(polygonLandV2.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be able to transfer land if from is the owner of token', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2.transferFrom(users[0].address, users[1].address, id);

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe transfer land if from is the owner of token', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        users[1].address,
        Number(id)
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2['safeTransferFrom(address,address,uint256,bytes)'](
        users[0].address,
        users[1].address,
        id,
        '0x'
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await polygonLandV2.safeBatchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        '0x'
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(2);
    });
    it('should be able to batch transfer Land if from is the owner of token', async function () {
      const {polygonLandV2, users} = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await polygonLandV2.batchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        '0x'
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(2);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2.transferFrom(
        users[0].address,
        mockMarketPlace1.address,
        id
      );

      expect(
        await polygonLandV2.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(1);
    });

    it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        mockMarketPlace1.address,
        id
      );

      expect(
        await polygonLandV2.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await polygonLandV2['safeTransferFrom(address,address,uint256,bytes)'](
        users[0].address,
        mockMarketPlace1.address,
        id,
        '0x'
      );

      expect(
        await polygonLandV2.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await polygonLandV2.safeBatchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x'
      );

      expect(
        await polygonLandV2.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(2);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await polygonLandV2.batchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x'
      );

      expect(
        await polygonLandV2.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(2);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, polygonLandV2} = await setupOperatorFilter();
      await expect(polygonLandV2.approve(mockMarketPlace1.address, 1)).to.be
        .reverted;
    });

    it('it should not approveFor blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].polygonLandV2.approveFor(
          users[0].address,
          mockMarketPlace1.address,
          1
        )
      ).to.be.reverted;
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].polygonLandV2.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should not setApprovalForAllFor blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();
      await expect(
        users[0].polygonLandV2.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.approve(mockMarketPlace3.address, id);
      expect(await polygonLandV2.getApproved(id)).to.be.equal(
        mockMarketPlace3.address
      );
    });

    it('it should approveFor non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await users[0].polygonLandV2.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id
      );
      expect(await polygonLandV2.getApproved(id)).to.be.equal(
        mockMarketPlace3.address
      );
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      users[0].polygonLandV2.setApprovalForAll(mockMarketPlace3.address, true);
      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should setApprovalForAllFor non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      users[0].polygonLandV2.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );
      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].polygonLandV2.approve(mockMarketPlace3.address, id1);

      expect(await polygonLandV2.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].polygonLandV2.approve(mockMarketPlace3.address, id2)
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].polygonLandV2.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id1
      );

      expect(await polygonLandV2.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].polygonLandV2.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          id2
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await users[0].polygonLandV2.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].polygonLandV2.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      users[0].polygonLandV2.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[1].polygonLandV2.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].polygonLandV2.approve(mockMarketPlace3.address, id1);

      expect(await polygonLandV2.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].polygonLandV2.approve(mockMarketPlace3.address, id2)
      ).to.be.revertedWith('Codehash is filtered');
    });
    it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await users[0].polygonLandV2.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        id1
      );

      expect(await polygonLandV2.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        users[0].polygonLandV2.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          id2
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].polygonLandV2.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].polygonLandV2.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      users[0].polygonLandV2.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].polygonLandV2.setApprovalForAllFor(
          users[1].address,
          mockMarketPlace3.address,
          true
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        users[0].polygonLandV2.approve(mockMarketPlace1.address, id)
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonLandV2.approve(mockMarketPlace1.address, id);

      expect(await polygonLandV2.getApproved(id)).to.be.equal(
        mockMarketPlace1.address
      );
    });

    it('it should be able to approveFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        users[0].polygonLandV2.approveFor(
          users[0].address,
          mockMarketPlace1.address,
          id
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonLandV2.approveFor(
        users[0].address,
        mockMarketPlace1.address,
        id
      );

      expect(await polygonLandV2.getApproved(id)).to.be.equal(
        mockMarketPlace1.address
      );
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonLandV2.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonLandV2.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonLandV2.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await users[0].polygonLandV2.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace1.address,
        true
      );

      expect(
        await polygonLandV2.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](polygonLandV2.address, users[0].address, users[1].address, id1, '0x');

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](polygonLandV2.address, users[0].address, users[1].address, id, '0x');

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](polygonLandV2.address, users[0].address, users[1].address, id1, '0x');

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id2,
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );
      await mockMarketPlace1[
        'transferLand(address,address,address,uint256,bytes)'
      ](polygonLandV2.address, users[0].address, users[1].address, id, '0x');

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should not be able to transfer(without data) through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer(without data) through non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        polygonLandV2.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });

    it('it should be not be able to transfer(without data) through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        polygonLandV2.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await users[1].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          polygonLandV2.address,
          users[1].address,
          users[0].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to transfer(without data) through market places after their codeHash is blackListed', async function () {
      const {
        mockMarketPlace3,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        polygonLandV2.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await users[1].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          polygonLandV2.address,
          users[1].address,
          users[0].address,
          id
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer(without data) through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        polygonLandV2,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      await polygonLandV2.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await users[0].polygonLandV2.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          polygonLandV2.address,
          users[0].address,
          users[1].address,
          id
        )
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false
      );

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        polygonLandV2.address,
        users[0].address,
        users[1].address,
        id
      );

      expect(await polygonLandV2.balanceOf(users[1].address)).to.be.equal(1);
    });
  });
});
