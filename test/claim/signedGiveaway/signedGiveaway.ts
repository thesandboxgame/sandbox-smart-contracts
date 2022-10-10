import {ethers} from 'hardhat';
import {expect} from '../../chai-setup';
import {
  defaultAbiCoder,
  keccak256,
  solidityPack,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import {setupSignedGiveway} from './fixtures';
import {BigNumber} from 'ethers';
import {toWei} from '../../utils';
import {signedGiveawaySignature} from './signature';

describe('SignedGiveaway.sol', function () {
  describe('initialization', function () {
    it('interfaces', async function () {
      const fixtures = await setupSignedGiveway();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.contract.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await setupSignedGiveway();
      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.contract.hasRole(defaultAdminRole, fixtures.adminRole)
      ).to.be.true;
    });

    it('signer', async function () {
      const fixtures = await setupSignedGiveway();
      const signerRole = await fixtures.contract.SIGNER_ROLE();
      expect(await fixtures.contract.hasRole(signerRole, fixtures.signer)).to.be
        .true;
    });
  });

  describe('claim', function () {
    it('should be able to claim sand', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const pre = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      const preDest = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.dest)
      );
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      )
        .to.emit(fixtures.contract, 'Claimed')
        .withArgs(
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        );
      expect(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      ).to.be.equal(pre.sub(amount));
      expect(await fixtures.sandToken.balanceOf(fixtures.dest)).to.be.equal(
        preDest.add(amount)
      );
    });
    it('should fail to claim the same id twice', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      await fixtures.contract.claim(
        v,
        r,
        s,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Already claimed');
    });
    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId.add(1),
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Invalid signature');
    });
    it('should fail to mint if the signer is invalid', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.other,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.other,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Invalid signer');
    });

    it('claim with metaTX trusted forwarder', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const pre = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      const preDest = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.dest)
      );
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );

      const contractAsTrustedForwarder = await ethers.getContract(
        'SignedGiveaway',
        fixtures.trustedForwarder
      );

      const txData = await contractAsTrustedForwarder.populateTransaction.claim(
        v,
        r,
        s,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await contractAsTrustedForwarder.signer.sendTransaction(txData);

      expect(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      ).to.be.equal(pre.sub(amount));
      expect(await fixtures.sandToken.balanceOf(fixtures.dest)).to.be.equal(
        preDest.add(amount)
      );
    });
  });
  describe('revoke', function () {
    it('should fail to revoke if not admin', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.contract.revokeClaims([claimId])
      ).to.be.revertedWith('Only admin');
    });
    it('should fail to claim if the id was revoked', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.revokeClaims([claimId]);

      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );

      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Already claimed');
    });
  });
  describe('pause', function () {
    it('should fail to pause if not admin', async function () {
      const fixtures = await setupSignedGiveway();
      await expect(fixtures.contract.pause()).to.be.revertedWith('Only admin');
    });
    it('should fail to unpause if not admin', async function () {
      const fixtures = await setupSignedGiveway();
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.pause();
      await expect(fixtures.contract.unpause()).to.be.revertedWith(
        'Only admin'
      );
    });
    it('should fail to claim if paused', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );
      await contractAsAdmin.pause();

      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );

      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should be able to claim sand after pause/unpause', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));

      const pre = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      );
      const preDest = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.dest)
      );
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );

      const contractAsAdmin = await ethers.getContract(
        'SignedGiveaway',
        fixtures.adminRole
      );

      await contractAsAdmin.pause();

      await expect(
        fixtures.contract.claim(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.be.revertedWith('Pausable: paused');

      await contractAsAdmin.unpause();

      await fixtures.contract.claim(
        v,
        r,
        s,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      expect(
        await fixtures.sandToken.balanceOf(fixtures.contract.address)
      ).to.be.equal(pre.sub(amount));
      expect(await fixtures.sandToken.balanceOf(fixtures.dest)).to.be.equal(
        preDest.add(amount)
      );
    });
  });

  describe('coverage', function () {
    it('a valid signature must verify correctly', async function () {
      const fixtures = await setupSignedGiveway();
      const claimId = BigNumber.from(0x123);
      const amount = toWei(5);
      await fixtures.mint(amount.mul(10));
      const {v, r, s} = await signedGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        claimId,
        fixtures.sandToken.address,
        fixtures.dest,
        amount
      );
      expect(
        await fixtures.contract.verify(
          v,
          r,
          s,
          fixtures.signer,
          claimId,
          fixtures.sandToken.address,
          fixtures.dest,
          amount
        )
      ).to.equal(true);
    });
    it('check the domain separator', async function () {
      const fixtures = await setupSignedGiveway();
      const typeHash = keccak256(
        toUtf8Bytes(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
        )
      );
      const hashedName = ethers.utils.keccak256(
        toUtf8Bytes('Sandbox SignedERC20Giveaway')
      );
      const versionHash = ethers.utils.keccak256(toUtf8Bytes('1.0'));
      const network = await fixtures.contract.provider.getNetwork();
      const domainSeparator = ethers.utils.keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            typeHash,
            hashedName,
            versionHash,
            network.chainId,
            fixtures.contract.address,
          ]
        )
      );
      expect(await fixtures.contract.domainSeparator()).to.be.equal(
        domainSeparator
      );
    });
  });
});
