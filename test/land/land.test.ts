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

    it('should not be a minter by default', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {deployer} = await getNamedAccounts();

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should be an admin to set minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );

      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'only admin allowed'
      );

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should enable a minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.true;
    });

    it('should disable a minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.false;
    });

    it('should not accept address 0 as minter', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(
        contract.setMinter(ethers.constants.AddressZero, false)
      ).to.be.revertedWith('address 0 is not allowed as minter');

      await expect(
        contract.setMinter(ethers.constants.AddressZero, true)
      ).to.be.revertedWith('address 0 is not allowed as minter');

      expect(await landContract.isMinter(ethers.constants.AddressZero)).to.be
        .false;
    });

    it('should only be able to disable an enabled minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;

      expect(await landContract.isMinter(deployer)).to.be.true;

      await expect(contract.setMinter(deployer, true)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setMinter(deployer, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled minter', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      expect(await landContract.isMinter(deployer)).to.be.false;

      await expect(contract.setMinter(deployer, false)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setMinter(deployer, true)).not.to.be.reverted;
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
      ).to.be.revertedWith('only admin allowed');

      await expect(
        contractAsAdmin.setMetaTransactionProcessor(sandContract.address, true)
      ).not.to.be.reverted;
    });
  });

  describe('AdminV2', function () {
    it('should get the current admin', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {landAdmin} = await getNamedAccounts();

      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
    });

    it('should change the admin to a new address', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.changeAdmin(deployer)).not.to.be.reverted;

      expect(await contract.getAdmin()).to.be.equal(deployer);
    });

    it('should only be changed to a new admin', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.changeAdmin(admin)).to.be.reverted;
    });
  });

  describe('SuperOperatorsV2', function () {
    it('should not be a super operator by default', async function () {
      const {landContract, getNamedAccounts} = await setupLand();
      const {landAdmin} = await getNamedAccounts();

      expect(await landContract.isSuperOperator(landAdmin)).to.be.false;
    });

    it('should be an admin to set super operator', async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );

      await expect(
        contract.setSuperOperator(deployer, true)
      ).to.be.revertedWith('only admin allowed');

      expect(await landContract.isSuperOperator(deployer)).to.be.false;
    });

    it('should enable a super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.true;
    });

    it('should disable a super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.false;
    });

    it('should not accept address 0 as super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(
        contract.setSuperOperator(ethers.constants.AddressZero, false)
      ).to.be.revertedWith('address 0 is not allowed as super operator');

      await expect(
        contract.setSuperOperator(ethers.constants.AddressZero, true)
      ).to.be.revertedWith('address 0 is not allowed as super operator');

      expect(await landContract.isSuperOperator(ethers.constants.AddressZero))
        .to.be.false;
    });

    it('should only be able to disable an enabled super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

      expect(await landContract.isSuperOperator(admin)).to.be.true;

      await expect(contract.setSuperOperator(admin, true)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;
    });

    it('should only be able to enable a disabled super operator', async function () {
      const {landContract, ethers} = await setupLand();
      const admin = await landContract.getAdmin();
      const contract = landContract.connect(ethers.provider.getSigner(admin));

      expect(await landContract.isSuperOperator(admin)).to.be.false;

      await expect(contract.setSuperOperator(admin, false)).to.be.revertedWith(
        'the status should be different than the current one'
      );
      await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
    });
  });
});
