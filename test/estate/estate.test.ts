import {setupEstate} from './fixtures';
import {waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';
const emptyBytes = Buffer.from('');

describe('Estate.sol', function () {
  it('creating from Land Quad', async function () {
    const {estateContract, landContractAsMinter, user0} = await setupEstate();
    const size = 6;
    const x = 6;
    const y = 12;
    await waitFor(landContractAsMinter.mintQuad(user0, size, x, y, emptyBytes));
    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createFromQuad(user0, user0, size, x, y)
    );
    for (let sx = 0; sx < size; sx++) {
      for (let sy = 0; sy < size; sy++) {
        const id = x + sx + (y + sy) * 408;
        const landOwner = await landContractAsMinter.callStatic.ownerOf(id);
        expect(landOwner).to.equal(estateContract.address);
      }
    }
    const estateOwner = await estateContract.callStatic.ownerOf(1);
    expect(estateOwner).to.equal(user0);
  });
});
