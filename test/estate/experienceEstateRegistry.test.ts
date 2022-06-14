import {setupL2EstateGameAndLand} from './fixtures';

describe('experience estate registry test', function () {
  describe('create a link', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`create a link between an estate and an experience`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;
      await mintQuad(other, 24, 24, 24);

      const quadId = await mintQuad(other, 24, 48, 96);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId, gasUsed} = await createEstate({
        sizes: [24],
        xs: [48],
        ys: [96],
      });
      console.log(
        `create one ${24}x${24} quads and create an estate with that, GAS USED: `,
        gasUsed.toString()
      );
      console.log(experienceEstateRegistryContract.address);

      await experienceEstateRegistryContract.CreateExperienceEstateLink(
        48,
        96,
        gameId,
        estateId
      );
    });
  });
});
