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
import {setupSignedCallerWithTokenHolder} from './fixtures';
import {Claim, TokenType} from './claim';

describe('SignedMultiGiveaway implemented with SignerCaller.sol and TokenHolder.sol', function () {
  describe('claim', function () {
    it('should be able to claim', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      const expiration = (await time.latest()) + 60 * 60 * 24;
      await fixtures.signAndClaim(
        [claimId],
        claims,
        fixtures.signer,
        expiration
      );
      expect(await fixtures.signerCaller.contract.isClaimed(claimId)).to.be
        .true;
    });
    it('should be able to claim multiple tokens', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123,
        },
        {
          tokenType: TokenType.ERC721_SAFE,
          token: fixtures.landToken,
          tokenId: 124,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456,
          amount,
          data: [],
        },
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [457, 458],
          amounts: [12, 13],
          data: [],
        },
      ];
      await fixtures.tokenHolder.contractAsAdmin.setMaxTransferEntries(
        claims.length
      );
      await fixtures.signAndClaim([claimId], claims);
    });
    it('should be able to claim with approve', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandToken.mint(fixtures.other.address, amount);
      await fixtures.sandTokenAsOther.approve(
        fixtures.tokenHolder.contract.address,
        amount
      );
      const pre = await fixtures.balances(fixtures.other.address, claims);
      const preDest = await fixtures.balances(fixtures.dest.address, claims);
      const data = await fixtures.getTxData(
        claims,
        fixtures.other.address,
        fixtures.dest.address
      );
      const sig = await signedClaimSignature(
        fixtures.signerCaller.contract,
        fixtures.signer.address,
        [claimId],
        0,
        fixtures.tokenHolder.contract.address,
        data
      );
      await fixtures.signerCaller.contract.claim(
        [sig],
        [claimId],
        0,
        fixtures.tokenHolder.contract.address,
        data
      );
      await fixtures.checkBalances(
        fixtures.other.address,
        pre,
        preDest,
        claims
      );
    });

    describe('multiple signatures', function () {
      it('should be able to claim with N signatures', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
        const pre = await fixtures.balances(
          fixtures.tokenHolder.contract.address,
          claims
        );
        const preDest = await fixtures.balances(fixtures.dest.address, claims);

        const data = await fixtures.getTxData(
          claims,
          fixtures.tokenHolder.contract.address,
          fixtures.dest.address
        );
        const sig1 = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.signer.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        const signerRole =
          await fixtures.signerCaller.contractAsAdmin.SIGNER_ROLE();
        await fixtures.signerCaller.contractAsAdmin.grantRole(
          signerRole,
          fixtures.other.address
        );
        const sig2 = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.other.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        await fixtures.signerCaller.contractAsAdmin.setNumberOfSignaturesNeeded(
          fixtures.tokenHolder.contract.address,
          2
        );
        await fixtures.signerCaller.contract.claim(
          [sig1, sig2],
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        await fixtures.checkBalances(
          fixtures.tokenHolder.contract.address,
          pre,
          preDest,
          claims
        );
      });
      it('signatures must be in order other < signer', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
        const data = await fixtures.getTxData(
          claims,
          fixtures.tokenHolder.contract.address,
          fixtures.dest.address
        );
        const sig1 = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.signer.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        const signerRole =
          await fixtures.signerCaller.contractAsAdmin.SIGNER_ROLE();
        await fixtures.signerCaller.contractAsAdmin.grantRole(
          signerRole,
          fixtures.other.address
        );
        const sig2 = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.other.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        await fixtures.signerCaller.contractAsAdmin.setNumberOfSignaturesNeeded(
          fixtures.tokenHolder.contract.address,
          2
        );
        // sigs must have the right order signer < other
        await expect(
          fixtures.signerCaller.contract.claim(
            [sig2, sig1],
            [claimId],
            0,
            fixtures.tokenHolder.contract.address,
            data
          )
        ).to.revertedWith('invalid order');
      });
    });
    it('should fail to claim the same id twice', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.utils.parseEther('5'),
        },
      ];
      await fixtures.signAndClaim([1, 2, 3, claimId], claims);
      await expect(
        fixtures.signAndClaim([claimId, 4, 5, 6], claims)
      ).to.be.revertedWith('already claimed');
    });
    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.utils.parseEther('5'),
        },
      ];
      await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
      const data = await fixtures.getTxData(
        claims,
        fixtures.tokenHolder.contract.address,
        fixtures.dest.address
      );
      const {v, r, s} = await signedClaimSignature(
        fixtures.signerCaller.contract,
        fixtures.signer.address,
        [claimId.add(1)],
        0,
        fixtures.tokenHolder.contract.address,
        data
      );
      await expect(
        fixtures.signerCaller.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        )
      ).to.be.revertedWith('invalid signer');
    });
    it('should fail to mint if the signer is invalid', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.utils.parseEther('5'),
        },
      ];
      await expect(
        fixtures.signAndClaim([claimId], claims, fixtures.other)
      ).to.be.revertedWith('invalid signer');
    });

    it('claim with metaTX trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

      const claimId = BigNumber.from(0x123);
      const amount = ethers.utils.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
      const pre = await fixtures.balances(
        fixtures.tokenHolder.contract.address,
        claims
      );
      const preDest = await fixtures.balances(fixtures.dest.address, claims);
      const data = await fixtures.getTxData(
        claims,
        fixtures.tokenHolder.contract.address,
        fixtures.dest.address
      );
      const {v, r, s} = await signedClaimSignature(
        fixtures.signerCaller.contract,
        fixtures.signer.address,
        [claimId],
        0,
        fixtures.tokenHolder.contract.address,
        data
      );
      const contractAsTrustedForwarder =
        await fixtures.signerCaller.contactDeploy.connect(
          fixtures.trustedForwarder
        );
      const txData = await contractAsTrustedForwarder.populateTransaction.claim(
        [{v, r, s}],
        [claimId],
        0,
        fixtures.tokenHolder.contract.address,
        data
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other.address]
      );
      await contractAsTrustedForwarder.signer.sendTransaction(txData);
      await fixtures.checkBalances(
        fixtures.tokenHolder.contract.address,
        pre,
        preDest,
        claims
      );
    });
    describe('recoverAssets', function () {
      it('admin should be able to recover assets', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
        const pre = BigNumber.from(
          await fixtures.sandToken.balanceOf(
            fixtures.tokenHolder.contract.address
          )
        );
        await fixtures.tokenHolder.contractAsAdmin.recoverAssets(
          await fixtures.tokenHolder.getTransfers(
            claims,
            fixtures.tokenHolder.contract.address,
            fixtures.other.address
          )
        );
        const pos = BigNumber.from(
          await fixtures.sandToken.balanceOf(
            fixtures.tokenHolder.contract.address
          )
        );
        expect(pos).to.be.equal(pre.sub(amount));
      });
      it('should fail to recover assets if not admin', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
        const transfers = await fixtures.tokenHolder.getTransfers(
          claims,
          fixtures.tokenHolder.contract.address,
          fixtures.other.address
        );
        await expect(
          fixtures.tokenHolder.contract.recoverAssets(transfers)
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.tokenHolder.contractAsBackofficeAdmin.recoverAssets(
            transfers
          )
        ).to.be.revertedWith('only admin');
      });
    });

    describe('revoke', function () {
      it('should fail to revoke if not admin', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        await expect(
          fixtures.signerCaller.contract.revokeClaims([claimId])
        ).to.be.revertedWith('only admin');
      });
      it('should fail to claim if the id was revoked', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.signerCaller.contractAsAdmin.revokeClaims([claimId]);
        await expect(
          fixtures.signAndClaim([claimId], claims)
        ).to.be.revertedWith('already claimed');
      });
    });
    describe('pause', function () {
      it('should fail to pause if not admin', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        await expect(fixtures.tokenHolder.contract.pause()).to.be.revertedWith(
          'only backoffice'
        );
      });
      it('should fail to unpause if not admin', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        await fixtures.tokenHolder.contractAsAdmin.pause();
        await expect(
          fixtures.tokenHolder.contract.unpause()
        ).to.be.revertedWith('only admin');
      });
      it('should fail to claim if paused by backoffice admin', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.tokenHolder.contractAsBackofficeAdmin.pause();
        await expect(
          fixtures.signAndClaim([claimId], claims)
        ).to.be.revertedWith('Pausable: paused');
      });
      it('should be able to claim sand after pause/unpause', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.tokenHolder.contractAsAdmin.pause();
        await expect(
          fixtures.signAndClaim([claimId], claims)
        ).to.be.revertedWith('Pausable: paused');

        await fixtures.tokenHolder.contractAsAdmin.unpause();

        await fixtures.signAndClaim([claimId], claims);
      });
    });

    describe('fixed limits', function () {
      it('admin should be able to set limits', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        expect(
          await fixtures.signerCaller.contractAsAdmin.getNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address
          )
        ).to.be.equal(1);
        await expect(
          fixtures.signerCaller.contractAsAdmin.setNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address,
            2
          )
        )
          .to.emit(
            fixtures.signerCaller.contract,
            'NumberOfSignaturesNeededSet'
          )
          .withArgs(
            fixtures.tokenHolder.contract.address,
            2,
            fixtures.admin.address
          );
        expect(
          await fixtures.signerCaller.contractAsAdmin.getNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address
          )
        ).to.be.equal(2);

        expect(
          await fixtures.tokenHolder.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(1);
        await expect(
          fixtures.tokenHolder.contractAsAdmin.setMaxTransferEntries(2)
        )
          .to.emit(fixtures.tokenHolder.contract, 'MaxTransferEntriesSet')
          .withArgs(2, fixtures.admin.address);
        expect(
          await fixtures.tokenHolder.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(2);
      });

      it('others should fail to set limits', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        await expect(
          fixtures.tokenHolder.contractAsBackofficeAdmin.setMaxTransferEntries(
            1
          )
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.signerCaller.contractAsOperator.setNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address,
            1
          )
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.tokenHolder.contract.setMaxTransferEntries(1)
        ).to.be.revertedWith('only admin');
        await expect(
          fixtures.signerCaller.contract.setNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address,
            1
          )
        ).to.be.revertedWith('only admin');
      });

      it('numberOfSignaturesNeeded should be grater than 0', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        await expect(
          fixtures.signerCaller.contractAsAdmin.setNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address,
            0
          )
        ).to.be.revertedWith('invalid numberOfSignaturesNeeded');
      });
      it('maxTransferEntries should be grater than 0', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        await expect(
          fixtures.tokenHolder.contractAsAdmin.setMaxTransferEntries(0)
        ).to.be.revertedWith('invalid maxTransferEntries');
      });

      it('should fail to claim if over max entries', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
          {
            tokenType: TokenType.ERC721,
            token: fixtures.landToken,
            tokenId: 123,
          },
          {
            tokenType: TokenType.ERC1155,
            token: fixtures.assetToken,
            tokenId: 456,
            amount,
            data: [],
          },
        ];
        await fixtures.tokenHolder.contractAsAdmin.setMaxTransferEntries(2);
        expect(
          await fixtures.tokenHolder.contractAsAdmin.getMaxTransferEntries()
        ).to.be.equal(2);
        await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
          'too many transfers'
        );
      });

      it('should fail to claim if not enough signatures', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.signerCaller.contractAsAdmin.setNumberOfSignaturesNeeded(
          fixtures.tokenHolder.contract.address,
          2
        );
        expect(
          await fixtures.signerCaller.contractAsAdmin.getNumberOfSignaturesNeeded(
            fixtures.tokenHolder.contract.address
          )
        ).to.be.equal(2);
        await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
          'not enough signatures'
        );
      });
      it('signatures should expire', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        const expiration = (await time.latest()) + 60 * 60;
        await time.increase(60 * 60 * 24);
        await expect(
          fixtures.signAndClaim([claimId], claims, fixtures.signer, expiration)
        ).to.revertedWith('expired');
      });
    });

    describe('coverage', function () {
      it('a valid signature must verify correctly', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: ethers.utils.parseEther('5'),
          },
        ];
        await fixtures.mintTo(fixtures.tokenHolder.contract.address, claims);
        const data = await fixtures.getTxData(
          claims,
          fixtures.other.address,
          fixtures.dest.address
        );
        const {v, r, s} = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.signer.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        expect(
          await fixtures.signerCaller.contract.verifySignature(
            {v, r, s},
            [claimId],
            0,
            fixtures.tokenHolder.contract.address,
            data
          )
        ).to.equal(fixtures.signer.address);
      });
      it('check the trusted forwarder', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);
        expect(
          await fixtures.signerCaller.contract.getTrustedForwarder()
        ).to.be.equal(fixtures.trustedForwarder.address);
        expect(
          await fixtures.tokenHolder.contract.getTrustedForwarder()
        ).to.be.equal(fixtures.trustedForwarder.address);
        expect(
          await fixtures.signerCaller.contract.trustedForwarder()
        ).to.be.equal(fixtures.trustedForwarder.address);
        expect(
          await fixtures.tokenHolder.contract.trustedForwarder()
        ).to.be.equal(fixtures.trustedForwarder.address);
      });
      it('check the domain separator', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const typeHash = keccak256(
          toUtf8Bytes(
            'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
          )
        );
        const hashedName = ethers.utils.keccak256(
          toUtf8Bytes('Sandbox SignedCaller')
        );
        const versionHash = ethers.utils.keccak256(toUtf8Bytes('1.0'));
        const network =
          await fixtures.signerCaller.contract.provider.getNetwork();
        const domainSeparator = ethers.utils.keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
              typeHash,
              hashedName,
              versionHash,
              network.chainId,
              fixtures.signerCaller.contract.address,
            ]
          )
        );
        expect(
          await fixtures.signerCaller.contract.domainSeparator()
        ).to.be.equal(domainSeparator);
      });
      it('should fail to claim with no balance', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        const data = await fixtures.getTxData(
          claims,
          fixtures.other.address,
          fixtures.dest.address
        );
        const sig = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.signer.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        await expect(
          fixtures.signerCaller.contract.claim(
            [sig],
            [claimId],
            0,
            fixtures.tokenHolder.contract.address,
            data
          )
        ).to.revertedWith('ERC20: insufficient allowance');
      });
      it('should fail to claim with approve when no balance', async function () {
        const fixtures = await loadFixture(setupSignedCallerWithTokenHolder);

        const claimId = BigNumber.from(0x123);
        const amount = ethers.utils.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.sandTokenAsOther.approve(
          fixtures.tokenHolder.contract.address,
          amount
        );
        const data = await fixtures.getTxData(
          claims,
          fixtures.other.address,
          fixtures.dest.address
        );
        const sig = await signedClaimSignature(
          fixtures.signerCaller.contract,
          fixtures.signer.address,
          [claimId],
          0,
          fixtures.tokenHolder.contract.address,
          data
        );
        await expect(
          fixtures.signerCaller.contract.claim(
            [sig],
            [claimId],
            0,
            fixtures.tokenHolder.contract.address,
            data
          )
        ).to.revertedWith('ERC20: transfer amount exceeds balance');
      });
    });
  });
});
