import {setupL1EstateAndLand} from './fixtures';
import {BigNumber, ethers} from 'ethers';
import {expect} from '../chai-setup';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('@slow Estate gas usage', function () {
  describe('@slow one estate a one tile', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (const tileSize of [1, 3, 6, 12, 24]) {
      it(`one estate ${tileSize}x${tileSize} lands 1 tile`, async function () {
        async function justDoIt(cant: number, tileSize: number) {
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
          for (let i = 0; i < cant; i++) {
            xs.push((i * tileSize) % 24);
            ys.push(Math.floor((i * tileSize) / 24) * tileSize);
            sizes.push(tileSize);
          }
          const {gasUsed} = await createEstate({xs, ys, sizes});
          console.log(`\t${cant * tileSize * tileSize}\t`, gasUsed.toString());
        }

        for (let i = 1; i <= 576 / tileSize / tileSize; i++) {
          await justDoIt(i, tileSize);
        }
      });
    }
  });
  it(`one estate a lot of tiles`, async function () {
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
      console.log(
        `\t ${cant} tiles == ${cant * 24} lands \t gas used`,
        gasUsed.toString()
      );
    }

    // i=7 => not enough gas!!!
    for (let i = 1; i <= 6; i++) {
      await justDoIt(i);
    }
  });
  it('create an empty estates', async function () {
    const {createEstate} = await setupL1EstateAndLand();
    for (let i = 0; i < 10; i++) {
      const {gasUsed} = await createEstate();
      console.log('gas used', gasUsed.toString());
    }
  });
  it('how much it take to mint a land', async function () {
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
