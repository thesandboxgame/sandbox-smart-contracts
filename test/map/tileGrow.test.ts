import {expect} from '../chai-setup';
import {
  addHorizontalLine,
  addVerticaLine,
  getEmptyTile,
  resultToArray,
  setupTileLibTest,
  tileToArray,
} from './fixtures';
import {BigNumber} from 'ethers';

describe('TileLib grow', function () {
  it('some square in the center', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 12, 6);
    const {tile, left, right, up, down} = await tester.grow(0);
    const emptyTile = getEmptyTile();
    expect(tileToArray(left.data)).to.be.eql(emptyTile);
    expect(tileToArray(right.data)).to.be.eql(emptyTile);
    expect(up).to.be.equal(BigNumber.from(0));
    expect(down).to.be.equal(BigNumber.from(0));
    expect(
      resultToArray([
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  X  X  X  X  X  X  X  X  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O',
        ' O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O ',
      ])
    ).to.be.eql(tileToArray(tile.data));
  });
  it('square border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 0, 1);
      await tester.setQuad(0, 0, i, 1);
      await tester.setQuad(0, i, 23, 1);
      await tester.setQuad(0, 23, i, 1);
    }
    const {tile, left, right, up, down} = await tester.grow(0);
    expect(up.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000').shl(24 * 7),
      BigNumber.from('0xffffff').shl(24 * 7),
      BigNumber.from(1).shl(24 * 7),
    ]);
    expect(down.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000'),
      BigNumber.from('0xffffff'),
      BigNumber.from(1),
    ]);
    expect(
      resultToArray([
        ' X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X ',
        ' X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  O  X  X ',
        ' X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X ',
        ' X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X  X ',
      ])
    ).to.be.eql(tileToArray(tile.data));
    expect(tileToArray(left.data)).to.be.eql(
      addVerticaLine(getEmptyTile(), 23)
    );
    expect(tileToArray(right.data)).to.be.eql(
      addVerticaLine(getEmptyTile(), 0)
    );
  });

  it('top border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 0, 1);
    }
    const {tile, left, right, up, down} = await tester.grow(0);
    expect(up.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000').shl(24 * 7),
      BigNumber.from('0xffffff').shl(24 * 7),
      BigNumber.from(1).shl(24 * 7),
    ]);
    expect(down.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ]);
    expect(tileToArray(tile.data)).to.be.eql(
      addHorizontalLine(addHorizontalLine(getEmptyTile(), 0), 1)
    );
    const leftResult = getEmptyTile();
    leftResult[0][23] = true;
    leftResult[1][23] = true;
    expect(leftResult).to.be.eql(tileToArray(left.data));
    const rightResult = getEmptyTile();
    rightResult[0][0] = true;
    rightResult[1][0] = true;
    expect(rightResult).to.be.eql(tileToArray(right.data));
  });

  it('down border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 23, 1);
    }
    const {tile, left, right, up, down} = await tester.grow(0);
    expect(up.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from(0),
      BigNumber.from(0),
      BigNumber.from(0),
    ]);
    expect(down.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000'),
      BigNumber.from('0xffffff'),
      BigNumber.from(1),
    ]);
    expect(tileToArray(tile.data)).to.be.eql(
      addHorizontalLine(addHorizontalLine(getEmptyTile(), 22), 23)
    );
    const leftResult = getEmptyTile();
    leftResult[23][23] = true;
    leftResult[22][23] = true;
    expect(leftResult).to.be.eql(tileToArray(left.data));
    const rightResult = getEmptyTile();
    rightResult[23][0] = true;
    rightResult[22][0] = true;
    expect(rightResult).to.be.eql(tileToArray(right.data));
  });

  it('left border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 0, i, 1);
    }
    const {tile, left, right, up, down} = await tester.grow(0);
    expect(up.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000').shl(24 * 7),
      BigNumber.from(1).shl(24 * 7),
      BigNumber.from(0).shl(24 * 7),
    ]);
    expect(down.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from('0x800000'),
      BigNumber.from(1),
      BigNumber.from(0),
    ]);
    expect(tileToArray(tile.data)).to.be.eql(
      addVerticaLine(addVerticaLine(getEmptyTile(), 0), 1)
    );
    expect(tileToArray(left.data)).to.be.eql(
      addVerticaLine(getEmptyTile(), 23)
    );
    expect(tileToArray(right.data)).to.be.eql(getEmptyTile());
  });

  it('right border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 23, i, 1);
    }
    const {tile, left, right, up, down} = await tester.grow(0);
    expect(up.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from(0).shl(24 * 7),
      BigNumber.from('0x800000').shl(24 * 7),
      BigNumber.from(1).shl(24 * 7),
    ]);
    expect(down.map((x: string) => BigNumber.from(x))).to.be.eql([
      BigNumber.from(0),
      BigNumber.from('0x800000'),
      BigNumber.from(1),
    ]);
    expect(tileToArray(tile.data)).to.be.eql(
      addVerticaLine(addVerticaLine(getEmptyTile(), 22), 23)
    );
    expect(tileToArray(left.data)).to.be.eql(getEmptyTile());
    expect(tileToArray(right.data)).to.be.eql(
      addVerticaLine(getEmptyTile(), 0)
    );
  });
});
