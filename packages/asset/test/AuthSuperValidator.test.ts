import {ethers} from 'ethers';
import {expect} from 'chai';
import runSetup from './fixtures/authValidatorFixture';

describe('AuthSuperValidator, (/packages/asset/contracts/AuthSuperValidator.sol)', function () {
  describe('General', function () {
    it('should assign DEFAULT_ADMIN_ROLE to the admin address from the constructor', async function () {
      const {authValidatorAdmin, AuthValidatorContract} = await runSetup();
      const DEFAULT_ADMIN_ROLE =
        await AuthValidatorContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await AuthValidatorContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        authValidatorAdmin.address
      );
      expect(hasRole).to.equal(true);
    });

    it('should not allow DEFAULT_ADMIN_ROLE to be renounced', async function () {
      const {authValidatorAdmin, AuthValidatorContract} = await runSetup();
      const DEFAULT_ADMIN_ROLE =
        await AuthValidatorContract.DEFAULT_ADMIN_ROLE();
      await expect(
        AuthValidatorContract.renounceRole(
          DEFAULT_ADMIN_ROLE,
          authValidatorAdmin.address
        )
      ).to.be.revertedWith('AuthSuperValidator: Admin needed');
    });

    it('should allow admin to set signer for a given contract address', async function () {
      const {MockContract, AuthValidatorContractAsAdmin, backendSigner} =
        await runSetup();
      await expect(
        AuthValidatorContractAsAdmin.setSigner(
          MockContract.address,
          backendSigner.address
        )
      ).to.not.be.reverted;
      const assignedSigner = await AuthValidatorContractAsAdmin.getSigner(
        MockContract.address
      );
      expect(assignedSigner).to.equal(backendSigner.address);
    });

    it('should not allow non-admin to set signer for a given contract address', async function () {
      const {MockContract, AuthValidatorContract, backendSigner, deployer} =
        await runSetup();
      const DEFAULT_ADMIN_ROLE =
        await AuthValidatorContract.DEFAULT_ADMIN_ROLE();
      await expect(
        AuthValidatorContract.setSigner(
          MockContract.address,
          backendSigner.address
        )
      ).to.be.revertedWith(
        `AccessControl: account ${deployer.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });

    it('should allow admin to remove signer for a given contract address', async function () {
      const {MockContract, AuthValidatorContractAsAdmin, backendSigner} =
        await runSetup();
      await AuthValidatorContractAsAdmin.setSigner(
        MockContract.address,
        backendSigner.address
      );
      await AuthValidatorContractAsAdmin.setSigner(
        MockContract.address,
        ethers.constants.AddressZero
      );
      const assignedSigner = await AuthValidatorContractAsAdmin.getSigner(
        MockContract.address
      );
      expect(assignedSigner).to.equal(ethers.constants.AddressZero);
    });

    it('should not allow non-admin to remove signer for a given contract address', async function () {
      const {
        MockContract,
        AuthValidatorContract,
        AuthValidatorContractAsAdmin,
        backendSigner,
        deployer,
      } = await runSetup();
      const DEFAULT_ADMIN_ROLE =
        await AuthValidatorContract.DEFAULT_ADMIN_ROLE();
      await AuthValidatorContractAsAdmin.setSigner(
        MockContract.address,
        backendSigner.address
      );
      await expect(
        AuthValidatorContract.setSigner(
          MockContract.address,
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith(
        `AccessControl: account ${deployer.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
      );
    });
  });

  describe('Signature verification', function () {
    it('should correctly verify signature when a signer is set', async function () {
      const {
        AuthValidatorContractAsAdmin,
        backendSigner,
        authValidatorAdmin,
        createMockSignature,
      } = await runSetup();
      await AuthValidatorContractAsAdmin.setSigner(
        authValidatorAdmin.address,
        backendSigner.address
      );
      const {signature, digest} = await createMockSignature(
        authValidatorAdmin.address,
        backendSigner
      );
      const isValid = await AuthValidatorContractAsAdmin[
        'verify(bytes,bytes32)'
      ](signature, digest);
      expect(isValid).to.equal(true);
    });

    it("should not revert when signature hasn't expired", async function () {
      const {
        AuthValidatorContractAsAdmin,
        backendSigner,
        authValidatorAdmin,
        createMockSignature,
        createMockDigest,
        getCurrentBlockTimestamp,
      } = await runSetup();
      await AuthValidatorContractAsAdmin.setSigner(
        authValidatorAdmin.address,
        backendSigner.address
      );

      const digest = createMockDigest(backendSigner.address);
      const {signature} = await createMockSignature(
        authValidatorAdmin.address,
        backendSigner
      );
      await expect(
        AuthValidatorContractAsAdmin['verify(bytes,bytes32,uint256)'](
          signature,
          digest,
          (await getCurrentBlockTimestamp()) + 10
        )
      ).to.not.be.reverted;
    });

    it('should revert when signature has expired', async function () {
      const {
        AuthValidatorContractAsAdmin,
        backendSigner,
        authValidatorAdmin,
        createMockSignature,
        createMockDigest,
        getCurrentBlockTimestamp,
      } = await runSetup();
      await AuthValidatorContractAsAdmin.setSigner(
        authValidatorAdmin.address,
        backendSigner.address
      );

      const digest = createMockDigest(backendSigner.address);
      const {signature} = await createMockSignature(
        authValidatorAdmin.address,
        backendSigner
      );
      await expect(
        AuthValidatorContractAsAdmin['verify(bytes,bytes32,uint256)'](
          signature,
          digest,
          (await getCurrentBlockTimestamp()) - 10
        )
      ).to.be.revertedWith('AuthSuperValidator: Expired');
    });

    it('should revert when signature is not valid', async function () {
      const {
        AuthValidatorContractAsAdmin,
        backendSigner,
        authValidatorAdmin,
        createMockSignature,
        createMockDigest,
      } = await runSetup();
      await AuthValidatorContractAsAdmin.setSigner(
        authValidatorAdmin.address,
        backendSigner.address
      );

      // digest is using different address on purpose
      const digest = createMockDigest(backendSigner.address);
      const {signature} = await createMockSignature(
        authValidatorAdmin.address,
        backendSigner
      );
      const isValid = await AuthValidatorContractAsAdmin[
        'verify(bytes,bytes32)'
      ](signature, digest);
      expect(isValid).to.equal(false);
    });

    it('should revert when there is no signer assigned for a given contract address', async function () {
      const {
        AuthValidatorContractAsAdmin,
        createMockSignature,
        authValidatorAdmin,
        backendSigner,
      } = await runSetup();
      const {signature, digest} = await createMockSignature(
        authValidatorAdmin.address,
        backendSigner
      );
      await expect(
        AuthValidatorContractAsAdmin['verify(bytes,bytes32)'](signature, digest)
      ).to.be.revertedWith('AuthSuperValidator: No signer');
    });
  });
});
