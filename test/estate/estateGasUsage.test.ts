import {setupL1EstateAndLand} from './fixtures';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import {sum} from '../defi/sandRewardPool/fixtures/sandRewardPool.fixture';

// eslint-disable-next-line mocha/no-skipped-tests
describe('@skip-on-coverage @skip-on-ci @slow gas consumption of', function () {
  describe('createEstate for a completely filled tile with a lot of lands', function () {
    // const gasPerSize: {[key: string]: number} = {
    //   1: 23068226,
    //   3: 5700320,
    //   6: 4034468,
    //   12: 3590623,
    //   24: 3448040,
    // };
    const gasPerSize: {[key: string]: number} = {
      1: 20030000,
      3: 5604000,
      6: 4233000,
      12: 3878000,
      24: 3765000,
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (const tileSize in gasPerSize) {
      it(`${tileSize}x${tileSize} lands`, async function () {
        const size = parseInt(tileSize);
        const {
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          other,
          getXsYsSizes,
          createEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );
        await mintQuad(other, 24, 240, 240);
        const {xs, ys, sizes} = getXsYsSizes(240, 240, size);
        const {gasUsed} = await createEstateAsOther({xs, ys, sizes});
        expect(BigNumber.from(gasUsed)).to.be.lt(gasPerSize[tileSize]);
      });
    }
  });

  describe(`createEstate of a lot of tiles at once`, function () {
    // const gasPerCant: {[key: string]: number} = {
    //   1: 3448040,
    //   2: 6985481,
    //   3: 10786062,
    //   4: 14859302,
    //   5: 19217417,
    //   6: 23875291,
    // };
    const gasPerCant: {[key: string]: number} = {
      1: 3765000,
      2: 7588000,
      3: 11678000,
      4: 16044000,
      5: 20699000,
      6: 25657000,
    };
    // cant == 7 => Transaction reverted: contract call run out of gas and made the transaction revert
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (let cant = 1; cant <= 6; cant++) {
      it(`createEstate ${cant} 24x24 tiles and create the estate at once`, async function () {
        const {
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          other,
          createEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );

        const xs = [];
        const ys = [];
        const sizes = [];
        for (let i = 0; i < cant; i++) {
          const x = 240 + 24 * i;
          const y = 384;
          await mintQuad(other, 24, x, y);
          xs.push(x);
          ys.push(y);
          sizes.push(24);
        }
        const {gasUsed} = await createEstateAsOther({xs, ys, sizes});
        expect(BigNumber.from(gasUsed)).to.be.lt(gasPerCant[cant]);
      });
    }
  });
  describe('estateBaseToken gas measurement', function () {
    it('create an estate', async function () {
      const {
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        other,
      } = await setupL1EstateAndLand();
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      await mintQuad(other, 24, 240, 120);
      const estimate = await estateContractAsOther.estimateGas.create([
        [24],
        [240],
        [120],
      ]);
      expect(estimate).to.be.lt(3840000);
    });
    it('add three full quads one by one', async function () {
      const {
        mintQuad,
        other,
        mintApproveAndCreateAsOther,
        updateEstateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 240, 120);
      await mintQuad(other, 24, 240, 120 + 24);
      await mintQuad(other, 24, 240, 120 + 48);
      await mintQuad(other, 24, 240, 120 - 24);
      const estimate = [];
      const u1 = await updateEstateAsOther(estateId, {
        sizes: [24],
        xs: [240],
        ys: [120 + 24],
      });
      estimate.push(u1.gasUsed);
      const u2 = await updateEstateAsOther(u1.newId, {
        sizes: [24],
        xs: [240],
        ys: [120 - 24],
      });
      estimate.push(u2.gasUsed);
      const u3 = await updateEstateAsOther(u2.newId, {
        sizes: [24],
        xs: [240],
        ys: [120 + 48],
      });
      estimate.push(u3.gasUsed);
      expect(sum(estimate)).to.be.lt(10277000);
    });
    it('add three full quads', async function () {
      const {
        estateContractAsOther,
        mintQuad,
        other,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 240, 120);
      await mintQuad(other, 24, 240, 120 + 24);
      await mintQuad(other, 24, 240, 120 + 48);
      await mintQuad(other, 24, 240, 120 - 24);
      const estimate = await estateContractAsOther.estimateGas.update(
        estateId,
        [
          [24, 24, 24],
          [240, 240, 240],
          [120 + 24, 120 - 24, 120 + 48],
        ],
        [[], [], []]
      );
      expect(estimate).to.be.lt(12213000);
    });
  });

  describe('create one estate', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 3765000,
      12: 1267000,
      6: 610000,
      3: 417000,
      1: 343000,
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`create one ${size}x${size} quad and create an estate with that`, async function () {
        const {
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          other,
          createEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );
        await mintQuad(other, size, 48, 96);

        const {gasUsed} = await createEstateAsOther({
          sizes: [size],
          xs: [48],
          ys: [96],
        });
        expect(gasUsed).to.be.lt(gasPerSize[size]);
      });
    });
  });
  describe('create one estate remove one tile add a different one', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 6518000,
      12: 1882000,
      6: 688000,
      3: 358000,
      1: 260000,
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`Update estate with swapping quads of ${size}x${size}`, async function () {
        const {
          landContractAsOther,
          estateContractAsOther,
          other,
          mintQuad,
          createEstateAsOther,
          updateEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );
        await mintQuad(other, size, 48, 96);
        const {estateId} = await createEstateAsOther({
          sizes: [size],
          xs: [48],
          ys: [96],
        });

        // mint lands for update
        await mintQuad(other, size, 144, 144);
        const {gasUsed} = await updateEstateAsOther(
          estateId,
          {sizes: [size], xs: [144], ys: [144]},
          {sizes: [size], xs: [48], ys: [96]}
        );
        expect(gasUsed).to.be.lt(gasPerSize[size]);
      });
    });
  });
  describe('update states', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 6518000,
      12: 6660000,
      6: 7098000,
      3: 8739000,
      1: 25616000,
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    [[24], [12], [6], [3], [1]].forEach(([size]) => {
      it(`create ${size}x${size} quads and estate with that then update`, async function () {
        const {
          landContractAsOther,
          estateContractAsOther,
          other,
          mintQuad,
          getXsYsSizes,
          createEstateAsOther,
          updateEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );
        await mintQuad(other, 24, 0, 0);
        await mintQuad(other, 24, 144, 144);

        const {estateId} = await createEstateAsOther({
          xs: [0],
          ys: [0],
          sizes: [24],
        });
        // we don't have enough gas to add and remove 576 1x1 pixels
        // so we just remove one by and add one big quad
        const {gasUsed} = await updateEstateAsOther(
          estateId,
          {xs: [144], ys: [144], sizes: [24]},
          getXsYsSizes(0, 0, size)
        );
        expect(gasUsed).to.be.lt(gasPerSize[size]);
      });
    });
    describe('update states, remove', function () {
      const gasPerCant: {[key: string]: number} = {
        5: 14877000,
        4: 12363000,
        3: 10304000,
        2: 8488000,
        1: 6916000,
      };
      // eslint-disable-next-line mocha/no-setup-in-describe
      [[5], [4], [3], [2], [1]].forEach(([cant]) => {
        it(`remove ${cant} full tiles`, async function () {
          const {
            landContractAsOther,
            estateContractAsOther,
            mintQuad,
            other,
            createEstateAsOther,
            updateEstateAsOther,
          } = await setupL1EstateAndLand();
          await landContractAsOther.setApprovalForAll(
            estateContractAsOther.address,
            true
          );
          const sizes = [];
          const xs = [];
          const ys = [];
          for (let i = 0; i < 6; i++) {
            await mintQuad(other, 24, 24 + 24 * i, 120);
            sizes.push(24);
            xs.push(24 + 24 * i);
            ys.push(120);
          }
          const {estateId} = await createEstateAsOther({xs, ys, sizes});
          const {gasUsed} = await updateEstateAsOther(estateId, undefined, {
            sizes: sizes.slice(0, cant),
            xs: xs.slice(0, cant),
            ys: ys.slice(0, cant),
          });
          expect(gasUsed).to.be.lt(gasPerCant[cant]);
        });
      });
    });
  });
});
