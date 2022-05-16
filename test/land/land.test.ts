import {expect} from '../chai-setup';
import {setupLand} from './fixtures';
const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

describe('LandV2', function () {
  describe('LandBaseTokenV2', function () {
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

    it('Burnt land cannot be minted again', async function () {
      const {
        landContract,
        getNamedAccounts,
        ethers,
        mintQuad,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      const x = 0;
      const y = 0;
      const tokenId = x + y * GRID_SIZE;

      await mintQuad(deployer, 3, x, y);

      await contract.burn(tokenId);

      await expect(mintQuad(deployer, 1, x, y)).to.be.revertedWith(
        'Already minted as 3x3'
      );
    });
  });

  describe('MetaTransactionReceiverV2', function () {
    it('should not be a meta transaction processor', async function () {
      const {landContract, sandContract} = await setupLand();

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.false;
    });

    it('should enable a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, true)
      ).not.to.be.reverted;

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.true;
    });

    it('should disable a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, false)
      ).not.to.be.reverted;

      expect(
        await landContract.isMetaTransactionProcessor(sandContract.address)
      ).to.be.false;
    });

    it('should only be a contract as meta transaction processor', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {landAdmin} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(
        contract.setMetaTransactionProcessor(landAdmin, true)
      ).to.be.revertedWith('only contracts can be meta transaction processor');
    });

    it('should only be the admin able to set a meta transaction processor', async function () {
      const {
        landContract,
        sandContract,
        getNamedAccounts,
        ethers,
      } = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      const admin = await landContract.getAdmin();
      const contractAsAdmin = landContract.connect(
        ethers.provider.getSigner(admin)
      );

      await expect(
        contract.setMetaTransactionProcessor(sandContract.address, true)
      ).to.be.revertedWith('only admin can setup metaTransactionProcessors');

      await expect(
        contractAsAdmin.setMetaTransactionProcessor(sandContract.address, true)
      ).not.to.be.reverted;
    });
  });
});
