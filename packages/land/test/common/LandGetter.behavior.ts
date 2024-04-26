import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {getId} from '../fixtures';

const sizes = [1, 3, 6, 12, 24];

// eslint-disable-next-line mocha/no-exports
export function shouldCheckLandGetter(setupLand, Contract: string) {
  describe(Contract + ':Getters', function () {
    it('should return name of the token contract', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.name()).to.be.equal("Sandbox's LANDs");
    });

    it('should return symbol of the token contract', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.symbol()).to.be.equal('LAND');
    });

    it('should return width of the grid', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.width()).to.be.equal(408);
    });

    it('should return height of the grid', async function () {
      const {LandContract} = await loadFixture(setupLand);
      expect(await LandContract.height()).to.be.equal(408);
    });

    it('should return owner address', async function () {
      const {LandContract, landOwner} = await loadFixture(setupLand);
      expect(await LandContract.owner()).to.be.equal(
        await landOwner.getAddress(),
      );
    });

    it('should return royaltyManager address', async function () {
      const {LandContract, RoyaltyManagerContract} =
        await loadFixture(setupLand);
      expect(await LandContract.getRoyaltyManager()).to.be.equal(
        await RoyaltyManagerContract.getAddress(),
      );
    });

    it('should return owner data of land', async function () {
      const {LandContract, LandAsMinter, other} = await loadFixture(setupLand);
      await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');

      const ownerAddress = '15d34AAf54267DB7D7c367839AAf71A00a2C6A65';
      expect(await LandContract.getOwnerData(0)).to.be.equal(
        BigInt('0x' + ownerAddress),
      );
    });

    it('should revert when fetching owner of given quad id with wrong size', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(9, 0, 0);
      await expect(LandContract.ownerOf(id))
        .to.be.revertedWithCustomError(LandContract, 'ERC721NonexistentToken')
        .withArgs(id);
    });

    it('should revert when fetching owner of given quad id with invalid token', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(3, 2, 2);
      await expect(LandContract.ownerOf(id))
        .to.be.revertedWithCustomError(LandContract, 'ERC721NonexistentToken')
        .withArgs(id);
    });

    it('should revert when fetching owner of given quad id with invalid token by(x)', async function () {
      const {LandContract} = await loadFixture(setupLand);
      const id = getId(3, 2, 0);
      await expect(LandContract.ownerOf(id))
        .to.be.revertedWithCustomError(LandContract, 'ERC721NonexistentToken')
        .withArgs(id);
    });

    it('should revert when fetching owner of given quad id with invalid token(y)', async function () {
      const {LandAsMinter} = await loadFixture(setupLand);
      const id = getId(3, 0, 2);
      await expect(LandAsMinter.ownerOf(id))
        .to.be.revertedWithCustomError(LandAsMinter, 'ERC721NonexistentToken')
        .withArgs(id);
    });

    it('should return owner of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {LandAsMinter, other} = await loadFixture(setupLand);

        const landHolder = other;
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
        expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(plotCount);
        const id = x + y * 408;

        expect(await LandAsMinter.ownerOf(id)).to.be.equal(landHolder);
      }
    });

    it('should return x and y coordinates of given quad id', async function () {
      for (let i = 1; i < sizes.length; i++) {
        const {LandAsMinter, other} = await loadFixture(setupLand);

        const landHolder = other;
        const size = sizes[i];
        const x = 0;
        const y = 0;
        const bytes = '0x00';
        const plotCount = size * size;

        // Mint LAND on L1
        await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
        expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(plotCount);
        const id = x + y * 408;
        expect(await LandAsMinter.getX(id)).to.be.equal(x);
        expect(await LandAsMinter.getY(id)).to.be.equal(y);
      }
    });

    it('checks if a quad is valid & exists', async function () {
      const {LandContract, LandAsMinter, deployer} =
        await loadFixture(setupLand);

      const bytes = '0x3333';

      await LandAsMinter.mintQuad(deployer, 24, 0, 0, bytes);

      for (const size of sizes) {
        expect(await LandContract.exists(size, 0, 0)).to.be.true;
      }

      await expect(LandContract.exists(4, 0, 0)).to.be.reverted;

      await expect(LandContract.exists(1, 500, 0)).to.be.reverted;

      await expect(LandContract.exists(1, 0, 500)).to.be.reverted;

      await expect(LandContract.exists(3, 0, 500)).to.be.reverted;

      await expect(LandContract.exists(3, 500, 0)).to.be.reverted;
    });

    it('should revert when checking URI for a non-existing token', async function () {
      const GRID_SIZE = 408;
      const {LandContract} = await loadFixture(setupLand);

      const tokenId = 2 + 2 * GRID_SIZE;
      await expect(LandContract.tokenURI(tokenId))
        .to.be.revertedWithCustomError(LandContract, 'ERC721NonexistentToken')
        .withArgs(tokenId);
    });
  });
}
