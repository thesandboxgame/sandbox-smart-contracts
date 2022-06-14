import {setupL2EstateAndLand} from './fixtures';
import {BigNumber} from 'ethers';

describe('L2 Estate test', function () {
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
        } = await setupL2EstateAndLand();

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
          } = await setupL2EstateAndLand();
          const gameQuad = await mintQuad(other, 24, 24, 24);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            gameQuad
          );

          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            quadId
          );
          const {gasUsed} = await createEstate(getXsYsSizes(0, 0, size));
          console.log(
            `create ${cant} quads and ${size}x${size} estate with that, GAS USED: `,
            gasUsed.toString()
          );
          // const map = await estateContract.getGameMap(estateId, gameId);
          // for (const m of map) {
          //   const tile = tileWithCoordToJS(m);
          //   printTileWithCoord(tile);
          // }
        });
      });
    });
  });
  describe('update states', function () {
    describe('start with 24x24', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [
        [576, 1],
        [4, 12],
        [16, 6],
        [256, 3],
      ].forEach(([cant, size]) => {
        it(`@slow create ${cant} 1x1 quads then create an ${size}x${size} estate with that then update`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            mintQuad,
            createEstate,
            updateEstate,
            getXsYsSizes,
          } = await setupL2EstateAndLand();
          const gameQuad = await mintQuad(other, 24, 24, 24);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            gameQuad
          );

          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContractAsOther.address,
            quadId
          );
          const {estateId, gasUsed} = await createEstate(
            getXsYsSizes(0, 0, size)
          );
          console.log(
            `create ${cant} quads and ${size}x${size} estate with that, GAS USED: `,
            gasUsed.toString()
          );

          //const quadId2 = await mintQuad(other, 24, 144, 144);

          // const gameId2 = 456;
          //const {updateEstateId, updateGasUsed} = await updateEstate({
          await updateEstate(estateId);
          // console.log(updateEstateId);
          // console.log(updateGasUsed);
        });
      });
    });
  });

  describe('update states testing', function () {
    it(`create a estate and update `, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        createEstate,
        updateEstate,
        getXsYsSizes,
      } = await setupL2EstateAndLand();

      await mintQuad(other, 24, 24, 24);

      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        true
      );

      await mintQuad(other, 24, 0, 0);

      const {estateId, gasUsed} = await createEstate(getXsYsSizes(0, 0, 24));
      console.log(`estate, GAS USED: `, gasUsed.toString());

      await mintQuad(other, 24, 144, 144);

      //const {updateEstateId, updateGasUsed} = await updateEstate({
      await updateEstate(
        estateId
        //freeLandToAdd: getXsYsSizes(144, 144, 24),
        //freeLandToRemove: getXsYsSizes(0, 0, size),
      );

      // console.log(updateEstateId);
      // console.log(updateGasUsed);
    });
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('@slow one estate 1x1 lands 1 tile', async function () {
    async function justDoIt(cant: number, tileSize: number) {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        createEstate,
      } = await setupL2EstateAndLand();
      const quadId = await mintQuad(other, 24, 0, 0);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );

      const xs = [];
      const ys = [];
      const sizes = [];
      for (let i = 0; i < cant; i++) {
        xs.push((i * tileSize) % 24);
        ys.push(Math.floor((i * tileSize) / 24) * tileSize);
        sizes.push(tileSize);
      }
      const {gasUsed} = await createEstate({xs, ys, sizes});
      console.log(`\t${cant * tileSize * tileSize}\t`, gasUsed.toString());
    }

    const tileSize = 3;
    for (let i = 1; i <= 576 / tileSize / tileSize; i++) {
      await justDoIt(i, tileSize);
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('@slow one estate 1x1 lands a lot of tiles', async function () {
    async function justDoIt(cant: number, tileSize: number) {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        createEstate,
      } = await setupL2EstateAndLand();
      const xs = [];
      const ys = [];
      const sizes = [];
      for (let i = 0; i < cant; i++) {
        const x = 24 * (i % 17);
        const y = 24 * Math.floor(i / 17);
        const quadId = await mintQuad(other, tileSize, x, y);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContractAsOther.address,
          quadId
        );
        xs.push(x);
        ys.push(y);
        sizes.push(tileSize);
      }
      const {gasUsed} = await createEstate({xs, ys, sizes});
      console.log(`\t${cant * tileSize}\t`, gasUsed.toString());
    }

    const tileSize = 3;
    for (let i = 1; i <= 289; i += 12 / tileSize) {
      await justDoIt(i, tileSize);
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('create an empty estates', async function () {
    const {createEstate} = await setupL2EstateAndLand();
    for (let i = 0; i < 10; i++) {
      const {gasUsed} = await createEstate();
      console.log('gas used', gasUsed.toString());
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('how much it take to mint a land', async function () {
    const {other, landContractAsMinter} = await setupL2EstateAndLand();
    const tx = await landContractAsMinter.mintQuad(other, 1, 1, 1, []);
    const receipt = await tx.wait();
    const gasUsed = BigNumber.from(receipt.gasUsed);
    console.log('gas used', gasUsed.toString());
  });
});
