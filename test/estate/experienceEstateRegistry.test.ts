import {setupL2EstateGameAndLand} from './fixtures';
import {expect} from '../chai-setup';
import {
  printTile,
  printTileWithCoord,
  tileToArray,
  tileWithCoordToJS,
} from '../map/fixtures';

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
        landId
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
        0
      );

      await expect(
        experienceEstateRegistryContract.CreateExperienceLink(1, 0, gameId, 1)
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
        landId
      );

      await expect(
        experienceEstateRegistryContract.CreateExperienceLink(
          0,
          0,
          gameId2,
          landId
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
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 24, 48, 96);

      await gameContract.setQuad(48 % 24, 96 % 24, 24); //is this really how it works?
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId} = await createEstate({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await experienceEstateRegistryContract.CreateExperienceLink(
        48,
        96,
        gameId,
        estateId
      );
    });
    it(`create a link between an estate and an experience with a more complex shape`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      await mintQuad(other, 1, 0, 2);
      await mintQuad(other, 1, 1, 2);
      await mintQuad(other, 1, 2, 2);
      await mintQuad(other, 1, 1, 1);
      await mintQuad(other, 1, 1, 3);

      await gameContract.setQuad(0, 2, 1);
      await gameContract.setQuad(1, 2, 1);
      await gameContract.setQuad(2, 2, 1);
      await gameContract.setQuad(1, 1, 1);
      await gameContract.setQuad(1, 3, 1);

      const template = await gameContract.getTemplate();
      const tta = tileToArray(template[0].data);
      printTile(tta);

      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        true
      );

      const {estateId} = await createEstate({
        sizes: [1, 1, 1, 1, 1],
        xs: [0, 1, 2, 1, 1],
        ys: [2, 2, 2, 1, 3],
      });

      const landInEstate = await estateContractAsOther.getLandAt(
        estateId,
        0,
        1
      );

      const map1 = landInEstate[0];
      const twjs = tileWithCoordToJS(map1);
      printTileWithCoord(twjs);

      await experienceEstateRegistryContract.link(estateId, gameId, 0, 0);
    });
  });
  describe('Link and unlink', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`create a link between an estate and an experience and unlink it by exp id`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 24, 48, 96);

      await gameContract.setQuad(48 % 24, 96 % 24, 24); //is this really how it works?
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId} = await createEstate({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await experienceEstateRegistryContract.CreateExperienceLink(
        48,
        96,
        gameId,
        estateId
      );

      await experienceEstateRegistryContract.unLinkByExperienceId(gameId);
    });

    it(`trying to unlink an unknow exp should revert`, async function () {
      const {
        experienceEstateRegistryContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      await expect(
        experienceEstateRegistryContract.unLinkByExperienceId(gameId)
      ).to.be.revertedWith('unkown experience');
    });

    it(`create a link between an estate and an experience and unlink it by lan id`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 24, 48, 96);

      await gameContract.setQuad(48 % 24, 96 % 24, 24); //is this really how it works?
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId} = await createEstate({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await experienceEstateRegistryContract.CreateExperienceLink(
        48,
        96,
        gameId,
        estateId
      );

      //await experienceEstateRegistryContract.unLinkByLandId(39120);
      //this shouldn't revert
      await expect(
        experienceEstateRegistryContract.unLinkByLandId(39120)
      ).to.be.revertedWith('unkown land');
    });
    it(`trying to unlink an inexistent land id should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 24, 48, 96);

      await gameContract.setQuad(48 % 24, 96 % 24, 24); //is this really how it works?
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId} = await createEstate({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await experienceEstateRegistryContract.CreateExperienceLink(
        48,
        96,
        gameId,
        estateId
      );

      await expect(
        experienceEstateRegistryContract.unLinkByLandId(123)
      ).to.be.revertedWith('unkown land');
    });
  });
  describe('testing unLinkExperience', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`testing it out`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContract,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;

      const quadId = await mintQuad(other, 24, 0, 0);

      await gameContract.setQuad(0, 0, 24); //is this really how it works?
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      const {estateId} = await createEstate({
        sizes: [24],
        xs: [0],
        ys: [0],
      });

      await experienceEstateRegistryContract.CreateExperienceLink(
        0,
        0,
        gameId,
        estateId
      );

      await experienceEstateRegistryContract.unLinkExperience([[24], [0], [0]]);
    });
  });
});
