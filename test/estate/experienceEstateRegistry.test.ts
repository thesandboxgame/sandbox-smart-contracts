import {setupL2EstateGameAndLand} from './fixtures';
import {expect} from '../chai-setup';

describe('experience estate registry test', function () {
  describe('single land links type A storage', function () {
    it(`create a link between a single land and an experience`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const landId = await mintQuad(other, 1, 0, 0);

      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        landId
      );

      await experienceEstateRegistryContract.CreateExperienceLink(
        0,
        0,
        gameId,
        landId,
        1
      );
    });
    it(`trying to create a link with an experience already in use should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 3, 0, 0);

      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );

      await experienceEstateRegistryContract.CreateExperienceLink(
        0,
        0,
        gameId,
        0,
        1
      );

      await expect(
        experienceEstateRegistryContract.CreateExperienceLink(
          1,
          0,
          gameId,
          1,
          1
        )
      ).to.be.revertedWith('Exp already in use');
    });
    it(`trying to create a link with a land already in use should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;
      const gameId2 = 456;

      const landId = await mintQuad(other, 1, 0, 0);

      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        landId
      );

      await experienceEstateRegistryContract.CreateExperienceLink(
        0,
        0,
        gameId,
        landId,
        1
      );

      await expect(
        experienceEstateRegistryContract.CreateExperienceLink(
          0,
          0,
          gameId2,
          landId,
          1
        )
      ).to.be.revertedWith('Land already in use');
    });
  });
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

      await experienceEstateRegistryContract.CreateExperienceLink(
        48,
        96,
        gameId,
        estateId,
        0
      );
    });
  });
});
