import {expect} from '../chai-setup';
import {printTile, setupTileOrLandLibTest, tileToArray} from './fixtures';
import {BigNumber} from 'ethers';

describe('TileOrLandLib main', function () {
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('Some Tile', async function () {
    const tester = await setupTileOrLandLibTest();
    await tester.setTile(0, {
      tile: {data: [0, 0, 0]},
    });
    const tile = await tester.getTile(0);
    const jsTile = tileToArray(tile.tile.data);
    printTile(jsTile);
  });

  it('Empty Tile', async function () {
    const tester = await setupTileOrLandLibTest();
    expect(await tester.isEmpty(0)).to.be.true;
    expect(await tester.isOneLand(0)).to.be.false;
    expect(await tester.isMultiLand(0)).to.be.false;

    expect(await tester.isValid(0)).to.be.true;
    expect(await tester.isAdjacent(0)).to.be.true;
    expect(await tester.getX(0)).to.be.equal(0);
    expect(await tester.getY(0)).to.be.equal(0);
  });
  describe('addIfNotContain', function () {
    describe('one land', function () {
      it('should success to add a pixel', async function () {
        const tester = await setupTileOrLandLibTest();
        await tester.addIfNotContain(0, 10, 10);
        expect(await tester.isEmpty(0)).to.be.false;
        expect(await tester.isOneLand(0)).to.be.true;
        expect(await tester.isMultiLand(0)).to.be.false;

        expect(await tester.isValid(0)).to.be.true;
        expect(await tester.isAdjacent(0)).to.be.true;
        expect(await tester.getX(0)).to.be.equal(10);
        expect(await tester.getY(0)).to.be.equal(10);
      });
      it('should fail to add the same pixel twice', async function () {
        const tester = await setupTileOrLandLibTest();
        await tester.addIfNotContain(0, 10, 10);
        await expect(tester.addIfNotContain(0, 10, 10)).to.revertedWith(
          'already contain'
        );
      });
      it('should fail to add a pixel outside 24,24', async function () {
        const tester = await setupTileOrLandLibTest();
        await expect(tester.addIfNotContain(0, 24, 0)).to.revertedWith(
          'Invalid coordinates'
        );
        await expect(tester.addIfNotContain(0, 0, 24)).to.revertedWith(
          'Invalid coordinates'
        );
        await expect(tester.addIfNotContain(0, 24, 24)).to.revertedWith(
          'Invalid coordinates'
        );
      });
    });
    describe('multi land', function () {
      it('should success to add pixels', async function () {
        const tester = await setupTileOrLandLibTest();
        await tester.addIfNotContain(0, 10, 10);
        expect(await tester.isOneLand(0)).to.be.true;
        await tester.addIfNotContain(0, 10, 11);

        expect(await tester.isEmpty(0)).to.be.false;
        expect(await tester.isOneLand(0)).to.be.false;
        expect(await tester.isMultiLand(0)).to.be.true;

        expect(await tester.isValid(0)).to.be.true;
        expect(await tester.isAdjacent(0)).to.be.true;
        // after adding x,y is still the same
        expect(await tester.getX(0)).to.be.equal(10);
        expect(await tester.getY(0)).to.be.equal(10);
      });
      it('should success to add non adjacent pixels, but is not valid', async function () {
        const tester = await setupTileOrLandLibTest();
        await tester.addIfNotContain(0, 10, 10);
        expect(await tester.isOneLand(0)).to.be.true;
        await tester.addIfNotContain(0, 10, 12);

        expect(await tester.isEmpty(0)).to.be.false;
        expect(await tester.isOneLand(0)).to.be.false;
        expect(await tester.isMultiLand(0)).to.be.true;

        expect(await tester.isValid(0)).to.be.false;
        expect(await tester.isAdjacent(0)).to.be.false;
      });
    });
  });
  describe('setTile, and isValid', function () {
    it('empty tile', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {data: [0, 0, 0]},
      });
      expect(await tester.isEmpty(0)).to.be.true;
      expect(await tester.isOneLand(0)).to.be.false;
      expect(await tester.isMultiLand(0)).to.be.false;
      expect(await tester.isValid(0)).to.be.true;
    });
    it('should be able to add a pixel', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            // 1,2 coord
            BigNumber.from('0x02000000000000'),
            BigNumber.from(1).shl(224),
            BigNumber.from(2).shl(224),
          ],
        },
      });
      expect(await tester.getX(0)).to.be.equal(1);
      expect(await tester.getY(0)).to.be.equal(2);

      expect(await tester.isEmpty(0)).to.be.false;
      expect(await tester.isOneLand(0)).to.be.true;
      expect(await tester.isMultiLand(0)).to.be.false;
      expect(await tester.isValid(0)).to.be.true;
    });
    it("should fail if x,y don't match the info in the tile", async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            // 1,2 coord
            BigNumber.from(0x02000000000000),
            BigNumber.from(2).shl(224),
            BigNumber.from(2).shl(224),
          ],
        },
      });
      expect(await tester.getX(0)).to.be.equal(2);
      expect(await tester.getY(0)).to.be.equal(2);
      expect(await tester.isValid(0)).to.be.false;
    });
    it('should be able to add two pixels', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {data: [3, 0, 0]},
      });
      expect(await tester.isEmpty(0)).to.be.false;
      expect(await tester.isOneLand(0)).to.be.false;
      expect(await tester.isMultiLand(0)).to.be.true;
      expect(await tester.isValid(0)).to.be.true;
    });
    it('should fail if not adjacent', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {data: [1, 0, 1]},
      });
      expect(await tester.isEmpty(0)).to.be.false;
      expect(await tester.isOneLand(0)).to.be.false;
      expect(await tester.isMultiLand(0)).to.be.true;
      expect(await tester.isAdjacent(0)).to.be.false;
      expect(await tester.isValid(0)).to.be.false;
    });
  });
  describe('adjacency test', function () {
    it('one pixel in the center', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            '0x000000000000000000000000000000000000000000000000',
            '0x000000000000000000000000000800000000000000000000',
            '0x000000000000000000000000000000000000000000000000',
          ],
        },
      });
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('a full tile', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
            '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
            '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
          ],
        },
      });
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('an empty square in the middle', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            '0xF0000FF0000FF0000FF0000FFFFFFFFFFFFFFFFFFFFFFFFF',
            '0xF0000FF0000FF0000FF0000FF0000FF0000FF0000FF0000F',
            '0xFFFFFFFFFFFFFFFFFFFFFFFFF0000FF0000FF0000FF0000F',
          ],
        },
      });
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('an broken empty square in the middle', async function () {
      const tester = await setupTileOrLandLibTest();
      await tester.setTile(0, {
        tile: {
          data: [
            '0xF0000FF0000FF0000FF0000FFFFFFFFFFFFFFFFFFFFFFFFF',
            '0x000000F0000FF0000FF0000FF0000FF0000FF0000FF0000F',
            '0xFFFFFFFFFFFFFFFFFFFFFFFFF0000FF0000FF0000FF0000F',
          ],
        },
      });
      expect(await tester.isAdjacent(0)).to.be.false;
    });
  });
});
