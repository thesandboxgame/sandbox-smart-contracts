import {ethers} from 'hardhat';
import {
  defaultAbiCoder,
  keccak256,
  solidityPack,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import {BigNumber} from 'ethers';
import {signedClaimSignature} from './signature';
import {expect} from 'chai';
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';
import {setupSignedCaller} from './fixtures';
import {Claim, TokenType} from './claim';

describe('SignedCaller.sol', function () {
  describe('initialization', function () {
    it('interfaces', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
        IAccessControlEnumerable: '0x5a05180f',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.contract.supportsInterface(i)).to.be.true;
      }
      // for coverage
      expect(await fixtures.contract.supportsInterface('0xffffffff')).to.be
        .false;
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.contract.hasRole(
          defaultAdminRole,
          fixtures.admin.address
        )
      ).to.be.true;
    });

    it('signer', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const signerRole = await fixtures.contract.SIGNER_ROLE();
      expect(
        await fixtures.contract.hasRole(signerRole, fixtures.signer.address)
      ).to.be.true;
    });
  });

  describe('claim', function () {
    it('should be able to claim', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount,
      };
      const expiration = (await time.latest()) + 60 * 60 * 24;
      await fixtures.signAndClaim(
        [claimId],
        claim,
        fixtures.signer,
        expiration
      );
      expect(await fixtures.contract.isClaimed(claimId)).to.be.true;
    });
    it('should fail to call an invalid address', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      const addr = fixtures.other.address;
      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const data = await fixtures.getTxData(
        fixtures.contract.address,
        fixtures.dest.address,
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        }
      );
      const sig = await signedClaimSignature(
        fixtures.contract,
        fixtures.signer.address,
        [claimId],
        0,
        addr,
        data
      );
      await expect(
        fixtures.contract.claim([sig], [claimId], 0, addr, data)
      ).to.revertedWith('Address: call to non-contract');
    });
    it('should fail to call an invalid function signature', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const data = await fixtures.getTxData(
        fixtures.contract.address,
        fixtures.dest.address,
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        }
      );
      const sig = await signedClaimSignature(
        fixtures.contract,
        fixtures.signer.address,
        [claimId],
        0,
        fixtures.landToken.address,
        data
      );
      await expect(
        fixtures.contract.claim(
          [sig],
          [claimId],
          0,
          fixtures.landToken.address,
          data
        )
      ).to.revertedWith('Address: low-level call failed');
    });
    describe('multiple signatures', function () {
      it('should be able to claim with N signatures', async function () {
        const fixtures = await loadFixture(setupSignedCaller);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claim: Claim = {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        };
        await fixtures.mintTo(fixtures.contract.address, [claim]);
        const pre = await fixtures.balances(fixtures.contract.address, [claim]);
        const preDest = await fixtures.balances(fixtures.dest.address, [claim]);
        const data = await fixtures.getTxData(
          fixtures.contract.address,
          fixtures.dest.address,
          claim
        );
        const sig1 = await signedClaimSignature(
          fixtures.contract,
          fixtures.signer.address,
          [claimId],
          0,
          claim.token.address,
          data
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(
          signerRole,
          fixtures.other.address
        );
        const sig2 = await signedClaimSignature(
          fixtures.contract,
          fixtures.other.address,
          [claimId],
          0,
          claim.token.address,
          data
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(
          claim.token.address,
          2
        );
        await fixtures.contract.claim(
          [sig1, sig2],
          [claimId],
          0,
          claim.token.address,
          data
        );
        await fixtures.checkBalances(fixtures.contract.address, pre, preDest, [
          claim,
        ]);
      });
      it('signatures must be in order other < signer', async function () {
        const fixtures = await loadFixture(setupSignedCaller);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claim: Claim = {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        };
        await fixtures.mintTo(fixtures.contract.address, [claim]);
        const data = await fixtures.getTxData(
          fixtures.contract.address,
          fixtures.dest.address,
          claim
        );
        const sig1 = await signedClaimSignature(
          fixtures.contract,
          fixtures.signer.address,
          [claimId],
          0,
          claim.token.address,
          data
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(
          signerRole,
          fixtures.other.address
        );
        const sig2 = await signedClaimSignature(
          fixtures.contract,
          fixtures.other.address,
          [claimId],
          0,
          claim.token.address,
          data
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(
          claim.token.address,
          2
        );
        // sigs must have the right order signer < other
        await expect(
          fixtures.contract.claim(
            [sig2, sig1],
            [claimId],
            0,
            claim.token.address,
            data
          )
        ).to.revertedWith('invalid order');
      });
    });
    it('should fail to claim the same id twice', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount: ethers.utils.parseEther('5'),
      };
      await fixtures.signAndClaim([1, 2, 3, claimId], claim);
      await expect(
        fixtures.signAndClaim([claimId, 4, 5, 6], claim)
      ).to.be.revertedWith('already claimed');
    });
    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount: ethers.utils.parseEther('5'),
      };
      await fixtures.mintTo(fixtures.contract.address, [claim]);
      const data = await fixtures.getTxData(
        fixtures.contract.address,
        fixtures.dest.address,
        claim
      );
      const {v, r, s} = await signedClaimSignature(
        fixtures.contract,
        fixtures.other.address,
        [claimId],
        0,
        claim.token.address,
        data
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          claim.token.address,
          data
        )
      ).to.be.revertedWith('invalid signer');
    });
    it('should fail to claim if the signer is invalid', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount: ethers.utils.parseEther('5'),
      };
      await expect(
        fixtures.signAndClaim([claimId], claim, fixtures.other)
      ).to.be.revertedWith('invalid signer');
    });

    it('claim with metaTX trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount,
      };
      await fixtures.mintTo(fixtures.contract.address, [claim]);
      const pre = await fixtures.balances(fixtures.contract.address, [claim]);
      const preDest = await fixtures.balances(fixtures.dest.address, [claim]);
      const data = await fixtures.getTxData(
        fixtures.contract.address,
        fixtures.dest.address,
        claim
      );
      const {v, r, s} = await signedClaimSignature(
        fixtures.contract,
        fixtures.signer.address,
        [claimId],
        0,
        claim.token.address,
        data
      );

      const contractAsTrustedForwarder = await fixtures.contactDeploy.connect(
        fixtures.trustedForwarder
      );
      const txData = await contractAsTrustedForwarder.populateTransaction.claim(
        [{v, r, s}],
        [claimId],
        0,
        claim.token.address,
        data
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other.address]
      );
      await contractAsTrustedForwarder.signer.sendTransaction(txData);
      await fixtures.checkBalances(fixtures.contract.address, pre, preDest, [
        claim,
      ]);
    });
  });
  describe('revoke', function () {
    it('should fail to revoke if not admin', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      await expect(
        fixtures.contract.revokeClaims([claimId])
      ).to.be.revertedWith('only admin');
    });
    it('should fail to claim if the id was revoked', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount: ethers.utils.parseEther('5'),
      };
      await fixtures.contractAsAdmin.revokeClaims([claimId]);
      await expect(fixtures.signAndClaim([claimId], claim)).to.be.revertedWith(
        'already claimed'
      );
    });
  });
  describe('fixed limits', function () {
    it('admin should be able to set limits', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded(
          fixtures.sandToken.address
        )
      ).to.be.equal(1);
      await expect(
        fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(
          fixtures.sandToken.address,
          2
        )
      )
        .to.emit(fixtures.contract, 'NumberOfSignaturesNeededSet')
        .withArgs(fixtures.sandToken.address, 2, fixtures.admin.address);
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded(
          fixtures.sandToken.address
        )
      ).to.be.equal(2);
    });

    it('others should fail to set limits', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      await expect(
        fixtures.contractAsOperator.setNumberOfSignaturesNeeded(
          fixtures.sandToken.address,
          1
        )
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contract.setNumberOfSignaturesNeeded(
          fixtures.sandToken.address,
          1
        )
      ).to.be.revertedWith('only admin');
    });

    it('numberOfSignaturesNeeded should be grater than 0', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      await expect(
        fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(
          fixtures.sandToken.address,
          0
        )
      ).to.be.revertedWith('invalid numberOfSignaturesNeeded');
    });
    it('should fail to claim if not enough signatures', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount,
      };
      await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(
        fixtures.sandToken.address,
        2
      );
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded(
          fixtures.sandToken.address
        )
      ).to.be.equal(2);
      await expect(fixtures.signAndClaim([claimId], claim)).to.revertedWith(
        'not enough signatures'
      );
    });
    it('signatures should expire', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount,
      };
      const expiration = (await time.latest()) + 60 * 60;
      await time.increase(60 * 60 * 24);
      await expect(
        fixtures.signAndClaim([claimId], claim, fixtures.signer, expiration)
      ).to.revertedWith('expired');
    });
  });

  describe('coverage', function () {
    it('a valid signature must verify correctly', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const claimId = BigNumber.from(0x123);
      const claim: Claim = {
        tokenType: TokenType.ERC20,
        token: fixtures.sandToken,
        amount: ethers.utils.parseEther('5'),
      };
      const data = await fixtures.getTxData(
        fixtures.contract.address,
        fixtures.dest.address,
        claim
      );
      const {v, r, s} = await signedClaimSignature(
        fixtures.contract,
        fixtures.signer.address,
        [claimId],
        0,
        claim.token.address,
        data
      );
      expect(
        await fixtures.contract.verifySignature(
          {v, r, s},
          [claimId],
          0,
          claim.token.address,
          data
        )
      ).to.equal(fixtures.signer.address);
    });
    it('check the trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      expect(await fixtures.contract.getTrustedForwarder()).to.be.equal(
        fixtures.trustedForwarder.address
      );
      expect(await fixtures.contract.trustedForwarder()).to.be.equal(
        fixtures.trustedForwarder.address
      );
    });
    it('check the domain separator', async function () {
      const fixtures = await loadFixture(setupSignedCaller);

      const typeHash = keccak256(
        toUtf8Bytes(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
        )
      );
      const hashedName = ethers.utils.keccak256(
        toUtf8Bytes('Sandbox SignedCaller')
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
    it('should fail to initialize twice', async function () {
      const fixtures = await loadFixture(setupSignedCaller);
      await expect(
        fixtures.contractAsDeployer.initialize(
          fixtures.trustedForwarder.address,
          fixtures.admin.address
        )
      ).to.revertedWith('Initializable: contract is already initialized');
    });
  });
});
