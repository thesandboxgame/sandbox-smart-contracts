import {expect} from '../chai-setup';
import {setupMapTest} from './fixtures';
import {BigNumber} from 'ethers';

describe('MapLib adjacency', function () {
  describe('adjacent', function () {
    it('an empty map is always adjacent', async function () {
      const {tester} = await setupMapTest();
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('some square in the center', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 6);
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('a square over two tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 12, 12);
      await tester.setQuad(0, 0, 24, 12);
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('a square over four tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 12);
      await tester.setQuad(0, 12, 24, 12);
      await tester.setQuad(0, 24, 12, 12);
      await tester.setQuad(0, 24, 24, 12);
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    it('four full tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 0, 24);
      await tester.setQuad(0, 0, 24, 24);
      await tester.setQuad(0, 24, 0, 24);
      await tester.setQuad(0, 24, 24, 24);
      expect(await tester.isAdjacent(0)).to.be.true;
    });
    describe('corners', function () {
      it('top left corner', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 120, 120, 1);
        expect(await tester.isAdjacent(0)).to.be.true;
      });
      it('top right corner', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 143, 120, 1);
        expect(await tester.isAdjacent(0)).to.be.true;
      });
      it('bottom left corner', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 120, 143, 1);
        expect(await tester.isAdjacent(0)).to.be.true;
      });
      it('bottom right', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 143, 143, 1);
        expect(await tester.isAdjacent(0)).to.be.true;
      });
    });
  });
  describe('not adjacent', function () {
    it('two squares in the same tile', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 6, 6, 6);
      await tester.setQuad(0, 18, 18, 6);
      expect(await tester.isAdjacent(0)).to.be.false;
    });
    it('two squares in two different tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 6);
      await tester.setQuad(0, 36, 36, 6);
      expect(await tester.isAdjacent(0)).to.be.false;
    });
  });

  describe('isQuadAdjacent', function () {
    it('four full tiles', async function () {
      const {tester} = await setupMapTest();

      async function pushAndSet(x: number, y: number, size: number) {
        expect(await tester.isQuadAdjacent(0, x, y, size)).to.be.true;
        await tester.setQuad(0, x, y, size);
      }

      await pushAndSet(0, 0, 24);
      await pushAndSet(0, 24, 24);
      await pushAndSet(24, 0, 24);
      await pushAndSet(24, 24, 24);
    });
    it('add 24x24 one by one', async function () {
      const {tester} = await setupMapTest();
      for (let x = 0; x < 24; x++) {
        for (let y = 0; y < 24; y++) {
          expect(await tester.isQuadAdjacent(0, x, y, 1)).to.be.true;
          await tester.setQuad(0, x, y, 1);
        }
      }
    });
    it('adjacent pixels', async function () {
      const {tester} = await setupMapTest();
      expect(await tester.isQuadAdjacent(0, 123, 123, 1)).to.be.true;
      await tester.setQuad(0, 123, 123, 1);

      // left
      expect(await tester.isQuadAdjacent(0, 122, 123, 1)).to.be.true;
      // up
      expect(await tester.isQuadAdjacent(0, 123, 122, 1)).to.be.true;
      // right
      expect(await tester.isQuadAdjacent(0, 124, 123, 1)).to.be.true;
      // down
      expect(await tester.isQuadAdjacent(0, 123, 124, 1)).to.be.true;

      expect(await tester.isQuadAdjacent(0, 0, 0, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 122, 122, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 124, 124, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 122, 124, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 124, 122, 1)).to.be.false;
    });
    it('left, up, middle down, right', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 240, 240, 24);
      expect(await tester.isQuadAdjacent(0, 239, 240, 1)).to.be.true;
      expect(await tester.isQuadAdjacent(0, 240, 239, 1)).to.be.true;
      expect(await tester.isQuadAdjacent(0, 240, 240, 1)).to.be.true;
      expect(await tester.isQuadAdjacent(0, 240, 240 + 24, 1)).to.be.true;
      expect(await tester.isQuadAdjacent(0, 240 + 24, 240, 1)).to.be.true;
    });
  });
  describe('@skip-on-coverage gas consumption', function () {
    describe('adjacent', function () {
      it('some square in the center', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(118522);
      });
      it('a square over two tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 12, 12);
        await tester.setQuad(0, 0, 24, 12);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(481577);
      });
      it('a square over four tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 12);
        await tester.setQuad(0, 12, 24, 12);
        await tester.setQuad(0, 24, 12, 12);
        await tester.setQuad(0, 24, 24, 12);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(1247425);
      });
      it('four full tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 24);
        await tester.setQuad(0, 0, 24, 24);
        await tester.setQuad(0, 24, 0, 24);
        await tester.setQuad(0, 24, 24, 24);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(2298357);
      });
    });
    describe('not adjacent', function () {
      it('two squares in the same tile', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 6, 6, 6);
        await tester.setQuad(0, 18, 18, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(127511);
      });
      it('two squares in two different tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 6);
        await tester.setQuad(0, 36, 36, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(145443);
      });
    });

    describe('isQuadAdjacent', function () {
      it('four full tiles', async function () {
        const {tester} = await setupMapTest();
        const totalGas = BigNumber.from(0);

        async function pushAndSet(x: number, y: number, size: number) {
          totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, size));
          await tester.setQuad(0, x, y, size);
        }

        await pushAndSet(0, 0, 24);
        await pushAndSet(0, 24, 24);
        await pushAndSet(24, 0, 24);
        await pushAndSet(24, 24, 24);
        expect(totalGas).to.be.lte(185883);
      });
      it('add 24x24 one by one', async function () {
        const {tester} = await setupMapTest();
        const totalGas = BigNumber.from(0);
        for (let x = 0; x < 24; x++) {
          for (let y = 0; y < 24; y++) {
            totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, 1));
            await tester.setQuad(0, x, y, 1);
          }
        }
        expect(totalGas).to.be.lte(23019530);
      });
    });
  });
});
