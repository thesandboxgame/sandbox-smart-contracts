import {setupL2EstateGameAndLand} from './fixtures';
import {expect} from 'chai';

describe('Estate test with maps and games on layer 2', function () {
  describe('create one estate', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`create one ${size}x${size} quads and create an estate with that`, async function () {
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
        it(`@slow create ${cant} (how many we can in one tx?) ${size}x${size} estates with that`, async function () {
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
            freelandQuads: getXsYsSizes(0, 0, 24),
            games: [
              {
                gameId,
                quadsToAdd: getXsYsSizes(24, 24, 24),
                quadsToUse: getXsYsSizes(0, 0, 24),
              },
            ],
          });
          console.log(
            `create ${cant} (how many we can in one tx?) ${size}x${size} estates with that, GAS USED: `,
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
});
