import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';
import {getId} from '../fixtures';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

// eslint-disable-next-line mocha/no-exports
export function shouldCheckMintQuad(setupLand, Contract: string) {
  describe(Contract + ':mintQuad', function () {
    it('should revert if signer is not landMinter', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);

      await expect(
        LandContract.mintQuad(deployer, 3, 0, 0, '0x'),
      ).to.be.revertedWith('!AUTHORIZED');
    });

    it('should revert when to x coordinates are wrong', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintQuad(deployer, 3, 5, 5, '0x'),
      ).to.be.revertedWith('Invalid x coordinate');
    });

    it('should revert when to y coordinates are wrong', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintQuad(deployer, 3, 0, 5, '0x'),
      ).to.be.revertedWith('Invalid y coordinate');
    });

    it('should revert when x quad is out of bounds', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintQuad(deployer, 3, 441, 0, '0x'),
      ).to.be.revertedWith('x out of bounds');
    });

    it('should revert when y quad is out of bounds)', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);
      await expect(
        LandAsMinter.mintQuad(deployer, 3, 0, 441, '0x'),
      ).to.be.revertedWith('y out of bounds');
    });

    it('should revert if to address is zero', async function () {
      const {LandAsMinter} = await loadFixture(setupLand);

      const bytes = '0x3333';

      await expect(
        LandAsMinter.mintQuad(ZeroAddress, 3, 3, 3, bytes),
      ).to.be.revertedWith('to is zero address');
    });

    it('should revert for wrong size', async function () {
      const {LandAsMinter, deployer} = await loadFixture(setupLand);

      await expect(
        LandAsMinter.mintQuad(deployer, 9, 0, 0, '0x'),
      ).to.be.revertedWith('Invalid size');
    });

    describe(`should return true for quad minted inside another quad`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((outerSize) => {
        sizes.forEach((innerSize) => {
          if (innerSize >= outerSize) return;
          it(`inner ${innerSize}x${innerSize} quad, outer ${outerSize}x${outerSize} quad`, async function () {
            const {LandContract, deployer, LandAsMinter} =
              await loadFixture(setupLand);
            // minting the quad of size1 *size1 at x size1 and y size1
            await LandAsMinter.mintQuad(
              deployer,
              outerSize,
              outerSize,
              outerSize,
              '0x',
            );
            expect(
              await LandContract.exists(outerSize, outerSize, outerSize),
            ).to.be.equal(true);
          });
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 <= size1) return;
        it(`should NOT be able to mint child ${size1}x${size1} quad if parent ${size2}x${size2} quad is already minted`, async function () {
          const {LandAsMinter, deployer} = await loadFixture(setupLand);

          const bytes = '0x3333';
          await LandAsMinter.mintQuad(deployer, size2, 0, 0, bytes);

          await expect(
            LandAsMinter.mintQuad(deployer, size1, 0, 0, bytes),
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((size1) => {
      sizes.forEach((size2) => {
        if (size2 >= size1) return;
        it(`should NOT be able to mint ${size1}x${size1} quad if child ${size2}x${size2} quad is already minted`, async function () {
          const {LandAsMinter, deployer} = await loadFixture(setupLand);

          const bytes = '0x3333';
          await LandAsMinter.mintQuad(deployer, size2, 0, 0, bytes);

          await expect(
            LandAsMinter.mintQuad(deployer, size1, 0, 0, bytes),
          ).to.be.revertedWith('Already minted');
        });
      });
    });

    describe(`should return true for quad minted`, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      sizes.forEach((quadSize) => {
        it(`size ${quadSize}x${quadSize}`, async function () {
          const {LandContract, deployer, LandAsMinter} =
            await loadFixture(setupLand);
          await LandAsMinter.mintQuad(
            deployer,
            quadSize,
            quadSize,
            quadSize,
            '0x',
          );
          expect(
            await LandContract.exists(quadSize, quadSize, quadSize),
          ).to.be.equal(true);
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

    it('Burnt land cannot be minted again', async function () {
      const {LandContract, deployer, LandAsMinter} =
        await loadFixture(setupLand);
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;
      await LandAsMinter.mintQuad(deployer, 3, x, y, '0x');
      await LandContract.burn(tokenId);
      await expect(
        LandAsMinter.mintQuad(deployer, 1, x, y, '0x'),
      ).to.be.revertedWith('Already minted');
    });
  });

  describe(Contract + ':mint and check URI', function () {
    for (const size of [1, 3, 6, 12, 24]) {
      it(`mint and return tokenUri for size ${size}`, async function () {
        const GRID_SIZE = 408;
        const {LandContract, LandAsMinter, deployer} =
          await loadFixture(setupLand);

        const bytes = '0x3333';
        await LandAsMinter.mintQuad(deployer, size, size, size, bytes);
        const tokenId = size + size * GRID_SIZE;
        expect(await LandContract.tokenURI(tokenId)).to.be.equal(
          `https://api.sandbox.game/lands/${tokenId}/metadata.json`,
        );
      });
    }

    it('should return tokenUri for tokenId zero', async function () {
      const {LandContract, deployer, LandAsMinter} =
        await loadFixture(setupLand);
      await LandAsMinter.mintQuad(deployer, 1, 0, 0, '0x');
      const id = getId(1, 0, 0);
      expect(await LandContract.tokenURI(id)).to.equal(
        'https://api.sandbox.game/lands/0/metadata.json',
      );
    });
  });
}
