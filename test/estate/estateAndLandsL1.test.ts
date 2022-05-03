import {setupL1EstateAndLand} from './fixtures';
import {ethers} from "ethers";
import {expect} from '../chai-setup';

describe('Estate test with maps on layer 1', function () {
  describe('create one estate', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    [24, 12, 6, 3, 1].forEach((size) => {
      it(`create one ${size}x${size} quads and create an estate with that`, async function () {
        const {
          other,
          landContractAsOther,
          estateContract,
          mintQuad
        } = await setupL1EstateAndLand();

        const quadId = await mintQuad(other, size, 48, 96);
        await landContractAsOther.setApprovalForAllFor(other, estateContract.address, quadId)
        await estateContract.createEstate(
          other,
          [
            [[size], [48], [96]],
            ethers.utils.formatBytes32String("uri ???")
          ],
          [])
      });
    })
  })
  describe('create a lot of states', function () {
    describe('start with 24x24', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [[576, 1], [4, 12], [16, 6], [256, 3]].forEach(([cant, size]) => {

        it(`@slow create ${cant} (how many we can in one tx?) ${size}x${size} estates with that`, async function () {
          const {
            other,
            landContractAsOther,
            estateContract,
            mintQuad
          } = await setupL1EstateAndLand();
          const quadId = await mintQuad(other, 24, 0, 0);
          await landContractAsOther.setApprovalForAllFor(other, estateContract.address, quadId)

          const xs = [];
          const ys = [];
          const sizes = [];
          for (let x = 0; x < Math.floor(24 / size); x++) {
            for (let y = 0; y < Math.floor(24 / size); y++) {
              xs.push(x * size);
              ys.push(y * size);
              sizes.push(size);
            }
          }
          await estateContract.createEstate(
            other,
            [
              [sizes, xs, ys],
              ethers.utils.formatBytes32String("uri ???")
            ],
            [])
        });
      });
    });
  });
  it('tunnel message size', async function () {
    const {
      other,
      landContractAsOther,
      estateContract,
      estateTunnel,
      mintQuad,
      createEstate
    } = await setupL1EstateAndLand();
    const quads = [[24, 0, 0], [24, 24, 0], [24, 0, 24], [6, 24, 24], [6, 30, 24], [6, 24, 30], [6, 30, 30]];
    const sizes = [];
    const xs = [];
    const ys = [];
    for (const [size, x, y] of quads) {
      const quadId = await mintQuad(other, size, x, y);
      await landContractAsOther.setApprovalForAllFor(other, estateContract.address, quadId);
      sizes.push(size);
      xs.push(x);
      ys.push(y);
    }
    const estateId = await createEstate(sizes, xs, ys);
    const message = await estateTunnel.getMessage(other, estateId);
    // TODO: Check what happen when message.length > 1024.... it fails ?
    expect(ethers.utils.arrayify(message).length).to.be.equal(480);
  });
  // describe('update states', function () {
  // });
});
