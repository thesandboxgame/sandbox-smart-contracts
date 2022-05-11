import {setupL2EstateGameAndLand} from './fixtures';
import {expect} from 'chai';

describe('Estate test with maps and games on layer 2', function () {
  describe('create one estate', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`create one ${size}x${size} quad and create an estate with that`, async function () {
        const {
          other,
          landContractAsOther,
          estateContract,
          mintQuad,
          createEstate,
        } = await setupL2EstateGameAndLand();

        const quadId = await mintQuad(other, size, 48, 96);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContract.address,
          quadId
        );
        const {gasUsed} = await createEstate({
          freelandQuads: {
            sizes: [size],
            xs: [48],
            ys: [96],
          },
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
            estateContract,
            mintQuad,
            createEstate,
            gameContractAsOther,
            getXsYsSizes,
          } = await setupL2EstateGameAndLand();
          const gameId = 123;
          const gameQuad = await mintQuad(other, 24, 24, 24);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContract.address,
            gameQuad
          );
          await gameContractAsOther.mint(other, gameId);
          await gameContractAsOther.approve(estateContract.address, gameId);

          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContract.address,
            quadId
          );
          const {estateId, gasUsed} = await createEstate({
            freelandQuads: getXsYsSizes(0, 0, size),
            games: [
              {
                gameId,
                quadsToAdd: getXsYsSizes(24, 24, 24),
                quadsToUse: getXsYsSizes(0, 0, 24),
              },
            ],
          });
          console.log(
            `create ${cant} quads and ${size}x${size} estate with that, GAS USED: `,
            gasUsed.toString()
          );
          expect(await estateContract.getGamesLength(estateId)).to.be.equal(1);
          expect(await estateContract.getGamesId(estateId, 0)).to.be.equal(
            gameId
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
            estateContract,
            mintQuad,
            createEstate,
            updateEstate,
            gameContractAsOther,
            getXsYsSizes,
          } = await setupL2EstateGameAndLand();
          const gameId = 123;
          const gameQuad = await mintQuad(other, 24, 24, 24);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContract.address,
            gameQuad
          );
          await gameContractAsOther.mint(other, gameId);
          await gameContractAsOther.approve(estateContract.address, gameId);

          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(
            other,
            estateContract.address,
            quadId
          );
          const {estateId, gasUsed} = await createEstate({
            freelandQuads: getXsYsSizes(0, 0, size),
            games: [
              {
                gameId,
                quadsToAdd: getXsYsSizes(24, 24, 24),
                quadsToUse: getXsYsSizes(0, 0, 24),
              },
            ],
          });
          console.log(
            `create ${cant} quads and ${size}x${size} estate with that, GAS USED: `,
            gasUsed.toString()
          );
          expect(await estateContract.getGamesLength(estateId)).to.be.equal(1);
          expect(await estateContract.getGamesId(estateId, 0)).to.be.equal(
            gameId
          );

          //const quadId2 = await mintQuad(other, 24, 144, 144);

          const gameId2 = 456;
          const {updateEstateId, updateGasUsed} = await updateEstate({
            estateId: estateId,
            //freeLandToAdd: getXsYsSizes(0, 0, size),
            //freeLandToRemove: getXsYsSizes(0, 0, size),
            /* gamesToAdd: [
              {
                gameId: gameId2,
                quadsToAdd: getXsYsSizes(24, 144, 144),
              },
            ],
            gamesToRemove: [
              {
                gameId: gameId,
                quadsToTransfer: getXsYsSizes(24, 24, 24),
              },
            ], */
          });
          console.log(updateEstateId);
          console.log(updateGasUsed);
        });
      });
    });
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('@slow one estate 1x1 lands 1 tile zero games', async function () {
    async function justDoIt(cant: number, tileSize: number) {
      const {
        other,
        landContractAsOther,
        estateContract,
        mintQuad,
        createEstate,
      } = await setupL2EstateGameAndLand();
      const quadId = await mintQuad(other, 24, 0, 0);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContract.address,
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
      const {gasUsed} = await createEstate({
        freelandQuads: {xs, ys, sizes},
        games: [],
      });
      console.log(`\t${cant * tileSize * tileSize}\t`, gasUsed.toString());
    }

    const tileSize = 3;
    for (let i = 1; i <= 576 / tileSize / tileSize; i++) {
      await justDoIt(i, tileSize);
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('@slow one estate 1x1 lands a lot of tiles zero games', async function () {
    async function justDoIt(cant: number, tileSize: number) {
      const {
        other,
        landContractAsOther,
        estateContract,
        mintQuad,
        createEstate,
      } = await setupL2EstateGameAndLand();
      const xs = [];
      const ys = [];
      const sizes = [];
      for (let i = 0; i < cant; i++) {
        const x = 24 * (i % 17);
        const y = 24 * Math.floor(i / 17);
        const quadId = await mintQuad(other, tileSize, x, y);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContract.address,
          quadId
        );
        xs.push(x);
        ys.push(y);
        sizes.push(tileSize);
      }
      const {gasUsed} = await createEstate({
        freelandQuads: {xs, ys, sizes},
        games: [],
      });
      console.log(`\t${cant * tileSize}\t`, gasUsed.toString());
    }

    const tileSize = 3;
    for (let i = 1; i <= 289; i += 12 / tileSize) {
      await justDoIt(i, tileSize);
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('@slow one estate one land one tile a lot of games', async function () {
    async function justDoIt(cant: number) {
      const {
        other,
        landContractAsOther,
        estateContract,
        gameContractAsOther,
        mintQuad,
        createEstate,
      } = await setupL2EstateGameAndLand();
      const noLands = false;

      const quadId = await mintQuad(other, 24, 0, 0);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContract.address,
        quadId
      );
      const gameIds = [];
      for (let gameId = 1; gameId <= cant; gameId++) {
        await gameContractAsOther.mint(other, gameId);
        await gameContractAsOther.approve(estateContract.address, gameId);
        gameIds.push(gameId);
      }

      const {gasUsed} = await createEstate({
        games: gameIds.map((gameId) => ({
          gameId,
          ...(noLands
            ? {}
            : {
                quadsToAdd: {
                  sizes: [1],
                  xs: [gameId % 24],
                  ys: [Math.floor(gameId / 24)],
                },
              }),
        })),
      });
      console.log(`\t${cant}\t`, gasUsed.toString());
    }

    for (let i = 1; i <= 576; i++) {
      await justDoIt(i);
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('create an empty states', async function () {
    const {createEstate} = await setupL2EstateGameAndLand();
    for (let i = 0; i < 10; i++) {
      const {gasUsed} = await createEstate({});
      console.log('gas used', gasUsed.toString());
    }
  });
});
