import {setupL1EstateAndLand} from './fixtures';
import {BigNumber, ethers} from 'ethers';
import {expect} from '../chai-setup';

describe('gas consumption of', function () {
  describe('createEstate for a completely filled tile with a lot of lands', function () {
    const gasPerSize: {[key: string]: number} = {
      1: 23068226,
      3: 5700320,
      6: 4034468,
      12: 3590623,
      24: 3448040,
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (const tileSize in gasPerSize) {
      it(`${tileSize}x${tileSize} lands`, async function () {
        const size = parseInt(tileSize);
        const {
          other,
          landContractAsOther,
          estateContractAsOther,
          mintQuad,
          createEstate,
        } = await setupL1EstateAndLand();
        const quadId = await mintQuad(other, 24, 0, 0);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContractAsOther.address,
          quadId
        );

        const xs = [];
        const ys = [];
        const sizes = [];
        for (let i = 0; i < (24 * 24) / size / size; i++) {
          xs.push((i * size) % 24);
          ys.push(Math.floor((i * size) / 24) * size);
          sizes.push(size);
        }
        const {gasUsed} = await createEstate({xs, ys, sizes});
        expect(BigNumber.from(gasUsed)).to.be.lte(gasPerSize[tileSize]);
        // console.log(`\t${cant * tileSize * tileSize}\t`, gasUsed.toString());
      });
    }
  });

  it(`createEstate of a lot of tiles filled at once`, async function () {
    const gasPerCant: {[key: string]: number} = {
      1: 3448040,
      2: 6985481,
      3: 10786062,
      4: 14859302,
      5: 19217417,
      6: 23875291,
      7: 23875291,
    };

    async function justDoIt(cant: number) {
      const {
        other,
        landContractAsOther,
        estateContractAsOther,
        mintQuad,
        createEstate,
      } = await setupL1EstateAndLand();
      const xs = [];
      const ys = [];
      const sizes = [];
      for (let i = 0; i < cant; i++) {
        const x = 24 * i;
        const y = 0;
        const quadId = await mintQuad(other, 24, x, y);
        await landContractAsOther.setApprovalForAllFor(
          other,
          estateContractAsOther.address,
          quadId
        );
        xs.push(x);
        ys.push(y);
        sizes.push(24);
      }
      const {gasUsed} = await createEstate({xs, ys, sizes});
      expect(BigNumber.from(gasUsed)).to.be.lte(gasPerCant[cant]);
      // console.log(
      //   `\t ${cant} tiles == ${cant * 24} lands \t gas used`,
      //   gasUsed.toString()
      // );
    }

    // i=7 => not enough gas!!!
    for (let i = 1; i <= 6; i++) {
      await justDoIt(i);
    }
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('create an empty estate', async function () {
    const {createEstate} = await setupL1EstateAndLand();
    for (let i = 0; i < 10; i++) {
      const {gasUsed} = await createEstate();
      console.log('gas used', gasUsed.toString());
    }
  });
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('mint a land', async function () {
    const {other, landContractAsMinter} = await setupL1EstateAndLand();
    const tx = await landContractAsMinter.mintQuad(other, 1, 1, 1, []);
    const receipt = await tx.wait();
    const gasUsed = BigNumber.from(receipt.gasUsed);
    console.log('gas used', gasUsed.toString());
  });
  it('tunnel message size', async function () {
    const {
      other,
      landContractAsOther,
      estateContractAsOther,
      estateTunnel,
      mintQuad,
      createEstate,
    } = await setupL1EstateAndLand();
    const quads = [
      [24, 0, 0],
      [24, 24, 0],
      [24, 0, 24],
      [6, 24, 24],
      [6, 30, 24],
      [6, 24, 30],
      [6, 30, 30],
    ];
    const sizes = [];
    const xs = [];
    const ys = [];
    for (const [size, x, y] of quads) {
      const quadId = await mintQuad(other, size, x, y);
      await landContractAsOther.setApprovalForAllFor(
        other,
        estateContractAsOther.address,
        quadId
      );
      sizes.push(size);
      xs.push(x);
      ys.push(y);
    }
    const {estateId} = await createEstate({sizes, xs, ys});
    const message = await estateTunnel.getMessage(other, estateId);
    // TODO: Check what happen when message.length > 1024.... it fails ?
    expect(ethers.utils.arrayify(message).length).to.be.equal(512);
  });
});
