import {deployments, ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {setupLand, setupLandV1, setupLandV2} from './fixtures';
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
        it(`should return true for ${size2}x${size2} quad minited inside a ${size1}x${size1} quad`, async function () {
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
          // minting the quad of size1 *size1 at x size1 and y size1
          await mintQuad(deployer, size1, size1, size1);
          expect(await contract.exists(size1, size1, size1)).to.be.equal(true);
        });
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      it(`should return false for ${quadSize}x${quadSize} quad not minited`, async function () {
        const {landContract, getNamedAccounts, ethers} = await setupLand();
        const {deployer} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );

        expect(await contract.exists(quadSize, quadSize, quadSize)).to.be.equal(
          false
        );
      });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    sizes.forEach((quadSize) => {
      if (quadSize == 1) return;
      it(`should revert for invalid coordinates for size ${quadSize}`, async function () {
        const {landContract, getNamedAccounts, ethers} = await setupLand();
        const {deployer} = await getNamedAccounts();
        const contract = landContract.connect(
          ethers.provider.getSigner(deployer)
        );
        await expect(
          contract.exists(quadSize, quadSize + 1, quadSize + 1)
        ).to.be.revertedWith('LandBaseTokenV3: Invalid Id');
      });
    });

    it(`should revert for invalid size`, async function () {
      const {landContract, getNamedAccounts, ethers} = await setupLand();
      const {deployer} = await getNamedAccounts();
      const contract = landContract.connect(
        ethers.provider.getSigner(deployer)
      );
      await expect(contract.exists(5, 5, 5)).to.be.revertedWith('Invalid size');
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

  describe('UpgradeV2', function () {
    it('should upgrade to V2 and keep storage intact', async function () {
      const {landContract, getNamedAccounts, mintQuad} = await setupLandV1();
      const {landAdmin, deployer, upgradeAdmin} = await getNamedAccounts();
      const {deploy} = deployments;

      await mintQuad(landAdmin, 24, 0, 0);

      expect(await landContract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landContract.isMinter(landAdmin)).to.be.true;
      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
      expect(await landContract.ownerOf(0)).to.be.equal(landAdmin);

      await deploy('Land', {
        from: deployer,
        contract: 'LandV2',
        proxy: {
          owner: upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
          upgradeIndex: 1,
        },
        log: true,
      });

      const landV2Contract = await ethers.getContract('Land');

      expect(await landV2Contract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landV2Contract.isMinter(landAdmin)).to.be.true;
      expect(await landV2Contract.getAdmin()).to.be.equal(landAdmin);
      expect(await landV2Contract.ownerOf(0)).to.be.equal(landAdmin);

      const contract = landV2Contract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(contract.setMinter(ethers.constants.AddressZero, true)).to.be
        .reverted;

      await mintQuad(landAdmin, 24, 24, 0);

      expect(await landV2Contract.balanceOf(landAdmin)).to.be.equal(576 * 2);
    });
  });

  describe('UpgradeV3', function () {
    it('should upgrade to V3 and keep storage intact', async function () {
      const {landContract, getNamedAccounts, mintQuad} = await setupLandV2();
      const {landAdmin, deployer, upgradeAdmin} = await getNamedAccounts();
      const {deploy} = deployments;

      await mintQuad(landAdmin, 24, 0, 0);

      expect(await landContract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landContract.isMinter(landAdmin)).to.be.true;
      expect(await landContract.getAdmin()).to.be.equal(landAdmin);
      expect(await landContract.ownerOf(0)).to.be.equal(landAdmin);

      await deploy('Land', {
        from: deployer,
        contract: 'LandV3',
        proxy: {
          owner: upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
          upgradeIndex: 2,
        },
        log: true,
      });

      const landV3Contract = await ethers.getContract('Land');

      expect(await landV3Contract.balanceOf(landAdmin)).to.be.equal(576);
      expect(await landV3Contract.isMinter(landAdmin)).to.be.true;
      expect(await landV3Contract.getAdmin()).to.be.equal(landAdmin);
      expect(await landV3Contract.ownerOf(0)).to.be.equal(landAdmin);

      const contract = landV3Contract.connect(
        ethers.provider.getSigner(landAdmin)
      );

      await expect(contract.setMinter(ethers.constants.AddressZero, true)).to.be
        .reverted;

      await mintQuad(landAdmin, 24, 24, 0);

      expect(await landV3Contract.balanceOf(landAdmin)).to.be.equal(576 * 2);
    });
  });
});
