import {expect} from 'chai';
import {getId, setupLand, setupLand, zeroAddress} from './fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('LandV3', function () {
  describe('LandBaseTokenV2', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to transfer ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
          const {
            landAsDeployer: contract,
            deployer,
            landAdmin,
            mintQuad,
          } = await loadFixture(setupLand);
          await mintQuad(deployer.address, size1, 0, 0);
          await contract.transferQuad(deployer, landAdmin, size2, 0, 0, '0x');
          await expect(
            contract.transferQuad(
              deployer.address,
              landAdmin.address,
              size2,
              0,
              0,
              '0x',
            ),
          ).to.be.reverted;
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should return true for ${size2}x${size2} quad minited inside a ${size1}x${size1} quad`, async function () {
          const {
            landAsDeployer: contract,
            deployer,
            mintQuad,
          } = await loadFixture(setupLand);
          // minting the quad of size1 *size1 at x size1 and y size1
          await mintQuad(deployer.address, size1, size1, size1);
          expect(await contract.exists(size1, size1, size1)).to.be.equal(true);
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`should return false for ${quadSize}x${quadSize} quad not minited`, async function () {
        const {landAsDeployer: contract} = await loadFixture(setupLand);
        expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
          false,
        );
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`should return true for ${quadSize}x${quadSize} quad  minited`, async function () {
        const {
          landAsDeployer: contract,
          deployer,
          mintQuad,
        } = await loadFixture(setupLand);

        await mintQuad(deployer.address, quadSize, quadSize, quadSize);
        expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
          true,
        );
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      if (quadSize == 1) return;
      it(`should revert for invalid coordinates for size ${quadSize}`, async function () {
        const {landAsDeployer: contract} = await loadFixture(setupLand);

        await expect(
          contract.exists(quadSize, quadSize + 1, quadSize + 1),
        ).to.be.revertedWith('Invalid x coordinate');
      });
    });

    it(`should revert for invalid size`, async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      await expect(landAsDeployer.exists(5, 5, 5)).to.be.revertedWith(
        'Invalid size',
      );
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to transfer burned ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
          const {
            landAsDeployer: contract,
            deployer,
            landAdmin,
            mintQuad,
          } = await loadFixture(setupLand);
          await mintQuad(deployer.address, size1, 0, 0);
          for (let x = 0; x < size2; x++) {
            for (let y = 0; y < size2; y++) {
              const tokenId = x + y * GRID_SIZE;
              await contract.burn(tokenId);
            }
          }
          await expect(
            contract.transferQuad(
              deployer.address,
              landAdmin.address,
              size1,
              0,
              0,
              '0x',
            ),
          ).to.be.revertedWith('not owner');
        });
      });
    });

    it('Burnt land cannot be minted again', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        mintQuad,
      } = await loadFixture(setupLand);
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;

      await mintQuad(deployer.address, 3, x, y);

      await contract.burn(tokenId);

      await expect(mintQuad(deployer.address, 1, x, y)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should not be a minter by default', async function () {
      const {landAsDeployer, deployer} = await loadFixture(setupLand);
      expect(await landAsDeployer.isMinter(deployer)).to.be.false;
    });

    it('should be an admin to set minter', async function () {
      const {landAsDeployer: contract, deployer} = await loadFixture(setupLand);
      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'only admin allowed',
      );
      expect(await contract.isMinter(deployer)).to.be.false;
    });

    it('should enable a minter', async function () {
      const {
        landAsDeployer: landAsDeployer,
        landAsAdmin: contract,
        deployer,
      } = await loadFixture(setupLand);
      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
      expect(await landAsDeployer.isMinter(deployer)).to.be.true;
    });

    it('should disable a minter', async function () {
      const {
        landAsDeployer: landAsDeployer,
        landAsAdmin: contract,
        deployer,
      } = await loadFixture(setupLand);

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;

      expect(await landAsDeployer.isMinter(deployer)).to.be.false;
    });

    it('should not accept address 0 as minter', async function () {
      const {landAsDeployer: landAsDeployer, landAsAdmin: contract} =
        await loadFixture(setupLand);

      await expect(contract.setMinter(ZeroAddress, false)).to.be.revertedWith(
        'address 0 not allowed',
      );

      await expect(contract.setMinter(ZeroAddress, true)).to.be.revertedWith(
        'address 0 not allowed',
      );

      expect(await landAsDeployer.isMinter(ZeroAddress)).to.be.false;
    });

    it('should only be able to disable an enabled minter', async function () {
      const {
        landAsDeployer: landAsDeployer,
        deployer,
        landAsAdmin: contract,
      } = await loadFixture(setupLand);
      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;

      expect(await landAsDeployer.isMinter(deployer)).to.be.true;

      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'the status should be different',
      );
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled minter', async function () {
      const {
        landAsDeployer: landAsDeployer,
        deployer,
        landAsAdmin: contract,
      } = await loadFixture(setupLand);

      expect(await landAsDeployer.isMinter(deployer)).to.be.false;

      await expect(contract.setMinter(deployer, false)).to.be.revertedWith(
        'the status should be different',
      );
      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
    });

    it('should return the grid height', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const height = await landAsDeployer.height();
      expect(height).to.be.equal(408);
    });

    it('should return the grid width', async function () {
      const {landAsDeployer} = await loadFixture(setupLand);
      const width = await landAsDeployer.width();
      expect(width).to.be.equal(408);
    });

    it('should return quad coordinates', async function () {
      const {landAsDeployer, mintQuad, deployer} = await loadFixture(setupLand);
      const id = getId(4, 0, 0);
      await mintQuad(deployer.address, 12, 0, 0);
      const x = await landAsDeployer.getX(id);
      expect(x).to.be.equal(0);
      const y = await landAsDeployer.getY(id);
      expect(y).to.be.equal(0);
    });

    it('should revert when to address is zero', async function () {
      const {mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(zeroAddress, 3, 0, 0)).to.be.revertedWith(
        'to is zero address',
      );
    });

    it('should revert when size wrong', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 9, 0, 0)).to.be.revertedWith(
        'Invalid size',
      );
    });

    it('should revert when to x coordinates are wrong', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 3, 5, 5)).to.be.revertedWith(
        'Invalid x coordinate',
      );
    });

    it('should revert when to y coordinates are wrong', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 3, 0, 5)).to.be.revertedWith(
        'Invalid y coordinate',
      );
    });

    it('should revert when x quad is out of bounds (mintQuad)', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 3, 441, 0)).to.be.revertedWith(
        'x out of bounds',
      );
    });

    it('should revert when y quad is out of bounds (mintQuad)', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 3, 0, 441)).to.be.revertedWith(
        'y out of bounds',
      );
    });

    it('should revert when to signer is not minter', async function () {
      const {landAsDeployer: contract, deployer} = await loadFixture(setupLand);
      await expect(
        contract.mintQuad(deployer.address, 3, 0, 0, '0x'),
      ).to.be.revertedWith('Only a minter can mint');
    });

    it('should revert when parent quad is already minted', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer.address, 24, 0, 0);
      await expect(mintQuad(deployer.address, 3, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when minted with zero size', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await expect(mintQuad(deployer.address, 0, 0, 0)).to.be.revertedWith(
        'size cannot be zero',
      );
    });

    it('should revert when child quad is already minted', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer.address, 3, 0, 0);
      await expect(mintQuad(deployer.address, 6, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when  1x1 Land token is already minted', async function () {
      const {deployer, mintQuad} = await loadFixture(setupLand);
      await mintQuad(deployer.address, 1, 0, 0);
      await expect(mintQuad(deployer.address, 6, 0, 0)).to.be.revertedWith(
        'Already minted',
      );
    });

    it('should revert when from is zero address', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(zeroAddress, landAdmin, [6], [0], [0], '0x'),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when sizes, x, y are not of same length', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith("sizes's and x's length different");
    });

    it('should revert when x, y are not of same length', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(
          deployer,
          landAdmin,
          [6, 6],
          [0, 6],
          [6],
          '0x',
        ),
      ).to.be.revertedWith("x's and y's length different");
    });

    it('should revert when size, x are not of same length', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(
          deployer,
          landAdmin,
          [6],
          [0, 6],
          [0, 6],
          '0x',
        ),
      ).to.be.revertedWith("sizes's and x's length different");
    });

    it('should revert when to is a contract and not a ERC721 receiver', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        mintQuad,
        TestERC1155ERC721TokenReceiver,
      } = await loadFixture(setupLand);
      await TestERC1155ERC721TokenReceiver.returnWrongBytes();

      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(
          deployer,
          await TestERC1155ERC721TokenReceiver.getAddress(),
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith('batch transfer rejected');
    });

    it('should revert when to is zero address', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(deployer, zeroAddress, [6], [0], [0], '0x'),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when size array and coordinates array are of different length', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.batchTransferQuad(
          deployer,
          zeroAddress,
          [6, 3],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should revert when signer is not approved', async function () {
      const {landAsAdmin, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        landAsAdmin.batchTransferQuad(
          deployer.address,
          landAdmin.address,
          [6],
          [0],
          [0],
          '0x',
        ),
      ).to.be.revertedWith('not authorized');
    });

    it('should revert if signer is not approved', async function () {
      const {landAsAdmin, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        landAsAdmin.transferQuad(
          deployer.address,
          landAdmin.address,
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('not authorized to transferQuad');
    });

    it('should revert for invalid coordinates', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.transferQuad(
          deployer.address,
          landAdmin.address,
          6,
          1,
          1,
          '0x',
        ),
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
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.transferQuad(
          deployer.address,
          landAdmin.address,
          3,
          441,
          0,
          '0x',
        ),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when transfer quad when y is out of bounds (transferQuad)', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.transferQuad(
          deployer.address,
          landAdmin.address,
          3,
          0,
          441,
          '0x',
        ),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert for invalid size', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, 6, 0, 0);
      await expect(
        contract.transferQuad(
          deployer.address,
          landAdmin.address,
          9,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('Invalid size');
    });

    it('should revert when to is zeroAddress', async function () {
      const {landAsAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.mintAndTransferQuad(zeroAddress, 3, 0, 0, '0x'),
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
      const {landAsMinter, TestERC1155ERC721TokenReceiver, minter, mintQuad} =
        await loadFixture(setupLand);
      await TestERC1155ERC721TokenReceiver.returnWrongBytes();
      await mintQuad(minter.address, 3, 0, 0);
      await expect(
        landAsMinter.mintAndTransferQuad(
          await TestERC1155ERC721TokenReceiver.getAddress(),
          6,
          0,
          0,
          '0x',
        ),
      ).to.be.revertedWith('batch transfer rejected');
    });

    it('should not revert when to is ERC721 receiving contract', async function () {
      const {landAsMinter, minter, TestERC1155ERC721TokenReceiver, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(minter.address, 3, 0, 0);
      await landAsMinter.mintAndTransferQuad(
        await TestERC1155ERC721TokenReceiver.getAddress(),
        6,
        0,
        0,
        '0x',
      );
      expect(
        await landAsMinter.balanceOf(
          await TestERC1155ERC721TokenReceiver.getAddress(),
        ),
      ).to.be.equal(36);
    });

    it('should revert when to is zeroAddress (transferQuad)', async function () {
      const {landAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin.address, 3, 0, 0);
      await expect(
        landAsAdmin.transferQuad(landAdmin, zeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith("can't send to zero address");
    });

    it('should clear operator for Land when parent Quad is mintAndTransfer', async function () {
      const {landAsDeployer, landAsMinter, minter, deployer, other, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(minter.address, 1, 0, 0);
      const id = getId(1, 0, 0);
      await landAsMinter.approve(deployer, id);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(minter.address);
      expect(await landAsDeployer.getApproved(id)).to.be.equal(
        deployer.address,
      );
      await landAsMinter.mintAndTransferQuad(other.address, 3, 0, 0, '0x');
      expect(await landAsDeployer.getApproved(id)).to.be.equal(zeroAddress);
      expect(await landAsDeployer.ownerOf(id)).to.be.equal(other.address);
    });

    it('should revert when from is zeroAddress (transferQuad)', async function () {
      const {
        landAsDeployer: contract,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(landAdmin.address, 3, 0, 0);
      await expect(
        contract.transferQuad(zeroAddress, landAdmin, 3, 0, 0, '0x'),
      ).to.be.revertedWith('from is zero address');
    });

    it('should revert when operator is not approved (transferQuad)', async function () {
      const {
        landAsDeployer: contract,
        deployer,
        landAdmin,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(landAdmin.address, 3, 0, 0);
      await expect(
        contract.transferQuad(landAdmin, deployer, 3, 0, 0, '0x'),
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
      await mintQuad(deployer.address, 3, 0, 0);
      await expect(
        landAsAdmin.transferQuad(landAdmin, deployer, 6, 0, 0, '0x'),
      ).to.be.revertedWith('not owner of child Quad');
    });

    it('should not revert when from is owner of all subQuads of Quad (transferQuad)', async function () {
      const {landAsDeployer, deployer, landAdmin, mintQuad} =
        await loadFixture(setupLand);
      await mintQuad(deployer.address, 3, 0, 0);
      await mintQuad(deployer.address, 3, 0, 3);
      await mintQuad(deployer.address, 3, 3, 0);
      await mintQuad(deployer.address, 3, 3, 3);
      await landAsDeployer.transferQuad(
        deployer.address,
        landAdmin.address,
        6,
        0,
        0,
        '0x',
      );
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
      await mintQuad(deployer.address, 1, 1, 1);
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
      await mintQuad(deployer.address, 1, 0, 0);
      const id = getId(1, 0, 0);
      expect(await landAsDeployer.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/0/metadata.json',
      );
    });

    it('it should revert approveFor for unauthorized sender', async function () {
      const {mocklandAsOther, other, deployer} = await loadFixture(setupLand);
      await mocklandAsOther.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 0, 0);
      await expect(
        mocklandAsOther.approveFor(deployer, other.address, id),
      ).to.be.revertedWith('not authorized to approve');
    });

    it('it should revert for setApprovalForAllFor of zero address', async function () {
      const {landAsDeployer, other} = await loadFixture(setupLand);
      await expect(
        landAsDeployer.setApprovalForAllFor(zeroAddress, other.address, true),
      ).to.be.revertedWith('Invalid sender address');
    });

    it('should revert approveFor of operator is zeroAddress', async function () {
      const {mocklandAsMinter, landAsOther, other, other1} =
        await loadFixture(setupLand);
      await mocklandAsMinter.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 0, 0);
      await expect(
        landAsOther.approveFor(zeroAddress, other1.address, id),
      ).to.be.revertedWith('sender is zero address');
    });

    it('it should revert setApprovalForAllFor for unauthorized sender', async function () {
      const {landAsOther, other1, deployer} = await loadFixture(setupLand);
      await expect(
        landAsOther.setApprovalForAllFor(deployer, other1.address, true),
      ).to.be.revertedWith('not authorized');
    });

    it('it should revert Approval for invalid token', async function () {
      const {other, deployer, mockLandAsDeployer} =
        await loadFixture(setupLand);
      await mockLandAsDeployer.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 2, 2);
      await expect(mockLandAsDeployer.approve(deployer, id)).to.be.revertedWith(
        'token does not exist',
      );
    });

    it('should revert approveFor for unauthorized sender', async function () {
      const {other, mockLandAsDeployer} = await loadFixture(setupLand);
      await mockLandAsDeployer.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 0, 0);
      await expect(
        mockLandAsDeployer.approveFor(other.address, other.address, id),
      ).to.be.revertedWith('not authorized to approve');
    });

    it('should revert for transfer when to is zeroAddress(mintAndTransferQuad)', async function () {
      const {landAsAdmin, landAdmin, mintQuad} = await loadFixture(setupLand);
      await mintQuad(landAdmin.address, 6, 0, 0);

      await expect(
        landAsAdmin.mintAndTransferQuad(zeroAddress, 3, 0, 0, '0x'),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert when signer is not a minter', async function () {
      const {landAsDeployer: contract, deployer} = await loadFixture(setupLand);
      await expect(
        contract.mintAndTransferQuad(deployer, 3, 0, 0, '0x'),
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

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((quadSize) => {
    it(`should mint ${quadSize}x${quadSize} quad `, async function () {
      const {
        landAsDeployer: contract,
        deployer,
        mintQuad,
      } = await loadFixture(setupLand);
      await mintQuad(deployer.address, quadSize, quadSize, quadSize);
      expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
        true,
      );
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint child ${size1}x${size1} quad if parent ${size2}x${size2} quad is already minted`, async function () {
        const {deployer, mintQuad} = await loadFixture(setupLand);
        await mintQuad(deployer.address, size1, 0, 0);

        await expect(
          mintQuad(deployer.address, size2, 0, 0),
        ).to.be.revertedWith('Already minted');
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint parent ${size1}x${size1} quad if child ${size2}x${size2} quad is already minted`, async function () {
        const {deployer, mintQuad} = await loadFixture(setupLand);
        await mintQuad(deployer.address, size2, 0, 0);

        await expect(
          mintQuad(deployer.address, size1, 0, 0),
        ).to.be.revertedWith('Already minted');
      });
    });
  });
  it('should return correct ownerOf 1*1 quad minted', async function () {
    const {
      landAsDeployer: contract,
      deployer,
      mintQuad,
    } = await loadFixture(setupLand);
    await mintQuad(deployer.address, 1, 1, 1);
    expect(await contract.ownerOf(getId(1, 1, 1))).to.be.equal(
      deployer.address,
    );
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {landAsDeployer} = await loadFixture(setupLand);

    await expect(landAsDeployer.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id',
    );
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to mint and transfer  ${size1}x${size1} quad if signer is not the owner of child ${size2}x${size2} quad`, async function () {
        const {landAsMinter, deployer, landAdmin, mintQuad} =
          await loadFixture(setupLand);

        await mintQuad(deployer.address, size2, 0, 0);

        await expect(
          landAsMinter.mintAndTransferQuad(landAdmin, size1, 0, 0, '0x'),
        ).to.be.revertedWith('Already minted');
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 <= size1) return;
      it(`should NOT be able to transfer  ${size1}x${size1} quad if signer is not the owner of parent ${size2}x${size2} quad`, async function () {
        const {landAsAdmin, deployer, landAdmin, mintQuad} =
          await loadFixture(setupLand);
        await mintQuad(deployer.address, size2, 0, 0);

        await expect(
          landAsAdmin.mintAndTransferQuad(landAdmin, size1, 0, 0, '0x'),
        ).to.be.reverted;
      });
    });
  });

  describe('MetaTransactionReceiverV2', function () {
    it('should not be a meta transaction processor', async function () {
      const {landAsDeployer, sandContract} = await loadFixture(setupLand);

      expect(
        await landAsDeployer.isMetaTransactionProcessor(
          await sandContract.getAddress(),
        ),
      ).to.be.false;
    });

    it('should enable a meta transaction processor', async function () {
      const {landAsAdmin, sandContract} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(
          await sandContract.getAddress(),
          true,
        ),
      ).not.to.be.reverted;

      expect(
        await landAsAdmin.isMetaTransactionProcessor(
          await sandContract.getAddress(),
        ),
      ).to.be.true;
    });

    it('should disable a meta transaction processor', async function () {
      const {landAsAdmin, sandContract} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(
          await sandContract.getAddress(),
          false,
        ),
      ).not.to.be.reverted;

      expect(
        await landAsAdmin.isMetaTransactionProcessor(
          await sandContract.getAddress(),
        ),
      ).to.be.false;
    });

    it('should only be a contract as meta transaction processor', async function () {
      const {landAsAdmin} = await loadFixture(setupLand);
      await expect(
        landAsAdmin.setMetaTransactionProcessor(ZeroAddress, true),
      ).to.be.revertedWith('invalid address');
    });

    it('should only be the admin able to set a meta transaction processor', async function () {
      const {
        landAsAdmin: contractAsAdmin,
        landAsDeployer: contract,
        sandContract,
      } = await loadFixture(setupLand);
      await expect(
        contract.setMetaTransactionProcessor(
          await sandContract.getAddress(),
          true,
        ),
      ).to.be.revertedWith('only admin allowed');

      await expect(
        contractAsAdmin.setMetaTransactionProcessor(
          await sandContract.getAddress(),
          true,
        ),
      ).not.to.be.reverted;
    });
  });

  describe('AdminV2', function () {
    it('should get the current admin', async function () {
      const {landAsDeployer, landAdmin} = await loadFixture(setupLand);
      expect(await landAsDeployer.getAdmin()).to.be.equal(landAdmin.address);
    });

    it('should change the admin to a new address', async function () {
      const {landAsAdmin: contract, deployer} = await loadFixture(setupLand);
      await expect(contract.changeAdmin(deployer)).not.to.be.reverted;
      expect(await contract.getAdmin()).to.be.equal(deployer.address);
    });

    // TODO: removed to be compatible with L2 contract
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('should only be changed to a new admin', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      const admin = await contract.getAdmin();
      await expect(contract.changeAdmin(admin)).to.be.reverted;
    });
  });

  describe('SuperOperatorsV2', function () {
    it('should not be a super operator by default', async function () {
      const {landAsDeployer, landAdmin} = await loadFixture(setupLand);
      expect(await landAsDeployer.isSuperOperator(landAdmin)).to.be.false;
    });

    it('should be an admin to set super operator', async function () {
      const {landAsDeployer: contract, deployer} = await loadFixture(setupLand);
      await expect(
        contract.setSuperOperator(deployer, true),
      ).to.be.revertedWith('only admin allowed');

      expect(await contract.isSuperOperator(deployer)).to.be.false;
    });

    it('should enable a super operator', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      const admin = await contract.getAdmin();
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await contract.isSuperOperator(admin)).to.be.true;
    });

    it('should disable a super operator', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      const admin = await contract.getAdmin();
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;

      expect(await contract.isSuperOperator(admin)).to.be.false;
    });

    it('should not accept address 0 as super operator', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      await expect(
        contract.setSuperOperator(ZeroAddress, false),
      ).to.be.revertedWith('address 0 is not allowed');

      await expect(
        contract.setSuperOperator(ZeroAddress, true),
      ).to.be.revertedWith('address 0 is not allowed');

      expect(await contract.isSuperOperator(ZeroAddress)).to.be.false;
    });

    it('should only be able to disable an enabled super operator', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      const admin = await contract.getAdmin();
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await contract.isSuperOperator(admin)).to.be.true;

      await expect(contract.setSuperOperator(admin, true)).to.be.revertedWith(
        'the status should be different',
      );
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled super operator', async function () {
      const {landAsAdmin: contract} = await loadFixture(setupLand);
      const admin = await contract.getAdmin();
      expect(await contract.isSuperOperator(admin)).to.be.false;

      await expect(contract.setSuperOperator(admin, false)).to.be.revertedWith(
        'the status should be different',
      );
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
    });
  });

  // TODO: add this tests!!!
  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('OperatorFilterer', function () {
    it('should be registered', async function () {
      const {operatorFilterRegistry, landV3} = await loadFixture(setupLand);
      expect(
        await operatorFilterRegistry.isRegistered(landV3.address),
      ).to.be.equal(true);
    });

    it('would not register on the operator filter registry if not set on the Land', async function () {
      const {operatorFilterRegistry, LandV3WithRegistryNotSet} =
        await loadFixture(setupLand);
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address,
        ),
      ).to.be.equal(false);
    });

    it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
      const {
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        LandV3WithRegistryNotSet,
      } = await loadFixture(setupLand);
      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistryAsOwner.address,
      );
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      expect(
        await operatorFilterRegistryAsOwner.subscriptionOf(
          LandV3WithRegistryNotSet.address,
        ),
      ).to.be.equal(zeroAddress);
    });

    it('should be registered through OperatorFiltererUpgradeable', async function () {
      const {operatorFilterRegistry, LandV3WithRegistryNotSet} =
        await loadFixture(setupLand);

      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address,
      );
      await LandV3WithRegistryNotSet.registerFilterer(zeroAddress, false);

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address,
        ),
      ).to.be.equal(true);
    });

    it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
      const {
        operatorFilterRegistry,
        LandV3WithRegistryNotSet,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await loadFixture(setupLand);

      await LandV3WithRegistryNotSet.setOperatorRegistry(
        operatorFilterRegistry.address,
      );
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        false,
      );

      expect(
        await operatorFilterRegistry.isRegistered(
          LandV3WithRegistryNotSet.address,
        ),
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.subscriptionOf(
          LandV3WithRegistryNotSet.address,
        ),
      ).to.be.equal(zeroAddress);

      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          LandV3WithRegistryNotSet.address,
          mockMarketPlace1.address,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
      const {
        LandV3WithRegistryNotSet,
        other,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await loadFixture(setupLand);

      await LandV3WithRegistryNotSet.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      await other.LandV3WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true,
      );

      expect(
        await LandV3WithRegistryNotSet.isApprovedForAll(
          other.address,
          mockMarketPlace1.address,
        ),
      ).to.be.equal(true);
    });

    it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
      const {
        LandV3WithRegistryNotSet,
        other,
        other1,
        operatorFilterSubscription,
        mockMarketPlace1,
      } = await loadFixture(setupLand);

      await LandV3WithRegistryNotSet.mintQuadWithOutMinterCheck(
        other.address,
        1,
        0,
        0,
        '0x',
      );
      const id = getId(1, 0, 0);
      await LandV3WithRegistryNotSet.registerFilterer(
        operatorFilterSubscription.address,
        true,
      );

      await other.LandV3WithRegistryNotSet.setApprovalForAll(
        mockMarketPlace1.address,
        true,
      );

      expect(
        await LandV3WithRegistryNotSet.isApprovedForAll(
          other.address,
          mockMarketPlace1.address,
        ),
      ).to.be.equal(true);

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        LandV3WithRegistryNotSet.address,
        other.address,
        other1.address,
        id,
      );

      expect(await LandV3WithRegistryNotSet.ownerOf(id)).to.be.equal(
        other1.address,
      );
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {operatorFilterRegistry, operatorFilterSubscription, landV3} =
        await loadFixture(setupLand);
      expect(
        await operatorFilterRegistry.subscriptionOf(landV3.address),
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be able to transfer land if from is the owner of token', async function () {
      const {landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3.transferFrom(other.address, other1.address, id);

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer land if from is the owner of token', async function () {
      const {landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256)'](
        other.address,
        other1.address,
        Number(id),
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
      const {landV3, other, other1} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256,bytes)'](
        other.address,
        other1.address,
        id,
        '0x',
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token', async function () {
      const {landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.safeBatchTransferFrom(
        other.address,
        other1.address,
        [id1, id2],
        '0x',
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(2);
    });
    it('should be able to batch transfer Land if from is the owner of token', async function () {
      const {landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.batchTransferFrom(
        other.address,
        other1.address,
        [id1, id2],
        '0x',
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(2);
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3.transferFrom(other.address, mockMarketPlace1.address, id);

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256)'](
        other.address,
        mockMarketPlace1.address,
        id,
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe transfer(with data) token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await landV3['safeTransferFrom(address,address,uint256,bytes)'](
        other.address,
        mockMarketPlace1.address,
        id,
        '0x',
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(1);
    });

    it('should be able to safe batch transfer Land if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.safeBatchTransferFrom(
        other.address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x',
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(2);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await landV3.batchTransferFrom(
        other.address,
        mockMarketPlace1.address,
        [id1, id2],
        '0x',
      );

      expect(await landV3.balanceOf(mockMarketPlace1.address)).to.be.equal(2);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, landV3} = await loadFixture(setupLand);
      await expect(landV3.approve(mockMarketPlace1.address, 1)).to.be.reverted;
    });

    it('it should not approveFor blacklisted market places', async function () {
      const {mockMarketPlace1, other} = await loadFixture(setupLand);
      await expect(
        other.landV3.approveFor(other.address, mockMarketPlace1.address, 1),
      ).to.be.reverted;
    });

    it('it should not setApprovalForAll blacklisted market places', async function () {
      const {mockMarketPlace1, other} = await loadFixture(setupLand);
      await expect(
        other.landV3.setApprovalForAll(mockMarketPlace1.address, true),
      ).to.be.reverted;
    });

    it('it should not setApprovalForAllFor blacklisted market places', async function () {
      const {mockMarketPlace1, other} = await loadFixture(setupLand);
      await expect(
        other.landV3.setApprovalForAllFor(
          other.address,
          mockMarketPlace1.address,
          true,
        ),
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.approve(mockMarketPlace3.address, id);
      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace3.address,
      );
    });

    it('it should approveFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      await other.landV3.approveFor(
        other.address,
        mockMarketPlace3.address,
        id,
      );
      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace3.address,
      );
    });

    it('it should setApprovalForAll non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);
      await other.landV3.setApprovalForAll(mockMarketPlace3.address, true);
      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);
    });

    it('it should setApprovalForAllFor non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);
      await other.landV3.setApprovalForAllFor(
        other.address,
        mockMarketPlace3.address,
        true,
      );
      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await other.landV3.approve(mockMarketPlace3.address, id1);

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        other.landV3.approve(mockMarketPlace3.address, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approveFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await other.landV3.approveFor(
        other.address,
        mockMarketPlace3.address,
        id1,
      );

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        other.landV3.approveFor(other.address, mockMarketPlace3.address, id2),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
        other1,
      } = await loadFixture(setupLand);
      await other.landV3.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await expect(
        other1.landV3.setApprovalForAll(mockMarketPlace3.address, true),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
        other1,
      } = await loadFixture(setupLand);
      await other.landV3.setApprovalForAllFor(
        other.address,
        mockMarketPlace3.address,
        true,
      );

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await expect(
        other1.landV3.setApprovalForAllFor(
          other1.address,
          mockMarketPlace3.address,
          true,
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await other.landV3.approve(mockMarketPlace3.address, id1);

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address,
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        other.landV3.approve(mockMarketPlace3.address, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });
    it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);
      await other.landV3.approveFor(
        other.address,
        mockMarketPlace3.address,
        id1,
      );

      expect(await landV3.getApproved(id1)).to.be.equal(
        mockMarketPlace3.address,
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        other.landV3.approveFor(other.address, mockMarketPlace3.address, id2),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
        other1,
      } = await loadFixture(setupLand);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );

      await other.landV3.setApprovalForAll(mockMarketPlace3.address, true);

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        other1.landV3.setApprovalForAll(mockMarketPlace3.address, true),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
        other1,
      } = await loadFixture(setupLand);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );

      await other.landV3.setApprovalForAllFor(
        other.address,
        mockMarketPlace3.address,
        true,
      );

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace3.address),
      ).to.be.equal(true);

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await expect(
        other1.landV3.setApprovalForAllFor(
          other1.address,
          mockMarketPlace3.address,
          true,
        ),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        other.landV3.approve(mockMarketPlace1.address, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );

      await other.landV3.approve(mockMarketPlace1.address, id);

      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace1.address,
      );
    });

    it('it should be able to approveFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await expect(
        other.landV3.approveFor(other.address, mockMarketPlace1.address, id),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );

      await other.landV3.approveFor(
        other.address,
        mockMarketPlace1.address,
        id,
      );

      expect(await landV3.getApproved(id)).to.be.equal(
        mockMarketPlace1.address,
      );
    });

    it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );

      await expect(
        other.landV3.setApprovalForAll(mockMarketPlace1.address, true),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );

      await other.landV3.setApprovalForAll(mockMarketPlace1.address, true);

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace1.address),
      ).to.be.equal(true);
    });

    it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        landV3,
        other,
      } = await loadFixture(setupLand);

      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );

      await expect(
        other.landV3.setApprovalForAllFor(
          other.address,
          mockMarketPlace1.address,
          true,
        ),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );

      await other.landV3.setApprovalForAllFor(
        other.address,
        mockMarketPlace1.address,
        true,
      );

      expect(
        await landV3.isApprovedForAll(other.address, mockMarketPlace1.address),
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true,
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          other.address,
          other1.address,
          id,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, other.address, other1.address, id1, '0x');

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          other.address,
          other1.address,
          id2,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, other.address, other1.address, id, '0x');

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id1 = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );
      await mockMarketPlace3[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, other.address, other1.address, id1, '0x');

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 1, '0x');
      const id2 = getId(1, 0, 1);

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          other.address,
          other1.address,
          id2,
          '0x',
        ),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true,
      );

      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
          landV3.address,
          other.address,
          other1.address,
          id,
          '0x',
        ),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );
      await mockMarketPlace1[
        'transferLand(address,address,address,uint256,bytes)'
      ](landV3.address, other.address, other1.address, id, '0x');

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('it should not be able to transfer(without data) through blacklisted market places', async function () {
      const {mockMarketPlace1, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true,
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landV3.address,
          other.address,
          other1.address,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer(without data) through non blacklisted market places', async function () {
      const {mockMarketPlace3, landV3, other} = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        other.address,
        other1.address,
        id,
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });

    it('it should be not be able to transfer(without data) through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        other.address,
        other1.address,
        id,
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true,
      );

      await other1.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landV3.address,
          other1.address,
          other.address,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to transfer(without data) through market places after their codeHash is blackListed', async function () {
      const {
        mockMarketPlace3,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await mockMarketPlace3['transferLand(address,address,address,uint256)'](
        landV3.address,
        other.address,
        other1.address,
        id,
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);

      const mockMarketPlace3CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address,
        );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true,
      );

      await other1.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true,
      );

      await expect(
        mockMarketPlace3['transferLand(address,address,address,uint256)'](
          landV3.address,
          other1.address,
          other.address,
          id,
        ),
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to transfer(without data) through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        landV3,
        other,
        other1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
      } = await loadFixture(setupLand);
      const mockMarketPlace1CodeHash =
        await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address,
        );
      await landV3.mintQuadWithOutMinterCheck(other.address, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);

      await other.landV3.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true,
      );
      await expect(
        mockMarketPlace1['transferLand(address,address,address,uint256)'](
          landV3.address,
          other.address,
          other1.address,
          id,
        ),
      ).to.be.revertedWith('Address is filtered');

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace1CodeHash,
        false,
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace1.address,
        false,
      );

      await mockMarketPlace1['transferLand(address,address,address,uint256)'](
        landV3.address,
        other.address,
        other1.address,
        id,
      );

      expect(await landV3.balanceOf(other1.address)).to.be.equal(1);
    });
  });
});
