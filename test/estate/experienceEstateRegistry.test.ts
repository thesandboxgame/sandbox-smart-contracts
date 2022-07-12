import {setupL2EstateExperienceAndLand} from './fixtures';
import {expect} from '../chai-setup';
import {waitFor} from '../utils';

const fullQuad24 = Array.from({length: 24})
  .map((i, x) => Array.from({length: 24}).map((j, y) => [x, y]))
  .reduce((acc, val) => [...acc, ...val], []);

describe('ExperienceEstateRegistry tests', function () {
  describe('single land links', function () {
    it(`create a link between a single land and an experience`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        experienceContract,
        registryContractAsOther,
        mintQuad,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await experienceContract.setTemplate(experienceId, [[0, 0]]);

      await mintQuad(other, 1, 0, 0);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await registryContractAsOther.linkSingle(experienceId, 0, 0);
    });

    it(`trying to create a link with an experience already in use should revert`, async function () {
      const {
        other,
        experienceContract,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 3, 0, 0);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await experienceContract.setTemplate(experienceId, [[0, 0]]);
      await registryContractAsOther.link(0, experienceId, 0, 0);

      await expect(
        registryContractAsOther.link(0, experienceId, 0, 1)
      ).to.be.revertedWith('Exp already in use');
    });
    it(`trying to create a link with a land already in use should revert`, async function () {
      const {
        other,
        experienceContract,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;
      const experienceId2 = 456;

      await mintQuad(other, 1, 0, 0);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await experienceContract.setTemplate(experienceId, [[0, 0]]);
      await registryContractAsOther.link(0, experienceId, 0, 0);

      await experienceContract.setTemplate(experienceId2, [[0, 0]]);
      await expect(
        registryContractAsOther.link(0, experienceId2, 0, 0)
      ).to.be.revertedWith('already linked');
    });
    it(`trying to create a multi land link with a land already in use should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;
      const experienceId2 = 234;

      await mintQuad(other, 24, 48, 96);

      await experienceContract.setTemplate(experienceId, fullQuad24);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await createEstateAsOther({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await registryContractAsOther.link(estateId, experienceId, 48, 96);
      await experienceContract.setTemplate(experienceId2, fullQuad24);
      await expect(
        registryContractAsOther.link(estateId, experienceId2, 48, 96)
      ).to.be.revertedWith('already linked');
    });
    it(`trying to unlink an unknown exp should revert`, async function () {
      const {registryContract} = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await expect(registryContract.unLink(experienceId)).to.be.revertedWith(
        'unknown experience'
      );
    });
    it(`trying to batchUnLinkFrom outside of estate should revert`, async function () {
      const {
        other,
        experienceContract,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 3, 0, 0);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await experienceContract.setTemplate(experienceId, [[0, 0]]);
      await registryContractAsOther.link(0, experienceId, 0, 0);

      await expect(
        registryContractAsOther.batchUnLinkFrom(estateContractAsOther.address, [
          experienceId,
        ])
      ).to.be.revertedWith('can be called only by estate');
    });
  });
  describe('complex shape', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`create a link between an estate and an experience with a more complex shape`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 1, 0, 2);
      await mintQuad(other, 1, 1, 2);
      await mintQuad(other, 1, 2, 2);
      await mintQuad(other, 1, 1, 1);
      await mintQuad(other, 1, 1, 3);

      await experienceContract.setTemplate(experienceId, [
        [0, 2],
        [1, 2],
        [2, 2],
        [1, 1],
        [1, 3],
      ]);

      /* const {template} = await experienceContract.getTemplate(experienceId);
      const tta = tileToArray(template.data);
      printTile(tta); */

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      const {estateId} = await createEstateAsOther({
        sizes: [1, 1, 1, 1, 1],
        xs: [0, 1, 2, 1, 1],
        ys: [2, 2, 2, 1, 3],
      });

      /* const landInEstate = await estateContractAsOther.getLandAt(
        estateId,
        0,
        1
      );

      const map1 = landInEstate[0];
      const twjs = tileWithCoordToJS(map1);
      printTileWithCoord(twjs); */

      const receipt = await waitFor(
        registryContractAsOther.link(estateId, experienceId, 0, 0)
      );
      console.log(`gas used is ${receipt.gasUsed}`);
    });
    it(`unlink complex shape`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 1, 0, 2);
      await mintQuad(other, 1, 1, 2);
      await mintQuad(other, 1, 2, 2);
      await mintQuad(other, 1, 1, 1);
      await mintQuad(other, 1, 1, 3);

      await experienceContract.setTemplate(experienceId, [
        [0, 2],
        [1, 2],
        [2, 2],
        [1, 1],
        [1, 3],
      ]);

      /* const {template} = await experienceContract.getTemplate(experienceId);
      const tta = tileToArray(template.data);
      printTile(tta); */

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      const {estateId} = await createEstateAsOther({
        sizes: [1, 1, 1, 1, 1],
        xs: [0, 1, 2, 1, 1],
        ys: [2, 2, 2, 1, 3],
      });

      /* const landInEstate = await estateContractAsOther.getLandAt(
        estateId,
        0,
        1
      );

      const map1 = landInEstate[0];
      const twjs = tileWithCoordToJS(map1);
      printTileWithCoord(twjs); */

      await registryContractAsOther.link(estateId, experienceId, 0, 0);

      const receipt = await waitFor(
        registryContractAsOther.unLink(experienceId)
      );
      console.log(`gas used ${receipt.gasUsed}`);
    });
  });
  describe('Link and unlink', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`create a link between an estate and an experience and unlink it by exp id`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 24, 48, 96);

      await experienceContract.setTemplate(experienceId, fullQuad24);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await createEstateAsOther({
        sizes: [24],
        xs: [48],
        ys: [96],
      });

      await registryContractAsOther.link(estateId, experienceId, 48, 96);
      await registryContractAsOther.unLink(experienceId);
    });
  });
  describe('testing unLinkExperience', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`testing it out`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 24, 0, 0);

      await experienceContract.setTemplate(experienceId, fullQuad24);
      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await createEstateAsOther({
        sizes: [24],
        xs: [0],
        ys: [0],
      });

      await registryContractAsOther.link(estateId, experienceId, 0, 0);

      // TODO: This only reverts now.
      // await registryContract.unLinkExperience([[24], [0], [0]]);
    });
  });
  describe('requires from estate', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    it(`trying to link an empty template should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        createEstateAsOther,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 24, 0, 0);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      const {estateId} = await createEstateAsOther({
        sizes: [24],
        xs: [0],
        ys: [0],
      });

      await expect(
        registryContractAsOther.link(estateId, experienceId, 0, 0)
      ).to.be.revertedWith('empty template');
    });
    it(`trying to link an experience with more than one land need to be done from Estate`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 24, 0, 0);
      await experienceContract.setTemplate(experienceId, fullQuad24);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await expect(
        registryContractAsOther.linkSingle(experienceId, 0, 0)
      ).to.be.revertedWith('must be done inside estate');
    });
    it(`trying to link a single land that isn't mine should revert`, async function () {
      const {
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        landAdmin,
        experienceContract,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(landAdmin, 24, 0, 0);

      await experienceContract.setTemplate(experienceId, [[0, 0]]);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      await expect(
        registryContractAsOther.linkSingle(experienceId, 0, 0)
      ).to.be.revertedWith('invalid user');
    });
    it(`trying to link an estate that isn't mine should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        landAdmin,
        experienceContract,
        createEstateAsOther,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 24, 0, 0);

      await experienceContract.setTemplate(experienceId, fullQuad24);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      const {estateId} = await createEstateAsOther({
        sizes: [24],
        xs: [0],
        ys: [0],
      });

      await estateContractAsOther.transferFrom(other, landAdmin, estateId);

      await expect(
        registryContractAsOther.link(estateId, experienceId, 0, 0)
      ).to.be.revertedWith('invalid user');
    });
    it(`trying to link an estate with less land than the experience require should revert`, async function () {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        registryContractAsOther,
        mintQuad,
        experienceContract,
        createEstateAsOther,
      } = await setupL2EstateExperienceAndLand();

      const experienceId = 123;

      await mintQuad(other, 12, 0, 0);

      await experienceContract.setTemplate(experienceId, fullQuad24);

      await landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );

      const {estateId} = await createEstateAsOther({
        sizes: [12],
        xs: [0],
        ys: [0],
      });

      await expect(
        registryContractAsOther.link(estateId, experienceId, 0, 0)
      ).to.be.revertedWith('not enough land');
    });
  });
  describe('@skip-on-coverage gas tests', function () {
    describe('create a group of lands and link them', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [1, 3, 6, 12, 24].forEach((size) => {
        it(`create an ${size}x${size} group of lands and link them`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            registryContractAsOther,
            mintQuad,
            createEstateAsOther,
            experienceContract,
          } = await setupL2EstateExperienceAndLand();

          const experienceId = 123;

          await mintQuad(other, size, 48, 96);

          //get coords from lands
          const coords = [];
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              coords.push([(48 + i) % 24, (96 + j) % 24]);
            }
          }

          await experienceContract.setTemplate(experienceId, coords);
          await landContractAsOther.setApprovalForAll(
            estateContractAsOther.address,
            true
          );
          const {estateId} = await createEstateAsOther({
            sizes: [size],
            xs: [48],
            ys: [96],
          });

          const receipt = await waitFor(
            registryContractAsOther.link(estateId, experienceId, 48, 96)
          );
          console.log(`gas used for ${size}, is ${receipt.gasUsed}`);
        });
      });
    });
    describe('unlink a group of lands by expId', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [1, 3, 6, 12, 24].forEach((size) => {
        it(`unlink an ${size}x${size} group of lands by expId`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            registryContractAsOther,
            mintQuad,
            createEstateAsOther,
            experienceContract,
          } = await setupL2EstateExperienceAndLand();

          const experienceId = 123;

          await mintQuad(other, size, 48, 96);

          //get coords from lands
          const coords = [];
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              coords.push([(48 + i) % 24, (96 + j) % 24]);
            }
          }

          await experienceContract.setTemplate(experienceId, coords);
          await landContractAsOther.setApprovalForAll(
            estateContractAsOther.address,
            true
          );
          const {estateId} = await createEstateAsOther({
            sizes: [size],
            xs: [48],
            ys: [96],
          });

          await registryContractAsOther.link(estateId, experienceId, 48, 96);

          const receipt = await waitFor(
            registryContractAsOther.unLink(experienceId)
          );
          console.log(`gas used for ${size}, is ${receipt.gasUsed}`);
        });
      });
    });
    describe('stress test batch unlink exps', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [1, 3, 6, 12, 24].forEach((size) => {
        //these are out of place
        it(`stress test batch unlink ${
          size * size
        } exps from a ${size}x${size} quad`, async function () {
          const {
            other,
            landContractAsOther,
            estateContractAsOther,
            registryContractAsOther,
            mintQuad,
            createEstateAsOther,
            updateEstateAsOther,
            experienceContract,
          } = await setupL2EstateExperienceAndLand();

          const experienceIds = [];

          await mintQuad(other, size, 0, 0);
          await mintQuad(other, size, 48, 48);

          //get coords from lands
          const coords = [];
          let k = 0;
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              coords.push([0 + i, 0 + j]);
              experienceIds[k] = k;
              k++;
            }
          }

          await landContractAsOther.setApprovalForAll(
            estateContractAsOther.address,
            true
          );
          const {estateId} = await createEstateAsOther({
            sizes: [size],
            xs: [0],
            ys: [0],
          });

          for (let i = 0; i < size * size; i++) {
            await experienceContract.setTemplate(experienceIds[i], [[0, 0]]);

            await registryContractAsOther.link(
              estateId,
              experienceIds[i],
              coords[i][0],
              coords[i][1]
            );
          }
          const {updateGasUsed} = await updateEstateAsOther(
            estateId,
            {sizes: [size], xs: [48], ys: [48]},
            {sizes: [size], xs: [0], ys: [0]},
            {exps: experienceIds}
          );
          console.log(
            `gas used to update estate for ${size}, is ${updateGasUsed}`
          );
        });
      });
    });
  });
});
