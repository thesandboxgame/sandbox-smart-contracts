import {expect} from '../chai-setup';
import {setupLand} from './fixtures';
const GRID_SIZE = 408;

describe('Land Transfer quad', function () {
  it(`should NOT be able to transfer burned quad twice through parent quad`, async function () {
    const {
      landContract,
      getNamedAccounts,
      ethers,
      mintQuad,
    } = await setupLand();
    const {deployer, landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(deployer));

    // testing transfer for burned 3x3
    let x = 0;
    let y = 0;
    await mintQuad(deployer, 6, x, y);
    for (let x = 3; x < 6; x++) {
      for (let y = 3; y < 6; y++) {
        const tokenId = x + y * GRID_SIZE;
        await contract.burn(tokenId);
      }
    }
    await expect(
      contract.transferQuad(deployer, landAdmin, 6, x, y, '0x')
    ).to.be.revertedWith('not owner');

    // testing transfer for burned 6x6
    x = 12;
    y = 12;
    await mintQuad(deployer, 12, x, y);
    for (let x = 12; x < 18; x++) {
      for (let y = 18; y < 24; y++) {
        const tokenId = x + y * GRID_SIZE;
        await contract.burn(tokenId);
      }
    }
    await expect(
      contract.transferQuad(deployer, landAdmin, 12, x, y, '0x')
    ).to.be.revertedWith('not owner');

    // testing transfer for burned 6x6 from 24x24
    x = 24;
    y = 24;
    await mintQuad(deployer, 24, x, y);
    for (let x = 30; x < 36; x++) {
      for (let y = 36; y < 42; y++) {
        const tokenId = x + y * GRID_SIZE;
        await contract.burn(tokenId);
      }
    }
    await expect(
      contract.transferQuad(deployer, landAdmin, 24, x, y, '0x')
    ).to.be.revertedWith('not owner');
  });
});
