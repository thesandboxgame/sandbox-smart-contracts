import {expect} from '../chai-setup';
import {setupLand} from './fixtures';
const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('Land Transfer quad', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to transfer ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
        const {
          landContract,
          getNamedAccounts,
          ethers,
          mintQuad,
        } = await setupLand();
        const {deployer, landAdmin} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );
        await mintQuad(deployer, size1, 0, 0);
        // function transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external {
        await contract.transferQuad(deployer, landAdmin, size2, 0, 0, '0x');
        await expect(
          contract.transferQuad(deployer, landAdmin, size2, 0, 0, '0x')
        ).to.be.reverted;
      });
    });
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  sizes.forEach((size1) => {
    sizes.forEach((size2) => {
      if (size2 >= size1) return;
      it(`should NOT be able to transfer burned ${size2}x${size2} quad twice from ${size1}x${size1} quad`, async function () {
        const {
          landContract,
          getNamedAccounts,
          ethers,
          mintQuad,
        } = await setupLand();
        const {deployer, landAdmin} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );
        await mintQuad(deployer, size1, 0, 0);
        for (let x = 0; x < size2; x++) {
          for (let y = 0; y < size2; y++) {
            const tokenId = x + y * GRID_SIZE;
            await contract.burn(tokenId);
          }
        }
        await expect(
          contract.transferQuad(deployer, landAdmin, size1, 0, 0, '0x')
        ).to.be.revertedWith('not owner');
      });
    });
  });

  it(`should NOT be able to transfer burned 1x1 quad`, async function () {
    const {
      landContract,
      getNamedAccounts,
      ethers,
      mintQuad,
    } = await setupLand();
    const {deployer, landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(deployer));
    const x = 0;
    const y = 0;
    await mintQuad(deployer, 3, x, y);
    const tokenId = x + y * GRID_SIZE;
    await contract.burn(tokenId);
    await expect(
      contract.transferQuad(deployer, landAdmin, 1, 0, 0, '0x')
    ).to.be.revertedWith('token does not exist');
  });

  it(`should NOT be able to transfer burned 1x1 quad through a parent quad`, async function () {
    const {
      landContract,
      getNamedAccounts,
      ethers,
      mintQuad,
    } = await setupLand();
    const {deployer, landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(deployer));
    const x = 0;
    const y = 0;
    await mintQuad(deployer, 3, x, y);
    const tokenId = x + y * GRID_SIZE;
    await contract.burn(tokenId);
    await expect(
      contract.transferQuad(deployer, landAdmin, 3, 0, 0, '0x')
    ).to.be.revertedWith('not owner');
  });
});
