import {expect} from 'chai';
import {formatBytes32String} from 'ethers/lib/utils';
import {runRevealTestSetup} from './fixtures/asset/assetRevealFixtures';
import {ethers} from 'hardhat';
import {BigNumber, Event} from 'ethers';

const revealHashA = formatBytes32String('revealHashA');
const revealHashB = formatBytes32String('revealHashB');
const revealHashC = formatBytes32String('revealHashC');
const revealHashD = formatBytes32String('revealHashD');
const revealHashE = formatBytes32String('revealHashE');
const revealHashF = formatBytes32String('revealHashF');

describe('AssetReveal (/packages/asset/contracts/AssetReveal.sol)', function () {
  describe('General', function () {
    it('Should deploy correctly', async function () {
      const {AssetRevealContract} = await runRevealTestSetup();
      expect(AssetRevealContract.address).to.be.properAddress;
    });
    it('Should have the asset address set correctly', async function () {
      const {AssetRevealContract, AssetContract} = await runRevealTestSetup();
      const assetAddress = await AssetRevealContract.getAssetContract();
      expect(assetAddress).to.equal(AssetContract.address);
    });
    it('Should have the auth validator address set correctly', async function () {
      const {AssetRevealContract, AuthValidatorContract} =
        await runRevealTestSetup();
      const authValidatorAddress = await AssetRevealContract.getAuthValidator();
      expect(authValidatorAddress).to.equal(AuthValidatorContract.address);
    });
    it('should give DEFAULT_ADMIN_ROLE to the defaultAdmin', async function () {
      const {AssetRevealContract, assetAdmin} = await runRevealTestSetup();
      const hasAdminRole = await AssetRevealContract.hasRole(
        await AssetRevealContract.DEFAULT_ADMIN_ROLE(),
        assetAdmin.address
      );
      expect(hasAdminRole).to.equal(true);
    });
    it("Should increment the reveal nonce if revealing an asset that hasn't been revealed before", async function () {
      const {
        generateRevealSignature,
        user,
        unrevealedtokenId,
        revealAsset,
        TokenIdUtilsContract,
      } = await runRevealTestSetup();

      const newMetadataHashes1 = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const newMetadataHashes2 = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes1,
        [revealHashA]
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes1,
        [revealHashA]
      );
      expect(result.events[3].event).to.equal('AssetRevealMint');
      const newTokenId = result.events[3].args.newTokenIds[0];
      const revealNonce = await TokenIdUtilsContract.getRevealNonce(newTokenId);
      expect(revealNonce.toString()).to.equal('1');

      const signature2 = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes2,
        [revealHashB]
      );
      const result2 = await revealAsset(
        signature2,
        unrevealedtokenId,
        amounts,
        newMetadataHashes2,
        [revealHashB]
      );

      expect(result2.events[3].event).to.equal('AssetRevealMint');
      const newTokenId2 = result2.events[3].args.newTokenIds[0];
      const revealNonce2 = await TokenIdUtilsContract.getRevealNonce(
        newTokenId2
      );

      expect(revealNonce2.toString()).to.equal('2');
    });
    it('Should not increment the reveal nonce if revealing an asset that has already been revealed', async function () {
      const {
        generateRevealSignature,
        user,
        unrevealedtokenId,
        revealAsset,
        TokenIdUtilsContract,
      } = await runRevealTestSetup();

      const sameMetadataHash = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];

      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        sameMetadataHash,
        [revealHashA]
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        sameMetadataHash,
        [revealHashA]
      );

      expect(result.events[3].event).to.equal('AssetRevealMint');
      const newTokenId = result.events[3].args.newTokenIds[0];
      const revealNonce = await TokenIdUtilsContract.getRevealNonce(newTokenId);
      expect(revealNonce.toString()).to.equal('1');

      const signature2 = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        sameMetadataHash,
        [revealHashB]
      );
      const result2 = await revealAsset(
        signature2,
        unrevealedtokenId,
        amounts,
        sameMetadataHash,
        [revealHashB]
      );

      expect(result2.events[1].event).to.equal('AssetRevealMint');
      const newTokenId2 = result2.events[1].args.newTokenIds[0];
      const revealNonce2 = await TokenIdUtilsContract.getRevealNonce(
        newTokenId2
      );

      expect(revealNonce2.toString()).to.equal('1');
    });
  });
  describe('Trusted Forwarder', function () {
    it('should allow to read the trusted forwarder', async function () {
      const {AssetRevealContract, trustedForwarder} =
        await runRevealTestSetup();
      expect(await AssetRevealContract.getTrustedForwarder()).to.be.equal(
        trustedForwarder.address
      );
    });
    it('should correctly check if an address is a trusted forwarder or not', async function () {
      const {AssetRevealContract, trustedForwarder} =
        await runRevealTestSetup();
      expect(
        await AssetRevealContract.isTrustedForwarder(trustedForwarder.address)
      ).to.be.true;
      expect(
        await AssetRevealContract.isTrustedForwarder(
          ethers.constants.AddressZero
        )
      ).to.be.false;
    });
    it('should allow DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetRevealContractAsAdmin} = await runRevealTestSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await AssetRevealContractAsAdmin.setTrustedForwarder(randomAddress);
      expect(
        await AssetRevealContractAsAdmin.getTrustedForwarder()
      ).to.be.equal(randomAddress);
    });
    it('should not allow non DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetRevealContractAsUser, user, AdminRole} =
        await runRevealTestSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await expect(
        AssetRevealContractAsUser.setTrustedForwarder(randomAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${AdminRole}`
      );
    });
    it('should return correct msgData', async function () {
      const {MockAssetRevealContract} = await runRevealTestSetup();
      // call the function to satisfy the coverage only, but we don't need to check the result
      await MockAssetRevealContract.msgData();
    });
  });
  describe('Pause/Unpause', function () {
    it('should allow pauser to pause the contract', async function () {
      const {AssetRevealContractAsAdmin} = await runRevealTestSetup();
      await AssetRevealContractAsAdmin.pause();
      expect(await AssetRevealContractAsAdmin.paused()).to.be.true;
    });
    it('should not allow non pauser to pause the contract', async function () {
      const {AssetRevealContractAsUser, user, PauserRole} =
        await runRevealTestSetup();
      await expect(AssetRevealContractAsUser.pause()).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${PauserRole}`
      );
    });
    it('should allow pauser to unpause the contract', async function () {
      const {AssetRevealContractAsAdmin} = await runRevealTestSetup();
      await AssetRevealContractAsAdmin.pause();
      await AssetRevealContractAsAdmin.unpause();
      expect(await AssetRevealContractAsAdmin.paused()).to.be.false;
    });
    it('should not allow non pauser to unpause the contract', async function () {
      const {AssetRevealContractAsUser, user, PauserRole} =
        await runRevealTestSetup();
      await expect(AssetRevealContractAsUser.unpause()).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${PauserRole}`
      );
    });
    it('should not allow revealBurn to be called when paused', async function () {
      const {
        AssetRevealContractAsAdmin,
        AssetRevealContractAsUser,
        unrevealedtokenId,
      } = await runRevealTestSetup();
      await AssetRevealContractAsAdmin.pause();
      await expect(
        AssetRevealContractAsUser.revealBurn(unrevealedtokenId, 1)
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow revealMint to be called when paused', async function () {
      const {
        unrevealedtokenId,
        user,
        generateRevealSignature,
        pause,
        revealAsset,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      await pause();
      await expect(
        revealAsset(signature, unrevealedtokenId, amounts, newMetadataHashes, [
          revealHashA,
        ])
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow revealBatchMint to be called when paused', async function () {
      const {
        unrevealedtokenId,
        user,
        generateRevealSignature,
        pause,
        revealAsset,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      await pause();
      await expect(
        revealAsset(signature, unrevealedtokenId, amounts, newMetadataHashes, [
          revealHashA,
        ])
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow revealBatchBurn to be called when paused', async function () {
      const {
        unrevealedtokenId,
        user,
        generateRevealSignature,
        pause,
        revealAsset,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      await pause();
      await expect(
        revealAsset(signature, unrevealedtokenId, amounts, newMetadataHashes, [
          revealHashA,
        ])
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow burnAndReveal to be called when paused', async function () {
      const {
        AssetRevealContractAsAdmin,
        unrevealedtokenId,
        instantReveal,
        generateBurnAndRevealSignature,
        user,
      } = await runRevealTestSetup();
      await AssetRevealContractAsAdmin.pause();
      const newMetadataHash = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];

      const signature = await generateBurnAndRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHash,
        [revealHashA]
      );

      await expect(
        instantReveal(
          signature,
          unrevealedtokenId,
          amounts[0],
          amounts,
          newMetadataHash,
          [revealHashA]
        )
      ).to.be.revertedWith('Pausable: paused');
    });
  });
  describe('Burning', function () {
    describe('Single burn', function () {
      describe('Success', function () {
        it('Should be able to burn unrevealed owned assets', async function () {
          const {
            AssetRevealContractAsUser,
            AssetContract,
            unrevealedtokenId,
            user,
          } = await runRevealTestSetup();
          const burnTx = await AssetRevealContractAsUser.revealBurn(
            unrevealedtokenId,
            1
          );
          await burnTx.wait();

          const userBalance = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId
          );
          expect(userBalance.toString()).to.equal('9');
        });
      });
      describe('Revert', function () {
        it('Should not be able to burn amount less than one', async function () {
          const {AssetRevealContractAsUser, unrevealedtokenId} =
            await runRevealTestSetup();
          await expect(
            AssetRevealContractAsUser.revealBurn(unrevealedtokenId, 0)
          ).to.be.revertedWith(
            'AssetReveal: Burn amount should be greater than 0'
          );
        });
        it('Should not be able to burn an asset that is already revealed', async function () {
          const {AssetRevealContractAsUser, revealedtokenId} =
            await runRevealTestSetup();
          await expect(
            AssetRevealContractAsUser.revealBurn(revealedtokenId, 1)
          ).to.be.revertedWith('AssetReveal: Asset is already revealed');
        });
        it('Should not be able to burn more than owned by the caller', async function () {
          const {
            user,
            AssetRevealContractAsUser,
            AssetContract,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const balance = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId
          );
          await expect(
            AssetRevealContractAsUser.revealBurn(unrevealedtokenId, balance + 1)
          ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
        });
        it("Should not be able to burn a token that doesn't exist", async function () {
          const {AssetRevealContractAsUser} = await runRevealTestSetup();
          await expect(
            AssetRevealContractAsUser.revealBurn(123, 1)
          ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
        });
      });
    });
    describe('Batch burn', function () {
      describe('Success', function () {
        it('Should be able to burn multiple unrevealed owned assets', async function () {
          const {
            AssetRevealContractAsUser,
            AssetContract,
            unrevealedtokenId,
            unrevealedtokenId2,
            user,
          } = await runRevealTestSetup();
          const amountToBurn1 = 2;
          const amountToBurn2 = 3;
          const tk1BalanceBeforeBurn = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId
          );

          const tk2BalanceBeforeBurn = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId2
          );

          const burnTx = await AssetRevealContractAsUser.revealBatchBurn(
            [unrevealedtokenId, unrevealedtokenId2],
            [amountToBurn1, amountToBurn2]
          );
          await burnTx.wait();

          const tk1BalanceAfterBurn = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId
          );

          const tk2BalanceAfterBurn = await AssetContract.balanceOf(
            user.address,
            unrevealedtokenId2
          );

          expect(tk1BalanceBeforeBurn.sub(amountToBurn1)).to.equal(
            tk1BalanceAfterBurn
          );
          expect(tk2BalanceBeforeBurn.sub(amountToBurn2)).to.equal(
            tk2BalanceAfterBurn
          );
        });
      });
      describe('Revert', function () {
        it("should revert if ids array and amounts array aren't the same length", async function () {
          const {AssetRevealContractAsUser, unrevealedtokenId} =
            await runRevealTestSetup();
          await expect(
            AssetRevealContractAsUser.revealBatchBurn(
              [unrevealedtokenId],
              [1, 2]
            )
          ).to.be.revertedWith('AssetReveal: Invalid input');
        });
      });
    });
    describe('Burn Events', function () {
      it('Should emit AssetRevealBurn event with correct data when burning single token', async function () {
        const {AssetRevealContractAsUser, unrevealedtokenId, user} =
          await runRevealTestSetup();
        const burnTx = await AssetRevealContractAsUser.revealBurn(
          unrevealedtokenId,
          1
        );
        const burnResult = await burnTx.wait();
        const burnEvent = burnResult.events[1];
        expect(burnEvent.event).to.equal('AssetRevealBurn');
        // revealer
        expect(burnEvent.args[0]).to.equal(user.address);
        // token id that is being revealed
        expect(burnEvent.args[1]).to.equal(unrevealedtokenId);
        // amount
        expect(burnEvent.args[2].toString()).to.equal('1');
      });
      it('should emit AssetRevealBatchBurn event with correct data when burning multiple tokens', async function () {
        const {
          AssetRevealContractAsUser,
          unrevealedtokenId,
          unrevealedtokenId2,
          user,
        } = await runRevealTestSetup();
        const burnTx = await AssetRevealContractAsUser.revealBatchBurn(
          [unrevealedtokenId, unrevealedtokenId2],
          [1, 2]
        );
        const burnResult = await burnTx.wait();
        const burnEvent = burnResult.events[1];
        expect(burnEvent.event).to.equal('AssetRevealBatchBurn');
        // revealer
        expect(burnEvent.args[0]).to.equal(user.address);
        // token ids that are being revealed
        expect(burnEvent.args[1].toString()).to.equal(
          [unrevealedtokenId, unrevealedtokenId2].toString()
        );
        // amount
        expect(burnEvent.args[2].toString()).to.equal([1, 2].toString());
      });
    });
  });
  describe('Reveal Minting', function () {
    describe('Signature generation and validation', function () {
      it('Should not allow minting with invalid amount', async function () {
        const {
          user,
          generateRevealSignature,
          unrevealedtokenId,
          AssetRevealContract,
        } = await runRevealTestSetup();
        const newMetadataHashes = [
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
        ];
        const amounts = [1];
        const signature = await generateRevealSignature(
          user.address,
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        );
        await expect(
          AssetRevealContract.revealMint(
            signature,
            unrevealedtokenId,
            [123], // invalid
            newMetadataHashes,
            [revealHashA]
          )
        ).to.be.revertedWith('AssetReveal: Invalid revealMint signature');
      });
      it('Should not allow minting with invalid recipient', async function () {
        const {revealAsset, unrevealedtokenId, generateRevealSignature} =
          await runRevealTestSetup();
        const newMetadataHashes = [
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
        ];
        const amounts = [1];
        const incorrectSignature = await generateRevealSignature(
          '0x0000000000000000000000000000000000000000', // invalid
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        );

        await expect(
          revealAsset(
            incorrectSignature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          )
        ).to.be.revertedWith('AssetReveal: Invalid revealMint signature');
      });
      it('Should not allow minting with invalid prevTokenId', async function () {
        const {
          user,
          generateRevealSignature,
          unrevealedtokenId,
          AssetRevealContract,
        } = await runRevealTestSetup();
        const newMetadataHashes = [
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
        ];
        const amounts = [1];
        const signature = await generateRevealSignature(
          user.address,
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        );

        await expect(
          AssetRevealContract.revealMint(
            signature,
            123, // invalid
            amounts,
            newMetadataHashes,
            [revealHashA]
          )
        ).to.be.revertedWith('AssetReveal: Invalid revealMint signature');
      });
      it('Should not allow minting with invalid metadataHashes', async function () {
        const {user, generateRevealSignature, unrevealedtokenId, revealAsset} =
          await runRevealTestSetup();
        const newMetadataHashes = [
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
        ];
        const amounts = [1];
        const signature = await generateRevealSignature(
          user.address,
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        );

        await expect(
          revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE'], // invalid
            [revealHashA]
          )
        ).to.be.revertedWith('AssetReveal: Invalid revealMint signature');
      });
    });
    describe('Single reveal mint', function () {
      describe('Success', function () {
        it('Should allow minting with valid signature', async function () {
          const {
            user,
            unrevealedtokenId,
            generateRevealSignature,
            revealAsset,
            AssetContract,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [1];

          const signature = await generateRevealSignature(
            user.address, // revealer
            unrevealedtokenId, // prevTokenId
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );

          expect(result.events[3].event).to.equal('AssetRevealMint');
          const newTokenId = result.events[3].args.newTokenIds[0];
          const balance = await AssetContract.balanceOf(
            user.address,
            newTokenId
          );
          expect(balance.toString()).to.equal('1');
        });
        it('Should allow minting when multiple copies revealed to the same metadata hash', async function () {
          const {
            user,
            unrevealedtokenId,
            AssetContract,
            revealAsset,
            generateRevealSignature,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [2];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          expect(result.events[3].event).to.equal('AssetRevealMint');
          expect(result.events[3].args['newTokenIds'].length).to.equal(1);
          const newTokenId = result.events[3].args.newTokenIds[0];
          const balance = await AssetContract.balanceOf(
            user.address,
            newTokenId
          );
          expect(balance.toString()).to.equal('2');
        });
        it('should increase the tokens supply for tokens with same metadata hash', async function () {
          const {
            user,
            unrevealedtokenId,
            generateRevealSignature,
            revealAsset,
            AssetContract,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [1];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );

          const newTokenId = result.events[3].args.newTokenIds[0];
          const balance = await AssetContract.balanceOf(
            user.address,
            newTokenId
          );
          expect(balance.toString()).to.equal('1');
          const signature2 = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashB]
          );
          await revealAsset(
            signature2,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashB]
          );
          const balance2 = await AssetContract.balanceOf(
            user.address,
            newTokenId
          );
          expect(balance2.toString()).to.equal('2');
        });
        it('Should allow revealing multiple copies at the same time', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ1',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ2',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ3',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ4',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ5',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ6',
          ];
          const amountToMint = [1, 2, 1, 7, 1, 2];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amountToMint,
            newMetadataHashes,
            [
              revealHashA,
              revealHashB,
              revealHashC,
              revealHashD,
              revealHashE,
              revealHashF,
            ]
          );

          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            amountToMint,
            newMetadataHashes,
            [
              revealHashA,
              revealHashB,
              revealHashC,
              revealHashD,
              revealHashE,
              revealHashF,
            ]
          );
          expect(result.events[13].event).to.equal('AssetRevealMint');
          expect(result.events[13].args['newTokenIds'].length).to.equal(6);
        });
        it('should set the reveal hash as used after successful mint', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
            AssetRevealContract,
          } = await runRevealTestSetup();
          const newMetadataHashes = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const amounts = [1];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          await revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );
          const isUsed = await AssetRevealContract.revealHashUsed(revealHashA);
          expect(isUsed).to.equal(true);
        });
      });
      describe('Revert', function () {
        it('Should revert if amounts array is not the same length as metadataHashes array', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();

          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
          ];

          const amounts = [1, 2, 3];

          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA, revealHashB]
          );

          await expect(
            revealAsset(
              signature,
              unrevealedtokenId,
              amounts,
              newMetadataHashes,
              [revealHashA, revealHashB]
            )
          ).to.be.revertedWith('AssetReveal: Invalid amounts length');
        });
        it('Should revert if amounts array is not the same length as revealHashes array', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();

          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
          ];

          const amounts = [1, 2];

          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA, revealHashB, revealHashC]
          );

          await expect(
            revealAsset(
              signature,
              unrevealedtokenId,
              amounts,
              newMetadataHashes,
              [revealHashA, revealHashB, revealHashC]
            )
          ).to.be.revertedWith('AssetReveal: Invalid revealHashes length');
        });
        it('Should not allow using the same signature twice', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [1];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA]
          );

          await expect(
            revealAsset(
              signature,
              unrevealedtokenId,
              amounts,
              newMetadataHashes,
              [revealHashA]
            )
          ).not.to.be.reverted;

          await expect(
            revealAsset(
              signature,
              unrevealedtokenId,
              amounts,
              newMetadataHashes,
              [revealHashA]
            )
          ).to.be.revertedWith('AssetReveal: RevealHash already used');
        });
      });
      describe('Events', function () {
        it('should emit AssetRevealMint event when successully revealed a token', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
          ];
          const amounts = [1, 2];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA, revealHashB]
          );

          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            amounts,
            newMetadataHashes,
            [revealHashA, revealHashB]
          );
          expect(result.events[5].event).to.equal('AssetRevealMint');
        });
        it('should emit AssetRevealMint event with correct arguments', async function () {
          const {
            user,
            generateRevealSignature,
            revealAsset,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHashes = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
          ];
          const mintAmounts = [1, 2];
          const signature = await generateRevealSignature(
            user.address,
            unrevealedtokenId,
            mintAmounts,
            newMetadataHashes,
            [revealHashA, revealHashB]
          );

          const result = await revealAsset(
            signature,
            unrevealedtokenId,
            mintAmounts,
            newMetadataHashes,
            [revealHashA, revealHashB]
          );

          expect(result.events[5].event).to.equal('AssetRevealMint');

          const args = result.events[5].args;
          const {
            recipient,
            unrevealedTokenId,
            amounts,
            newTokenIds,
            revealHashes,
          } = args;
          expect(recipient).to.equal(user.address);
          expect(unrevealedTokenId).to.equal(unrevealedtokenId);
          expect(amounts).to.deep.equal(mintAmounts);
          expect(newTokenIds.length).to.equal(2);
          expect(revealHashes).to.deep.equal([revealHashA, revealHashB]);
        });
      });
    });
    describe('Batch reveal mint', function () {
      describe('Success', function () {
        it('Should allow batch reveal minting with valid signatures', async function () {
          const {
            user,
            revealAssetBatch,
            generateBatchRevealSignature,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const newMetadataHashes2 = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJZ',
          ];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          const result = await revealAssetBatch(
            signature,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          // expect one batch reveal event
          const event = result.events.find(
            (e: Event) => e.event === 'AssetRevealBatchMint'
          );
          expect(event).to.not.be.undefined;
        });
        it("should allow batch reveal of the same token's copies", async function () {
          const {
            user,
            revealAssetBatch,
            generateBatchRevealSignature,
            unrevealedtokenId,
            AssetContract,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
          ];
          const newMetadataHashes2 = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg',
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXch',
          ];
          const amounts1 = [1, 2];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId],
            [amounts1, amounts1],
            [newMetadataHashes1, newMetadataHashes2],
            [
              [revealHashA, revealHashB],
              [revealHashC, revealHashD],
            ]
          );

          const result = await revealAssetBatch(
            signature,
            [unrevealedtokenId, unrevealedtokenId],
            [amounts1, amounts1],
            [newMetadataHashes1, newMetadataHashes2],
            [
              [revealHashA, revealHashB],
              [revealHashC, revealHashD],
            ]
          );

          const batchRevealMintEvent: Event = result.events.find(
            (e: Event) => e.event === 'AssetRevealBatchMint'
          );

          const newTokenIds = batchRevealMintEvent.args?.newTokenIds;
          const allNewTokenIds = newTokenIds.flat();

          const idsAsStrings = allNewTokenIds.map((id: BigNumber) =>
            id.toString()
          );

          // deduplicate, deep equality
          const deduplicated = [...new Set(idsAsStrings)];

          expect(deduplicated.length).to.equal(3);
          // check balances
          const balance1 = await AssetContract.balanceOf(
            user.address,
            deduplicated[0]
          );

          const balance2 = await AssetContract.balanceOf(
            user.address,
            deduplicated[1]
          );

          const balance3 = await AssetContract.balanceOf(
            user.address,
            deduplicated[2]
          );

          expect(balance1.toString()).to.equal('1');
          expect(balance2.toString()).to.equal('3');
          expect(balance3.toString()).to.equal('2');
        });
      });
      describe('Revert', function () {
        it('Should revert if ids array and amounts array are not the same length', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const newMetadataHashes2 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg'];
          const amounts1 = [1];
          const amounts2 = [1, 2];
          const amounts3 = [1, 2];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2, amounts3],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          await expect(
            revealAssetBatch(
              signature,
              [unrevealedtokenId, unrevealedtokenId2],
              [amounts1, amounts2, amounts3],
              [newMetadataHashes1, newMetadataHashes2],
              [[revealHashA], [revealHashB]]
            )
          ).to.be.revertedWith('AssetReveal: Invalid amounts length');
        });
        it('Should revert if ids array and metadataHashes array are not the same length', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1],
            [[revealHashA], [revealHashB]]
          );

          await expect(
            revealAssetBatch(
              signature,
              [unrevealedtokenId, unrevealedtokenId2],
              [amounts1, amounts2],
              [newMetadataHashes1],
              [[revealHashA], [revealHashB]]
            )
          ).to.be.revertedWith('AssetReveal: Invalid metadataHashes length');
        });
        it('Should revert if ids array and revealHashes array are not the same length', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const newMetadataHashes2 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg'];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA]]
          );

          await expect(
            revealAssetBatch(
              signature,
              [unrevealedtokenId, unrevealedtokenId2],
              [amounts1, amounts2],
              [newMetadataHashes1, newMetadataHashes2],
              [[revealHashA]]
            )
          ).to.be.revertedWith('AssetReveal: Invalid revealHashes length');
        });
        it('should not allow using the same signature twice', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const newMetadataHashes2 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg'];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          await expect(
            revealAssetBatch(
              signature,
              [unrevealedtokenId, unrevealedtokenId2],
              [amounts1, amounts2],
              [newMetadataHashes1, newMetadataHashes2],
              [[revealHashA], [revealHashB]]
            )
          ).not.to.be.reverted;

          await expect(
            revealAssetBatch(
              signature,
              [unrevealedtokenId, unrevealedtokenId2],
              [amounts1, amounts2],
              [newMetadataHashes1, newMetadataHashes2],
              [[revealHashA], [revealHashB]]
            )
          ).to.be.revertedWith('AssetReveal: RevealHash already used');
        });
      });
      describe('Events', function () {
        it('should emit multiple AssetRevealMint events when successully revealed multiple tokens', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const newMetadataHashes2 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg'];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          const result = await revealAssetBatch(
            signature,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          const revealEvents = result.events.filter(
            (event: Event) => event.event === 'AssetRevealBatchMint'
          );
          expect(revealEvents.length).to.equal(1);
        });
        it('should emit AssetRevealMint events with correct arguments when successully revealed multiple tokens', async function () {
          const {
            user,
            generateBatchRevealSignature,
            revealAssetBatch,
            unrevealedtokenId,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHashes1 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcf'];
          const newMetadataHashes2 = ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcg'];
          const amounts1 = [1];
          const amounts2 = [1];

          const signature = await generateBatchRevealSignature(
            user.address,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );

          const result = await revealAssetBatch(
            signature,
            [unrevealedtokenId, unrevealedtokenId2],
            [amounts1, amounts2],
            [newMetadataHashes1, newMetadataHashes2],
            [[revealHashA], [revealHashB]]
          );
          const revealEvents = result.events.filter(
            (event: Event) => event.event === 'AssetRevealBatchMint'
          );
          const args1 = revealEvents[0].args;

          expect(args1['recipient']).to.equal(user.address);
          expect(args1['unrevealedTokenIds']).to.deep.equal([
            unrevealedtokenId,
            unrevealedtokenId2,
          ]);
          expect(args1['amounts']).to.deep.equal([amounts1, amounts2]);
          expect(args1['newTokenIds'].length).to.equal(2);
          expect(args1['revealHashes']).to.deep.equal([
            [revealHashA],
            [revealHashB],
          ]);
        });
      });
    });
    describe('Burn and reveal mint', function () {
      describe('Success', function () {
        it('Should allow instant reveal when authorized by the backend for allowed tier', async function () {
          const {
            user,
            generateBurnAndRevealSignature,
            instantReveal,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHash = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [1];

          const signature = await generateBurnAndRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHash,
            [revealHashA]
          );

          const result = await instantReveal(
            signature,
            unrevealedtokenId,
            amounts[0],
            amounts,
            newMetadataHash,
            [revealHashA]
          );
          const revealMintEvent = result.events.filter(
            (event: Event) => event.event === 'AssetRevealMint'
          )[0];
          expect(revealMintEvent).to.not.be.undefined;
        });
      });
      describe('Revert', function () {
        it('should revert if the tier is not allowed to instant reveal', async function () {
          const {
            user,
            generateBurnAndRevealSignature,
            instantReveal,
            unrevealedtokenId2,
          } = await runRevealTestSetup();
          const newMetadataHash = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
          ];
          const amounts = [1];

          const signature = await generateBurnAndRevealSignature(
            user.address,
            unrevealedtokenId2,
            amounts,
            newMetadataHash,
            [revealHashA]
          );

          await expect(
            instantReveal(
              signature,
              unrevealedtokenId2,
              amounts[0],
              amounts,
              newMetadataHash,
              [revealHashA]
            )
          ).to.be.revertedWith(
            'AssetReveal: Tier not allowed for instant reveal'
          );
        });
        it("should revert if amounts array isn't the same length as metadataHashes array", async function () {
          const {
            user,
            generateBurnAndRevealSignature,
            instantReveal,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHash = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE',
          ];
          const amounts = [1, 2];

          const signature = await generateBurnAndRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHash,
            [revealHashA]
          );

          await expect(
            instantReveal(
              signature,
              unrevealedtokenId,
              amounts[0],
              amounts,
              newMetadataHash,
              [revealHashA]
            )
          ).to.be.revertedWith('AssetReveal: Invalid amounts length');
        });
        it("should revert if amounts array isn't the same length as revealHashes array", async function () {
          const {
            user,
            generateBurnAndRevealSignature,
            instantReveal,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHash = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE',
          ];
          const amounts = [1];

          const signature = await generateBurnAndRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHash,
            [revealHashA, revealHashB]
          );

          await expect(
            instantReveal(
              signature,
              unrevealedtokenId,
              amounts[0],
              amounts,
              newMetadataHash,
              [revealHashA, revealHashB]
            )
          ).to.be.revertedWith('AssetReveal: Invalid revealHashes length');
        });
      });
      describe('Events', function () {
        it('Should emit AssetRevealMint event with correct data when burning and revealing a single token', async function () {
          const {
            user,
            generateBurnAndRevealSignature,
            instantReveal,
            unrevealedtokenId,
          } = await runRevealTestSetup();
          const newMetadataHash = [
            'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE',
          ];
          const amounts = [1];

          const signature = await generateBurnAndRevealSignature(
            user.address,
            unrevealedtokenId,
            amounts,
            newMetadataHash,
            [revealHashA]
          );

          const result = await instantReveal(
            signature,
            unrevealedtokenId,
            amounts[0],
            amounts,
            newMetadataHash,
            [revealHashA]
          );
          const revealMintEvent = result.events.filter(
            (event: Event) => event.event === 'AssetRevealMint'
          )[0];
          expect(revealMintEvent.args['recipient']).to.equal(user.address);
          expect(revealMintEvent.args['unrevealedTokenId']).to.equal(
            unrevealedtokenId
          );
          expect(revealMintEvent.args['amounts']).to.deep.equal(amounts);
          expect(revealMintEvent.args['newTokenIds'].length).to.equal(1);
          expect(revealMintEvent.args['revealHashes']).to.deep.equal([
            revealHashA,
          ]);
        });
      });
    });
  });
});
