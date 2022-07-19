import {setupL1EstateAndLand} from './fixtures';
import {BigNumber} from 'ethers';
import {expect} from '../chai-setup';
import {sum} from '../defi/sandRewardPool/fixtures/sandRewardPool.fixture';

// eslint-disable-next-line mocha/no-skipped-tests
describe('@skip-on-coverage @slow gas consumption of', function () {
  describe('createEstate for a completely filled tile with a lot of lands', function () {
    // const gasPerSize: {[key: string]: number} = {
    //   1: 23068226,
    //   3: 5700320,
    //   6: 4034468,
    //   12: 3590623,
    //   24: 3448040,
    // };
    const gasPerSize: {[key: string]: number} = {
      1: 20020090,
      3: 5600010,
      6: 4229036,
      12: 3873815,
      24: 3761071,
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
        expect(BigNumber.from(gasUsed)).to.be.equal(gasPerSize[tileSize]);
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
      1: 3761083,
      2: 7584167,
      3: 11674043,
      4: 16040229,
      5: 20694930,
      6: 25653027,
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
        expect(BigNumber.from(gasUsed)).to.be.equal(gasPerCant[cant]);
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
      expect(estimate).to.be.equal(3827182);
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
      estimate.push(u1.updateGasUsed);
      const u2 = await updateEstateAsOther(u1.newId, {
        sizes: [24],
        xs: [240],
        ys: [120 - 24],
      });
      estimate.push(u2.updateGasUsed);
      const u3 = await updateEstateAsOther(u2.newId, {
        sizes: [24],
        xs: [240],
        ys: [120 + 48],
      });
      estimate.push(u3.updateGasUsed);
      expect(sum(estimate)).to.be.equal(10261784);
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
      expect(estimate).to.be.equal(12207725);
    });
  });

  describe('create one estate', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 3761071,
      12: 1262560,
      6: 606696,
      3: 413441,
      1: 339089,
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
        expect(gasUsed).to.be.equal(gasPerSize[size]);
      });
    });
  });
  describe('create one estate remove one tile add a different one', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 6512897,
      12: 1876621,
      6: 682394,
      3: 352563,
      1: 255984,
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
        const {updateGasUsed} = await updateEstateAsOther(
          estateId,
          {sizes: [size], xs: [144], ys: [144]},
          {sizes: [size], xs: [48], ys: [96]}
        );
        expect(updateGasUsed).to.be.equal(gasPerSize[size]);
      });
    });
  });
  describe('update states', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 6512873,
      12: 6654606,
      6: 7093854,
      3: 8736896,
      1: 25635576,
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
        const {updateGasUsed} = await updateEstateAsOther(
          estateId,
          {xs: [144], ys: [144], sizes: [24]},
          getXsYsSizes(0, 0, size)
        );
        expect(updateGasUsed).to.be.equal(gasPerSize[size]);
      });
    });
    describe('update states, remove', function () {
      const gasPerCant: {[key: string]: number} = {
        5: 14872490,
        4: 12357572,
        3: 10299243,
        2: 8482783,
        1: 6911047,
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
          const {updateGasUsed} = await updateEstateAsOther(
            estateId,
            undefined,
            {
              sizes: sizes.slice(0, cant),
              xs: xs.slice(0, cant),
              ys: ys.slice(0, cant),
            }
          );
          expect(updateGasUsed).to.be.equal(gasPerCant[cant]);
        });
      });
    });
  });
});
