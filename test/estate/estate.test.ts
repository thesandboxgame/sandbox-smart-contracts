import {setupL1EstateAndLand} from './fixtures';

describe('Estate test that are the same for L1 and L2', function () {
  describe('create one estate', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`create one ${size}x${size} quad and create an estate with that`, async function () {
        const {
          other,
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          createEstate,
        } = await setupL1EstateAndLand();

        const quadId = await mintQuad(other, size, 48, 96);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContractAsOther.address,
          quadId
        );
        const {gasUsed} = await createEstate({
          sizes: [size],
          xs: [48],
          ys: [96],
        });
        console.log(
          `create one ${size}x${size} quads and create an estate with that, GAS USED: `,
          gasUsed.toString()
        );
      });
    });
  });
  describe('create a lot of states', function () {
    describe('start with 24x24', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [
        [576, 1],
        [4, 12],
        [16, 6],
        [256, 3],
      ].forEach(([cant, size]) => {
        it(`@slow create ${cant} 1x1 quads then create an ${size}x${size} estate with that`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            mintQuad,
            createEstate,
            getXsYsSizes,
          } = await setupL1EstateAndLand();
          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            quadId
          );
          const {xs, ys, sizes} = getXsYsSizes(0, 0, size);
          const {gasUsed} = await createEstate({sizes, xs, ys});
          console.log(
            `create ${cant} quads and ${size}x${size} estate with that, GAS USED: `,
            gasUsed.toString()
          );
        });
      });
    });
  });
  describe('create one estate and update it', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`Update estate with swapping quads`, async function () {
        const {
          other,
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          createEstate,
          updateEstate,
        } = await setupL1EstateAndLand();

        const quadId = await mintQuad(other, size, 48, 96);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContractAsOther.address,
          quadId
        );
        const {estateId} = await createEstate({
          sizes: [size],
          xs: [48],
          ys: [96],
        });

        //mint lands for update
        await mintQuad(other, size, 144, 144);
        const {gasUsed} = await updateEstate(
          estateId,
          {sizes: [size], xs: [144], ys: [144]},
          {sizes: [size], xs: [48], ys: [96]}
        );
        console.log(
          `update ${size}x${size} quads, GAS USED: `,
          gasUsed.toString()
        );
      });
    });
  });
  describe('update states', function () {
    describe('start with 24x24', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [[1], [12], [6], [3]].forEach(([size]) => {
        it(`@slow create ${size}x${size} quads and estate with that then update`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            mintQuad,
            createEstate,
            updateEstate,
            getXsYsSizes,
          } = await setupL1EstateAndLand();
          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            quadId
          );
          const quadId2 = await mintQuad(other, 24, 144, 144);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            quadId2
          );

          const {estateId} = await createEstate({
            xs: [0],
            ys: [0],
            sizes: [24],
          });
          // we don't have enough gas to add and remove 576 1x1 pixels
          // so we just remove one by and add one big quad
          const {gasUsed: updateGasUsed} = await updateEstate(
            estateId,
            {xs: [144], ys: [144], sizes: [24]},
            getXsYsSizes(0, 0, size)
          );
          console.log(
            `updateEstate ${size}x${size} estate, GAS USED: `,
            updateGasUsed.toString()
          );
        });
      });
    });
  });
});
