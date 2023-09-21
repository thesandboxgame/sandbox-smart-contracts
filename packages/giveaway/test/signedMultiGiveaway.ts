import {ethers} from 'hardhat';
import {
  Claim,
  ClaimEntry,
  getClaimEntires,
  signedMultiGiveawaySignature,
  TokenType,
} from './signature';
import {expect} from 'chai';
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';
import {deploySignedMultiGiveaway, setupSignedMultiGiveaway} from './fixtures';
import {AbiCoder} from 'ethers';

describe('SignedMultiGiveaway.sol', function () {
  describe('initialization', function () {
    it('should fail to call implementation initialization', async function () {
      const {implementation} = await loadFixture(deploySignedMultiGiveaway);
      const [, , trustedForwarder, admin] = await ethers.getSigners();
      await expect(
        implementation.initialize(
          await trustedForwarder.getAddress(),
          await admin.getAddress()
        )
      ).to.revertedWith('Initializable: contract is already initialized');
    });

    it('initialization event', async function () {
      const {contract, deployer, trustedForwarder, admin} = await loadFixture(
        deploySignedMultiGiveaway
      );
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      // Initialize
      const tx = contract.initialize(
        await trustedForwarder.getAddress(),
        await admin.getAddress()
      );
      await expect(tx)
        .to.emit(contract, 'TrustedForwarderSet')
        .withArgs(
          ethers.ZeroAddress,
          await trustedForwarder.getAddress(),
          await deployer.getAddress()
        );
      await expect(tx)
        .to.emit(contract, 'RoleGranted')
        .withArgs(
          defaultAdminRole,
          await admin.getAddress(),
          await deployer.getAddress()
        );
    });

    it('interfaces', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
        IERC721Receiver: '0x150b7a02',
        IERC1155Receiver: '0x4e2312e0',
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
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.contract.hasRole(
          defaultAdminRole,
          await fixtures.admin.getAddress()
        )
      ).to.be.true;
    });

    it('backoffice admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const backofficeRole = await fixtures.contract.BACKOFFICE_ROLE();
      expect(
        await fixtures.contract.hasRole(
          backofficeRole,
          await fixtures.admin.getAddress()
        )
      ).to.be.true;
      expect(
        await fixtures.contract.hasRole(
          backofficeRole,
          await fixtures.backofficeAdmin.getAddress()
        )
      ).to.be.true;
    });

    it('signer', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const signerRole = await fixtures.contract.SIGNER_ROLE();
      expect(
        await fixtures.contract.hasRole(
          signerRole,
          await fixtures.signer.getAddress()
        )
      ).to.be.true;
    });
  });

  describe('claim', function () {
    it('should be able to claim', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
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
      expect(await fixtures.contract.isClaimed(claimId)).to.be.true;
    });
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('simulate a call so we can compare in the backend tests', async function () {
      const to = '0x5085e160fefF4DEfaa7F69782C3c70f4fB6d2F3e';
      const token = await ethers.getContractAt(
        'FakeMintableERC20',
        '0x3205278179ebfF7cB75b010909fA45a9F20dF7Fa'
      );
      // 0xa7D35eBFC30c849280E11be50bfd8fBE6F1c55AA
      const pk =
        '0x9f7bd9216e2afbc15eb7744fb15af5b74715a929b1f8bed316543fd9df69c87e';
      const signer = new ethers.Wallet(pk, ethers.provider);
      const contract = await ethers.getContractAt(
        'SignedMultiGiveaway',
        '0xaBe4FF8922a4476E94d3A8960021e4d3C7127721',
        signer
      );
      const claimIds = [0x123n];
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token,
          amount: 0x123n,
        },
        {
          tokenType: TokenType.ERC721,
          token,
          tokenId: 0x123n,
        },
        {
          tokenType: TokenType.ERC721_BATCH,
          token,
          tokenIds: [0x123n, 0x124n],
        },
        {
          tokenType: TokenType.ERC1155,
          token,
          tokenId: 0x123n,
          amount: 0x123n,
          data: '0x',
        },
        {
          tokenType: TokenType.ERC1155_BATCH,
          token,
          tokenIds: [0x123n, 0x124n],
          amounts: [0x123n, 0x124n],
          data: '0x',
        },
      ];
      const expiration = 0;
      const from = await contract.getAddress();
      const {v, r, s} = await signedMultiGiveawaySignature(
        contract,
        await signer.getAddress(),
        claimIds,
        expiration,
        from,
        to,
        await getClaimEntires(claims),
        pk
      );
      const ret = await contract.claim.populateTransaction(
        [{v, r, s}],
        claimIds,
        expiration,
        from,
        to,
        await getClaimEntires(claims)
      );
      console.log(ret);
    });

    it('should be able to claim multiple tokens', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123n,
        },
        {
          tokenType: TokenType.ERC721_SAFE,
          token: fixtures.landToken,
          tokenId: 124n,
        },
        {
          tokenType: TokenType.ERC721_BATCH,
          token: fixtures.landToken,
          tokenIds: [125n, 126n],
        },
        {
          tokenType: TokenType.ERC721_SAFE_BATCH,
          token: fixtures.landToken,
          tokenIds: [127n, 128n],
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456n,
          amount,
          data: '0x',
        },
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [457n, 458n],
          amounts: [12n, 13n],
          data: '0x',
        },
      ];
      await fixtures.contractAsAdmin.setMaxClaimEntries(claims.length);
      await fixtures.signAndClaim([claimId], claims);
    });

    it('should be able to claim with approve', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandToken.mint(await fixtures.other.getAddress(), amount);
      await fixtures.sandTokenAsOther.approve(
        await fixtures.contract.getAddress(),
        amount
      );
      const pre = await fixtures.balances(
        await fixtures.other.getAddress(),
        claims
      );
      const preDest = await fixtures.balances(
        await fixtures.dest.getAddress(),
        claims
      );
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.other.getAddress(),
        await fixtures.dest.getAddress(),
        await await getClaimEntires(claims)
      );
      await fixtures.contract.claim(
        [sig],
        [claimId],
        0,
        await fixtures.other.getAddress(),
        await fixtures.dest.getAddress(),
        await await getClaimEntires(claims)
      );
      await fixtures.checkBalances(
        await fixtures.other.getAddress(),
        pre,
        preDest,
        claims
      );
    });

    describe('multiple signatures', function () {
      it('should be able to claim with N signatures', async function () {
        const fixtures = await loadFixture(setupSignedMultiGiveaway);

        const claimId = 0x123n;
        const amount = ethers.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintToContract(
          await fixtures.contract.getAddress(),
          claims
        );
        const pre = await fixtures.balances(
          await fixtures.contract.getAddress(),
          claims
        );
        const preDest = await fixtures.balances(
          await fixtures.dest.getAddress(),
          claims
        );
        const sig1 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await await getClaimEntires(claims)
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(
          signerRole,
          await fixtures.other.getAddress()
        );
        const sig2 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.other,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await await getClaimEntires(claims)
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);
        await fixtures.contract.claim(
          [sig1, sig2],
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await await getClaimEntires(claims)
        );
        await fixtures.checkBalances(
          await fixtures.contract.getAddress(),
          pre,
          preDest,
          claims
        );
      });

      it('signatures must be in order other < signer', async function () {
        const fixtures = await loadFixture(setupSignedMultiGiveaway);

        const claimId = 0x123n;
        const amount = ethers.parseEther('5');
        const claims: Claim[] = [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount,
          },
        ];
        await fixtures.mintToContract(
          await fixtures.contract.getAddress(),
          claims
        );
        const sig1 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await await getClaimEntires(claims)
        );
        const signerRole = await fixtures.contractAsAdmin.SIGNER_ROLE();
        await fixtures.contractAsAdmin.grantRole(
          signerRole,
          await fixtures.other.getAddress()
        );
        const sig2 = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.other,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await await getClaimEntires(claims)
        );
        await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);

        // sigs must have the right order signer < other
        await expect(
          fixtures.contract.claim(
            [sig2, sig1],
            [claimId],
            0,
            await fixtures.contract.getAddress(),
            await fixtures.dest.getAddress(),
            await getClaimEntires(claims)
          )
        ).to.revertedWith('invalid order');
      });
    });

    it('should fail to claim if amount is zero', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = 0n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'invalid amount'
      );
    });

    it('should be fail to claim ERC1155 in batch if wrong len', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC1155_BATCH,
              token: fixtures.assetToken,
              tokenIds: [],
              amounts: [],
              data: '0x',
            },
          ]
        )
      ).to.revertedWith('invalid data len');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC1155_BATCH,
          token: fixtures.assetToken,
          tokenIds: [12n],
          amounts: [],
          data: '0x',
        },
      ];
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.revertedWith('invalid data');
    });

    it('should fail to claim the same id twice', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.signAndClaim([1, 2, 3, claimId], claims);
      await expect(
        fixtures.signAndClaim([claimId, 4, 5, 6], claims)
      ).to.be.revertedWith('already claimed');
    });

    it('should fail to claim if the signature is wrong', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId + 1n],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.be.revertedWith('invalid signer');
    });

    it('should fail to mint if the signer is invalid', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await expect(
        fixtures.signAndClaim([claimId], claims, fixtures.other)
      ).to.be.revertedWith('invalid signer');
    });

    it('claim with metaTX trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const pre = await fixtures.balances(
        await fixtures.contract.getAddress(),
        claims
      );
      const preDest = await fixtures.balances(
        await fixtures.dest.getAddress(),
        claims
      );
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );

      const contractAsTrustedForwarder = await fixtures.signedGiveaway.connect(
        fixtures.trustedForwarder
      );
      const txData = await contractAsTrustedForwarder.claim.populateTransaction(
        [{v, r, s}],
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );
      // The msg.sender goes at the end.
      txData.data = ethers.solidityPacked(
        ['bytes', 'address'],
        [txData.data, await fixtures.other.getAddress()]
      );
      await contractAsTrustedForwarder.runner.sendTransaction(txData);
      await fixtures.checkBalances(
        await fixtures.contract.getAddress(),
        pre,
        preDest,
        claims
      );
    });

    it('should be able to batch claim', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const baseClaimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123n,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456n,
          amount,
          data: '0x',
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const pre = await fixtures.balances(
        await fixtures.contract.getAddress(),
        claims
      );
      const preDest = await fixtures.balances(
        await fixtures.dest.getAddress(),
        claims
      );
      const args = [];
      for (const [i, c] of claims.entries()) {
        const claimId = baseClaimId + BigInt(i);
        const {v, r, s} = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires([c])
        );
        args.push({
          sigs: [{v, r, s}],
          claimIds: [claimId],
          expiration: 0,
          from: await fixtures.contract.getAddress(),
          to: await fixtures.dest.getAddress(),
          claims: await getClaimEntires([c]),
        });
      }
      await fixtures.contract.batchClaim(args);
      await fixtures.checkBalances(
        await fixtures.contract.getAddress(),
        pre,
        preDest,
        claims
      );
    });
  });

  describe('recoverAssets', function () {
    it('admin should be able to recover assets', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const pre = await fixtures.sandToken.balanceOf(
        await fixtures.contract.getAddress()
      );
      await fixtures.contractAsAdmin.recoverAssets(
        await fixtures.other.getAddress(),
        await getClaimEntires(claims)
      );
      const pos = await fixtures.sandToken.balanceOf(
        await fixtures.contract.getAddress()
      );
      expect(pos).to.be.equal(pre - amount);
    });

    it('should fail to recover assets if not admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      await expect(
        fixtures.contract.recoverAssets(
          await fixtures.other.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contractAsBackofficeAdmin.recoverAssets(
          await fixtures.other.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.be.revertedWith('only admin');
    });
  });

  describe('revoke', function () {
    it('should fail to revoke if not admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      await expect(
        fixtures.contract.revokeClaims([claimId])
      ).to.be.revertedWith('only backoffice');
    });

    it('should fail to claim if the id was revoked', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.contractAsBackofficeAdmin.revokeClaims([claimId]);
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'already claimed'
      );
    });
  });

  describe('pause', function () {
    it('should fail to pause if not admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(fixtures.contract.pause()).to.be.revertedWith(
        'only backoffice'
      );
    });

    it('should fail to unpause if not admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await fixtures.contractAsAdmin.pause();
      await expect(fixtures.contract.unpause()).to.be.revertedWith(
        'only admin'
      );
    });

    it('should fail to claim if paused by backoffice admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.contractAsBackofficeAdmin.pause();
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );
    });

    it('should fail to batchClaim if paused by backoffice admin', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);
      const baseClaimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123n,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456n,
          amount,
          data: '0x',
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const args = [];
      for (const [i, c] of claims.entries()) {
        const claimId = baseClaimId + BigInt(i);
        const {v, r, s} = await signedMultiGiveawaySignature(
          fixtures.contract,
          fixtures.signer,
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires([c])
        );
        args.push({
          sigs: [{v, r, s}],
          claimIds: [claimId],
          expiration: 0,
          from: await fixtures.contract.getAddress(),
          to: await fixtures.dest.getAddress(),
          claims: await getClaimEntires([c]),
        });
      }
      await fixtures.contractAsBackofficeAdmin.pause();
      await expect(fixtures.contract.batchClaim(args)).to.be.revertedWith(
        'Pausable: paused'
      );
    });

    it('should be able to claim sand after pause/unpause', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.contractAsAdmin.pause();
      await expect(fixtures.signAndClaim([claimId], claims)).to.be.revertedWith(
        'Pausable: paused'
      );

      await fixtures.contractAsAdmin.unpause();

      await fixtures.signAndClaim([claimId], claims);
    });
  });

  describe('fixed limits', function () {
    it('admin should be able to set limits', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(1);
      await expect(fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2))
        .to.emit(fixtures.contract, 'NumberOfSignaturesNeededSet')
        .withArgs(2, await fixtures.admin.getAddress());
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(2);

      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        1
      );
      await expect(fixtures.contractAsAdmin.setMaxClaimEntries(2))
        .to.emit(fixtures.contract, 'MaxClaimEntriesSet')
        .withArgs(2, await fixtures.admin.getAddress());
      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        2
      );

      expect(
        await fixtures.contractAsAdmin.getMaxWeiPerClaim(
          await fixtures.sandToken.getAddress(),
          12
        )
      ).to.be.equal(0);
      await expect(
        fixtures.contractAsAdmin.setMaxWeiPerClaim(
          await fixtures.sandToken.getAddress(),
          12,
          2
        )
      )
        .to.emit(fixtures.contract, 'MaxWeiPerClaimSet')
        .withArgs(
          await fixtures.sandToken.getAddress(),
          12,
          2,
          await fixtures.admin.getAddress()
        );
      expect(
        await fixtures.contractAsAdmin.getMaxWeiPerClaim(
          await fixtures.sandToken.getAddress(),
          12
        )
      ).to.be.equal(2);
    });

    it('others should fail to set limits', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(
        fixtures.contractAsBackofficeAdmin.setMaxClaimEntries(1)
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contractAsBackofficeAdmin.setNumberOfSignaturesNeeded(1)
      ).to.be.revertedWith('only admin');
      await expect(fixtures.contract.setMaxClaimEntries(1)).to.be.revertedWith(
        'only admin'
      );
      await expect(
        fixtures.contract.setNumberOfSignaturesNeeded(1)
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contract.setMaxWeiPerClaim(
          await fixtures.sandToken.getAddress(),
          12,
          2
        )
      ).to.be.revertedWith('only admin');
    });

    it('numberOfSignaturesNeeded should be grater than 0', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(
        fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(0)
      ).to.be.revertedWith('invalid numberOfSignaturesNeeded');
    });

    it('maxClaimEntries should be grater than 0', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(
        fixtures.contractAsAdmin.setMaxClaimEntries(0)
      ).to.be.revertedWith('invalid maxClaimEntries');
    });

    it('should fail to claim if over max entries', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
        {
          tokenType: TokenType.ERC721,
          token: fixtures.landToken,
          tokenId: 123n,
        },
        {
          tokenType: TokenType.ERC1155,
          token: fixtures.assetToken,
          tokenId: 456n,
          amount,
          data: '0x',
        },
      ];
      await fixtures.contractAsAdmin.setMaxClaimEntries(2);
      expect(await fixtures.contractAsAdmin.getMaxClaimEntries()).to.be.equal(
        2
      );
      await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
        'too many claims'
      );
    });

    it('should fail to claim if not enough signatures', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.contractAsAdmin.setNumberOfSignaturesNeeded(2);
      expect(
        await fixtures.contractAsAdmin.getNumberOfSignaturesNeeded()
      ).to.be.equal(2);
      await expect(fixtures.signAndClaim([claimId], claims)).to.revertedWith(
        'wrong number of signatures'
      );
    });

    it('signatures should expire', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
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

    it('should fail to claim if over maxPerClaim per token', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const maxPerClaim = 10n;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        await fixtures.sandToken.getAddress(),
        0,
        maxPerClaim
      );
      const claimId = 0x123n;
      // maxPerClaim+1 fails
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC20,
              token: fixtures.sandToken,
              amount: maxPerClaim + 1n,
            },
          ]
        )
      ).to.be.revertedWith('checkLimits, amount too high');
      // maxPerClaim is ok
      await fixtures.signAndClaim(
        [claimId],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: maxPerClaim,
          },
        ]
      );
    });

    it('should success to claim if maxPerClaim is !=0 but amount is bellow maxPerClaim per token', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const maxPerClaim = 1000n;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        await fixtures.sandToken.getAddress(),
        0,
        maxPerClaim
      );
      const claimId = 0x123n;
      await fixtures.signAndClaim(
        [claimId],
        [
          {
            tokenType: TokenType.ERC20,
            token: fixtures.sandToken,
            amount: maxPerClaim - 1n,
          },
        ]
      );
    });

    it('should fail to claim if over maxPerClaim per token per token id (ERC1155)', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const tokenId = 0x123n;
      3;
      const maxPerClaim = 10n;
      await fixtures.contractAsAdmin.setMaxWeiPerClaim(
        await fixtures.assetToken.getAddress(),
        tokenId,
        maxPerClaim
      );
      const claimId = 0x123n;
      await expect(
        fixtures.signAndClaim(
          [claimId],
          [
            {
              tokenType: TokenType.ERC1155,
              token: fixtures.assetToken,
              tokenId,
              amount: maxPerClaim + 1n,
              data: '0x',
            },
          ]
        )
      ).to.be.revertedWith('checkLimits, amount too high');
    });
  });

  describe('coverage', function () {
    it('a valid signature must verify correctly', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount: ethers.parseEther('5'),
        },
      ];
      await fixtures.mintToContract(
        await fixtures.contract.getAddress(),
        claims
      );
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );

      expect(
        await fixtures.contract.verifySignature(
          {v, r, s},
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.equal(await fixtures.signer.getAddress());
    });

    it('admin should be able to set the trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);
      expect(
        await fixtures.contract.isTrustedForwarder(
          await fixtures.trustedForwarder.getAddress()
        )
      ).to.be.true;
      expect(
        await fixtures.contract.isTrustedForwarder(
          await fixtures.other.getAddress()
        )
      ).to.be.false;
      expect(await fixtures.contract.getTrustedForwarder()).to.be.equal(
        await fixtures.trustedForwarder.getAddress()
      );
      expect(await fixtures.contract.trustedForwarder()).to.be.equal(
        await fixtures.trustedForwarder.getAddress()
      );
      await expect(
        fixtures.contractAsAdmin.setTrustedForwarder(
          await fixtures.other.getAddress()
        )
      )
        .to.emit(fixtures.contract, 'TrustedForwarderSet')
        .withArgs(
          await fixtures.trustedForwarder.getAddress(),
          await fixtures.other.getAddress(),
          await fixtures.admin.getAddress()
        );
      expect(await fixtures.contract.getTrustedForwarder()).to.be.equal(
        await fixtures.other.getAddress()
      );
      expect(await fixtures.contract.trustedForwarder()).to.be.equal(
        await fixtures.other.getAddress()
      );
    });

    it('others should fail to set the trusted forwarder', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(
        fixtures.contractAsBackofficeAdmin.setTrustedForwarder(
          await fixtures.other.getAddress()
        )
      ).to.be.revertedWith('only admin');
      await expect(
        fixtures.contract.setTrustedForwarder(await fixtures.other.getAddress())
      ).to.be.revertedWith('only admin');
    });

    it('check the domain separator', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const typeHash = ethers.keccak256(
        ethers.toUtf8Bytes(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
        )
      );
      const hashedName = ethers.keccak256(
        ethers.toUtf8Bytes('Sandbox SignedMultiGiveaway')
      );
      const versionHash = ethers.keccak256(ethers.toUtf8Bytes('1.0'));
      const network = await fixtures.contract.runner?.provider?.getNetwork();
      const domainSeparator = ethers.keccak256(
        AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            typeHash,
            hashedName,
            versionHash,
            network.chainId,
            await fixtures.contract.getAddress(),
          ]
        )
      );
      expect(await fixtures.contract.domainSeparator()).to.be.equal(
        domainSeparator
      );
    });

    it('should fail to initialize twice', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);
      await expect(
        fixtures.contractAsDeployer.initialize(
          await fixtures.trustedForwarder.getAddress(),
          await fixtures.admin.getAddress()
        )
      ).to.revertedWith('Initializable: contract is already initialized');
    });

    it('should fail if batch len is wrong', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(fixtures.contract.batchClaim([])).to.revertedWith(
        'invalid len'
      );
    });

    it('should fail if token address is zero', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      await expect(
        fixtures.contractAsAdmin.setMaxWeiPerClaim(ethers.ZeroAddress, 12, 2)
      ).to.be.revertedWith('invalid token address');
    });

    it('should fail if invalid token type', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const claims: ClaimEntry[] = [
        {
          tokenType: 0,
          tokenAddress: await fixtures.sandToken.getAddress(),
          data: '0x',
        },
      ];
      const {v, r, s} = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        claims
      );
      await expect(
        fixtures.contract.claim(
          [{v, r, s}],
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          claims
        )
      ).to.be.revertedWith('invalid token type');
    });

    it('should fail to claim with no balance', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.contract.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [sig],
          [claimId],
          0,
          await fixtures.contract.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('should fail to claim with approve when no balance', async function () {
      const fixtures = await loadFixture(setupSignedMultiGiveaway);

      const claimId = 0x123n;
      const amount = ethers.parseEther('5');
      const claims: Claim[] = [
        {
          tokenType: TokenType.ERC20,
          token: fixtures.sandToken,
          amount,
        },
      ];
      await fixtures.sandTokenAsOther.approve(
        await fixtures.contract.getAddress(),
        amount
      );
      const sig = await signedMultiGiveawaySignature(
        fixtures.contract,
        fixtures.signer,
        [claimId],
        0,
        await fixtures.other.getAddress(),
        await fixtures.dest.getAddress(),
        await getClaimEntires(claims)
      );
      await expect(
        fixtures.contract.claim(
          [sig],
          [claimId],
          0,
          await fixtures.other.getAddress(),
          await fixtures.dest.getAddress(),
          await getClaimEntires(claims)
        )
      ).to.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });
});
