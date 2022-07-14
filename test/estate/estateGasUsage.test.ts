import {setupL1EstateAndLand, setupTestEstateBaseToken} from './fixtures';
import {BigNumber, ethers} from 'ethers';
import {expect} from '../chai-setup';

// eslint-disable-next-line mocha/no-skipped-tests
describe('@skip-on-coverage gas consumption of', function () {
  describe('createEstate for a completely filled tile with a lot of lands', function () {
    // const gasPerSize: {[key: string]: number} = {
    //   1: 23068226,
    //   3: 5700320,
    //   6: 4034468,
    //   12: 3590623,
    //   24: 3448040,
    // };
    const gasPerSize: {[key: string]: number} = {
      1: 23068226,
      3: 5700320,
      6: 4166521,
      12: 3802012,
      24: 3689235,
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
          createEstateAsOther,
        } = await setupL1EstateAndLand();
        await landContractAsOther.setApprovalForAll(
          estateContractAsOther.address,
          true
        );
        await mintQuad(other, 24, 0, 0);
        const xs = [];
        const ys = [];
        const sizes = [];
        for (let i = 0; i < (24 * 24) / size / size; i++) {
          xs.push((i * size) % 24);
          ys.push(Math.floor((i * size) / 24) * size);
          sizes.push(size);
        }
        const {gasUsed} = await createEstateAsOther({xs, ys, sizes});
        expect(BigNumber.from(gasUsed)).to.be.lte(gasPerSize[tileSize]);
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
      1: 3689235,
      2: 7462974,
      3: 11491457,
      4: 15784200,
      5: 20353412,
      6: 25213972,
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
          const x = 24 * i;
          const y = 0;
          await mintQuad(other, 24, x, y);
          xs.push(x);
          ys.push(y);
          sizes.push(24);
        }
        const {gasUsed} = await createEstateAsOther({xs, ys, sizes});
        expect(BigNumber.from(gasUsed)).to.be.lte(gasPerCant[cant]);
      });
    }
  });

  it('tunnel message size', async function () {
    const {
      other,
      estateTunnel,
      landContractAsOther,
      estateContractAsOther,
      mintQuad,
      createEstateAsOther,
    } = await setupL1EstateAndLand();
    await landContractAsOther.setApprovalForAll(
      estateContractAsOther.address,
      true
    );
    const quads = [
      [24, 0, 0],
      [24, 24, 0],
      [24, 0, 24],
      [6, 24, 24],
      [6, 30, 24],
      [6, 24, 30],
      [6, 30, 30],
    ];
    const sizes = [];
    const xs = [];
    const ys = [];
    for (const [size, x, y] of quads) {
      await mintQuad(other, size, x, y);
      sizes.push(size);
      xs.push(x);
      ys.push(y);
    }
    const {estateId} = await createEstateAsOther({
      sizes,
      xs,
      ys,
    });
    const message = await estateTunnel.getMessage(other, estateId);
    // TODO: Check what happen when message.length > 1024.... it fails ?
    expect(ethers.utils.arrayify(message).length).to.be.equal(480);
  });
  describe('estateBaseToken gas measurement', function () {
    it('create an estate', async function () {
      const {
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        other,
      } = await setupTestEstateBaseToken();
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
      expect(estimate).to.be.lte(3727985);
    });
    it('add single land', async function () {
      const {
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        other,
        mintApproveAndCreateAsOther,
      } = await setupTestEstateBaseToken();
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await mintApproveAndCreateAsOther(24, 240, 120);
      await mintQuad(other, 24, 240 + 24, 120);
      const estimate = await estateContractAsOther.estimateGas.addLand(
        estateId,
        [[24], [240 + 24], [120]]
      );
      expect(estimate).to.be.lte(3427786);
    });
    it('add multiple land', async function () {
      const {
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        other,
        mintApproveAndCreateAsOther,
      } = await setupTestEstateBaseToken();
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await mintApproveAndCreateAsOther(24, 240, 120);
      await mintQuad(other, 24, 240, 120 + 24);
      await mintQuad(other, 24, 240, 120 + 48);
      await mintQuad(other, 24, 240, 120 - 24);
      const estimate = await estateContractAsOther.estimateGas.addLand(
        estateId,
        [
          [24, 24, 24],
          [240, 240, 240],
          [120 + 24, 120 - 24, 120 + 48],
        ]
      );
      expect(estimate).to.be.lte(11980639);
    });
  });

  describe('create one estate', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 3733419,
      12: 1234908,
      6: 579044,
      3: 385789,
      1: 311437,
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
  describe('create a lot of states', function () {
    describe('start with 24x24', function () {
      const gasPerSize: {[key: string]: number} = {
        1: 19943673,
        12: 3801958,
        6: 4157035,
        3: 5527625,
      };

      // eslint-disable-next-line mocha/no-setup-in-describe
      [
        [576, 1],
        [4, 12],
        [16, 6],
        [256, 3],
      ].forEach(([cant, size]) => {
        it(`@slow create ${cant} 1x1 quads then create an ${size}x${size} estate with that`, async function () {
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
          await mintQuad(other, 24, 0, 0);
          const {xs, ys, sizes} = getXsYsSizes(0, 0, size);
          const {gasUsed} = await createEstateAsOther({
            sizes,
            xs,
            ys,
          });
          expect(gasUsed).to.be.equal(gasPerSize[size]);
        });
      });
    });
  });
  describe('create one estate and update it', function () {
    const gasPerSize: {[key: string]: number} = {
      24: 6500867,
      12: 1864591,
      6: 670364,
      3: 340533,
      1: 244120,
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
    describe('start with 24x24', function () {
      const gasPerSize: {[key: string]: number} = {
        1: 25623538,
        12: 6642579,
        6: 7081826,
        3: 8724868,
      };
      // eslint-disable-next-line mocha/no-setup-in-describe
      [[1], [12], [6], [3]].forEach(([size]) => {
        it(`@slow create ${size}x${size} quads and estate with that then update`, async function () {
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
    });
  });
});
