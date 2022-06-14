import {setupL2EstateGameAndLand} from './fixtures';
import {expect} from 'chai';
import {BigNumber} from 'ethers';

describe('experience estate registry test', function () {
  describe('create a link', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`create a link between an estate and an experience`, async function () {
      const {
        other,
        landContractAsOther,
        estateContract,
        experienceEstateRegistryContract,
        mintQuad,
        createEstate,
        gameContractAsOther,
      } = await setupL2EstateGameAndLand();

      const gameId = 123;
      const gameQuad = await mintQuad(other, 24, 24, 24);

      const quadId = await mintQuad(other, 24, 48, 96);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContract.address,
        quadId
      );
      const {estateId, gasUsed} = await createEstate({
        freeLandData: {
          sizes: [24],
          xs: [48],
          ys: [96],
        },
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
