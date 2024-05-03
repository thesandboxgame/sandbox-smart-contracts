import {expect} from 'chai';
import {BigNumber, Event, ethers} from 'ethers';
import {
  LazyMintBatchData,
  runCreateTestSetup,
} from './fixtures/asset/assetCreateFixtures';
import {network} from 'hardhat';
import {parseEther} from 'ethers/lib/utils';

describe('AssetCreate (/packages/asset/contracts/AssetCreate.sol)', function () {
  describe('General', function () {
    it('should deploy successfully', async function () {
      const {AssetCreateContract} = await runCreateTestSetup();

      expect(AssetCreateContract.address).to.be.properAddress;
    });
    it('should have auth validators contract address set correctly', async function () {
      const {AssetCreateContract, AuthValidatorContract} =
        await runCreateTestSetup();
      expect(await AssetCreateContract.getAuthValidator()).to.equal(
        AuthValidatorContract.address
      );
    });
    it('should have catalyst contract address set correctly', async function () {
      const {AssetCreateContract, CatalystContract} =
        await runCreateTestSetup();
      expect(await AssetCreateContract.getCatalystContract()).to.equal(
        CatalystContract.address
      );
    });
    it('should have asset contract address set correctly', async function () {
      const {AssetCreateContract, AssetContract} = await runCreateTestSetup();
      expect(await AssetCreateContract.getAssetContract()).to.equal(
        AssetContract.address
      );
    });
  });
  describe('Trusted Forwarder', function () {
    it('should allow to read the trusted forwarder', async function () {
      const {AssetCreateContract, trustedForwarder} =
        await runCreateTestSetup();
      expect(await AssetCreateContract.getTrustedForwarder()).to.be.equal(
        trustedForwarder.address
      );
    });
    it('should correctly check if an address is a trusted forwarder or not', async function () {
      const {AssetCreateContract, trustedForwarder} =
        await runCreateTestSetup();
      expect(
        await AssetCreateContract.isTrustedForwarder(trustedForwarder.address)
      ).to.be.true;
      expect(
        await AssetCreateContract.isTrustedForwarder(
          ethers.constants.AddressZero
        )
      ).to.be.false;
    });
    it('should allow DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetCreateContractAsAdmin} = await runCreateTestSetup();
      const randomContract = ethers.Wallet.createRandom().address;
      // set code to randomContract
      await network.provider.send('hardhat_setCode', [
        randomContract,
        `0x${'a'.repeat(40)}`,
      ]);
      await AssetCreateContractAsAdmin.setTrustedForwarder(randomContract);
      expect(
        await AssetCreateContractAsAdmin.getTrustedForwarder()
      ).to.be.equal(randomContract);
    });
    it('should not allow non DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetCreateContractAsUser, user, AdminRole} =
        await runCreateTestSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await expect(
        AssetCreateContractAsUser.setTrustedForwarder(randomAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${AdminRole}`
      );
    });
    it('should return correct msgData', async function () {
      const {MockAssetCreateContract} = await runCreateTestSetup();
      // call the function to satisfy the coverage only, but we don't need to check the result
      await MockAssetCreateContract.msgData();
    });
  });
  describe('Pausable', function () {
    it('should allow pauser to pause the contract', async function () {
      const {AssetCreateContract, pause} = await runCreateTestSetup();
      await pause();
      expect(await AssetCreateContract.paused()).to.be.true;
    });
    it('should not allow non pauser to pause the contract', async function () {
      const {AssetCreateContractAsUser, user, PauserRole} =
        await runCreateTestSetup();
      await expect(AssetCreateContractAsUser.pause()).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${PauserRole}`
      );
    });
    it('should allow pauser to unpause the contract', async function () {
      const {AssetCreateContract, pause, unpause} = await runCreateTestSetup();
      await pause();
      expect(await AssetCreateContract.paused()).to.be.true;
      await unpause();
      expect(await AssetCreateContract.paused()).to.be.false;
    });
    it('should not allow non pauser to unpause the contract', async function () {
      const {AssetCreateContractAsUser, user, PauserRole} =
        await runCreateTestSetup();
      await expect(AssetCreateContractAsUser.unpause()).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${PauserRole}`
      );
    });
    it('should not allow createAsset to be called when paused', async function () {
      const {
        user,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
        pause,
      } = await runCreateTestSetup();
      await mintCatalyst(4, 1);
      const signature = await generateSingleMintSignature(
        user.address,
        4,
        1,
        true,
        metadataHashes[0]
      );
      await pause();
      await expect(
        mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow createMultipleAssets to be called when paused', async function () {
      const {
        user,
        mintCatalyst,
        mintMultipleAssets,
        generateMultipleMintSignature,
        metadataHashes,
        pause,
      } = await runCreateTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);
      const signature = await generateMultipleMintSignature(
        user.address,
        [3, 4],
        [1, 1],
        [true, true],
        metadataHashes
      );
      await pause();
      await expect(
        mintMultipleAssets(
          signature,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        )
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should not allow createSpecialAsset to be called when paused', async function () {
      const {
        user,
        grantSpecialMinterRole,
        mintSpecialAsset,
        generateSingleMintSignature,
        metadataHashes,
        pause,
      } = await runCreateTestSetup();
      await grantSpecialMinterRole(user.address);
      const signature = await generateSingleMintSignature(
        user.address,
        0,
        1,
        true,
        metadataHashes[0]
      );
      await pause();
      await expect(
        mintSpecialAsset(signature, 1, metadataHashes[0])
      ).to.be.revertedWith('Pausable: paused');
    });
    it('should allow createAsset to be called when unpaused', async function () {
      const {
        user,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
        unpause,
        pause,
      } = await runCreateTestSetup();
      await pause();
      await mintCatalyst(4, 1);
      const signature = await generateSingleMintSignature(
        user.address,
        4,
        1,
        true,
        metadataHashes[0]
      );
      await unpause();
      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;
    });
    it('should allow createMultipleAssets to be called when unpaused', async function () {
      const {
        user,
        mintCatalyst,
        mintMultipleAssets,
        generateMultipleMintSignature,
        metadataHashes,
        unpause,
        pause,
      } = await runCreateTestSetup();
      await pause();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);
      const signature = await generateMultipleMintSignature(
        user.address,
        [3, 4],
        [1, 1],
        [true, true],
        metadataHashes
      );
      await unpause();
      await expect(
        mintMultipleAssets(
          signature,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        )
      ).to.not.be.reverted;
    });
    it('should allow createSpecialAsset to be called when unpaused', async function () {
      const {
        user,
        grantSpecialMinterRole,
        mintSpecialAsset,
        generateSingleMintSignature,
        metadataHashes,
        unpause,
        pause,
      } = await runCreateTestSetup();
      await pause();
      await grantSpecialMinterRole(user.address);
      const signature = await generateSingleMintSignature(
        user.address,
        0,
        1,
        true,
        metadataHashes[0]
      );
      await unpause();
      await expect(mintSpecialAsset(signature, 1, metadataHashes[0])).to.not.be
        .reverted;
    });
  });
  describe('Single asset mint', function () {
    describe('Success', function () {
      it('should mint a single asset successfully if all conditions are met', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0]))
          .to.not.be.reverted;
      });
      it('should increment the creator nonce correctly', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          getCreatorNonce,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0]))
          .to.not.be.reverted;

        expect(await getCreatorNonce(user.address)).to.equal(BigNumber.from(1));
      });
      it('should mint the correct amount of assets', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          AssetContract,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );

        const result = await mintSingleAsset(
          signature,
          4,
          5,
          true,
          metadataHashes[0]
        );

        const tokenId = result.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args.tokenId;

        expect(await AssetContract.balanceOf(user.address, tokenId)).to.equal(
          BigNumber.from(5)
        );
      });
      it('should mint the correct tier of assets', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );
        const result = await mintSingleAsset(
          signature,
          4,
          5,
          true,
          metadataHashes[0]
        );

        // get tokenId from the event
        const tier = result.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args.tier;
        expect(tier).to.equal(4);
      });
      it('should mint an asset with correct metadataHash', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          AssetContract,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );
        const result = await mintSingleAsset(
          signature,
          4,
          5,
          true,
          metadataHashes[0]
        );

        // get tokenId from the event
        const tokenId = result.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args.tokenId;
        expect(await AssetContract.hashUsed(metadataHashes[0])).to.equal(
          tokenId
        );
      });
    });
    describe('Revert', function () {
      it('should revert if the signature is invalid', async function () {
        const {mintCatalyst, mintSingleAsset, metadataHashes} =
          await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature =
          '0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c';

        await expect(
          mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if tier mismatches signed tier', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(5, 1);
        const signedTier = 4;
        const txSuppliedTier = 5;
        const signature = await generateSingleMintSignature(
          user.address,
          signedTier,
          1,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(signature, txSuppliedTier, 1, true, metadataHashes[0])
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if amount mismatches signed amount', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 2);
        const signedAmount = 1;
        const txSuppliedAmount = 2;
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          signedAmount,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(
            signature,
            4,
            txSuppliedAmount,
            true,
            metadataHashes[0]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if sender is not the creator for which the signature was generated', async function () {
        const {
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
          otherWallet,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateSingleMintSignature(
          otherWallet.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if metadataHash mismatches signed metadataHash', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 2);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(signature, 4, 1, true, '0x1234')
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if the signature has been used before', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 2);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        // expect mint tx not to revert
        await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0]))
          .to.not.be.reverted;

        await expect(
          mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if user doesn't have enough catalysts", async function () {
        const {
          user,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should not allow minting tier 0 assets using createAsset', async function () {
        const {
          user,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        const signature = await generateSingleMintSignature(
          user.address,
          0,
          1,
          true,
          metadataHashes[0]
        );

        await expect(
          mintSingleAsset(signature, 0, 1, true, metadataHashes[0])
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should NOT allow minting with the same metadata twice', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 4);
        const signature1 = await generateSingleMintSignature(
          user.address,
          4,
          2,
          true,
          metadataHashes[0]
        );
        await expect(mintSingleAsset(signature1, 4, 2, true, metadataHashes[0]))
          .to.not.be.reverted;
        const signature2 = await generateSingleMintSignature(
          user.address,
          4,
          2,
          true,
          metadataHashes[0]
        );
        await expect(
          mintSingleAsset(signature2, 4, 2, true, metadataHashes[0])
        ).to.be.revertedWith('Asset: Hash already used');
      });
      it('should NOT mint same token ids', async function () {
        const {
          user,
          mintCatalyst,
          mintSingleAsset,
          generateSingleMintSignature,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 4);
        const signature1 = await generateSingleMintSignature(
          user.address,
          4,
          2,
          true,
          metadataHashes[0]
        );
        const result1 = await mintSingleAsset(
          signature1,
          4,
          2,
          true,
          metadataHashes[0]
        );
        const signature2 = await generateSingleMintSignature(
          user.address,
          4,
          2,
          true,
          metadataHashes[1]
        );
        const result2 = await mintSingleAsset(
          signature2,
          4,
          2,
          true,
          metadataHashes[1]
        );

        const tokenId1 = result1.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args.tokenId;

        const tokenId2 = result2.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args.tokenId;

        expect(tokenId1).to.not.equal(tokenId2);
      });
    });
    describe('Event', function () {
      it('should emit an AssetMinted event', async function () {
        const {
          user,
          mintCatalyst,
          generateSingleMintSignature,
          AssetCreateContract,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );

        await expect(
          AssetCreateContract.createAsset(
            signature,
            4,
            5,
            true,
            metadataHashes[0],
            user.address
          )
        ).to.emit(AssetCreateContract, 'AssetMinted');
      });
      it('should emit AssetMinted event with the correct data', async function () {
        const {
          user,
          mintCatalyst,
          generateSingleMintSignature,
          mintSingleAsset,
          metadataHashes,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );

        const result = await mintSingleAsset(
          signature,
          4,
          5,
          true,
          metadataHashes[0]
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetMinted'
        )[0].args;

        // creator should be user
        expect(eventData.creator).to.equal(user.address);
        // tier should be 4
        expect(eventData.tier).to.equal(4);
        // amount should be 5
        expect(eventData.amount).to.equal(5);
        // metadataHash should be metadataHashes[0]
        expect(eventData.metadataHash).to.equal(metadataHashes[0]);
        // revealed should be true
        expect(eventData.revealed).to.be.true;
      });
      it('should emit catalyst burn event', async function () {
        const {
          user,
          mintCatalyst,
          generateSingleMintSignature,
          metadataHashes,
          AssetCreateContractAsUser,
          CatalystContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          5,
          true,
          metadataHashes[0]
        );
        await expect(
          AssetCreateContractAsUser.createAsset(
            signature,
            4,
            5,
            true,
            metadataHashes[0],
            user.address
          )
        ).to.emit(CatalystContract, 'TransferSingle');
      });
    });
  });
  describe('Multiple assets mint', function () {
    describe('Success', function () {
      it('should correctly mint multiple assets if all conditions are met', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.not.be.reverted;
      });
      it('should mint correct amounts of assets', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          AssetContract,
          AssetCreateContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await mintMultipleAssets(
          signature,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const events = await AssetCreateContract.queryFilter(
          'AssetBatchMinted'
        );
        const event = events[0];
        const args = event.args;
        expect(args).to.not.be.undefined;
        let tokenIds;
        if (args != undefined) {
          tokenIds = args[1];
        }

        expect(
          await AssetContract.balanceOf(user.address, tokenIds[0])
        ).to.equal(3);
        expect(
          await AssetContract.balanceOf(user.address, tokenIds[1])
        ).to.equal(5);
      });
      it('should mint correct tiers of assets', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          AssetCreateContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await mintMultipleAssets(
          signature,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const events = await AssetCreateContract.queryFilter(
          'AssetBatchMinted'
        );
        const event = events[0];
        const args = event.args;
        expect(args).to.not.be.undefined;
        let tiers;
        if (args != undefined) {
          tiers = args[2];
        }

        expect(tiers[0]).to.equal(3);
        expect(tiers[1]).to.equal(4);
      });
      it('should mint assets with correct metadataHashes', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          AssetContract,
          AssetCreateContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await mintMultipleAssets(
          signature,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const events = await AssetCreateContract.queryFilter(
          'AssetBatchMinted'
        );
        const event = events[0];
        const args = event.args;
        expect(args).to.not.be.undefined;
        let tokenIds;
        if (args != undefined) {
          tokenIds = args[1];
        }

        expect(await AssetContract.hashUsed(metadataHashes[0])).to.equal(
          tokenIds[0]
        );
        expect(await AssetContract.hashUsed(metadataHashes[1])).to.equal(
          tokenIds[1]
        );
      });
    });
    describe('Revert', function () {
      it('should revert if signature is invalid', async function () {
        const {mintMultipleAssets, metadataHashes} = await runCreateTestSetup();
        const signature =
          '0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c';
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if tiers mismatch signed values', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(5, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [5, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if sender is not the creator for which the signature was generated', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          otherWallet,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          otherWallet.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if tiers, amounts and metadatahashes are not of the same length', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          additionalMetadataHash,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          [...metadataHashes, additionalMetadataHash]
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            [...metadataHashes, additionalMetadataHash]
          )
        ).to.be.revertedWith('AssetCreate: 2-Array lengths');
      });
      it('should revert if amounts mismatch signed values', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [2, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if metadataHashes mismatch signed values', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          additionalMetadataHash,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            [metadataHashes[1], additionalMetadataHash]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if signature has already been used', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await mintMultipleAssets(
          signature,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if user doesn't have enough catalysts", async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should revert when minting tier 0 assets using createMultipleAssets', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateMultipleMintSignature(
          user.address,
          [0, 4],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature,
            [0, 4],
            [1, 1],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should NOT allow minting with the same metadataHash twice', async function () {
        const {
          mintMultipleAssets,
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 6);
        await mintCatalyst(4, 10);

        const signature1 = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );

        await mintMultipleAssets(
          signature1,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const signature2 = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleAssets(
            signature2,
            [3, 4],
            [3, 5],
            [true, true],
            metadataHashes
          )
        ).to.be.revertedWith('Asset: Hash already used');
      });
    });
    describe('Event', function () {
      it('should emit an AssetBatchMinted event', async function () {
        const {
          generateMultipleMintSignature,
          mintCatalyst,
          metadataHashes,
          AssetCreateContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await expect(
          AssetCreateContract.createMultipleAssets(
            signature,
            [3, 4],
            [3, 5],
            [true, true],
            metadataHashes,
            user.address
          )
        ).to.emit(AssetCreateContract, 'AssetBatchMinted');
      });
      it('should emit AssetBatchMinted event with the correct data', async function () {
        const {
          generateMultipleMintSignature,
          mintCatalyst,
          mintMultipleAssets,
          metadataHashes,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const result = await mintMultipleAssets(
          signature,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetBatchMinted'
        )[0].args;

        // creator should be user
        expect(eventData.creator).to.equal(user.address);
        // tiers should be [3, 4]
        expect(eventData.tiers[0]).to.equal(3);
        expect(eventData.tiers[1]).to.equal(4);
        // amounts should be [3, 5]
        expect(eventData.amounts[0]).to.equal(3);
        expect(eventData.amounts[1]).to.equal(5);
        // metadataHashes should be metadataHashes
        expect(eventData.metadataHashes[0]).to.equal(metadataHashes[0]);
        expect(eventData.metadataHashes[1]).to.equal(metadataHashes[1]);
        // revealed should be [true, true]
        expect(eventData.revealed[0]).to.be.true;
        expect(eventData.revealed[1]).to.be.true;
      });
      it('should emit catalyst burn event', async function () {
        const {
          generateMultipleMintSignature,
          mintCatalyst,

          metadataHashes,
          AssetCreateContractAsUser,
          CatalystContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 3);
        await mintCatalyst(4, 5);

        const signature = await generateMultipleMintSignature(
          user.address,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        );
        await expect(
          AssetCreateContractAsUser.createMultipleAssets(
            signature,
            [3, 4],
            [3, 5],
            [true, true],
            metadataHashes,
            user.address
          )
        ).to.emit(CatalystContract, 'TransferBatch');
      });
    });
  });
  describe('Special asset mint', function () {
    describe('Success', function () {
      it('should allow special minter role to mint special assets with tier 0 (TSB Exclusive)', async function () {
        const {
          mintSpecialAsset,
          generateSingleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateSingleMintSignature(
          user.address,
          0,
          1,
          true,
          metadataHashes[0]
        );
        await expect(mintSpecialAsset(signature, 1, metadataHashes[0])).to.not
          .be.reverted;
      });
    });
    describe('Revert', function () {
      it('should NOT ALLOW unauthorized wallets to mint special assets', async function () {
        const {
          mintSpecialAsset,
          generateSingleMintSignature,
          user,
          metadataHashes,
        } = await runCreateTestSetup();

        const signature = await generateSingleMintSignature(
          user.address,
          0,
          1,
          true,
          metadataHashes[0]
        );
        await expect(
          mintSpecialAsset(signature, 1, metadataHashes[0])
        ).to.be.revertedWith(
          `AccessControl: account ${user.address.toLocaleLowerCase()} is missing role 0xb696df569c2dfecb5a24edfd39d7f55b0f442be14350cbc68dbe8eb35489d3a6`
        );
      });
      it('should not allow miniting tiers other than 0 (TSB Exclusive) using createSpecialAsset', async function () {
        const {
          mintSpecialAsset,
          generateSingleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateSingleMintSignature(
          user.address,
          4,
          1,
          true,
          metadataHashes[0]
        );
        await expect(
          mintSpecialAsset(signature, 1, metadataHashes[0])
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
    });
    describe('Event', function () {
      it('should emit a SpecialAssetMinted event', async function () {
        const {
          generateSingleMintSignature,
          user,
          metadataHashes,
          AssetCreateContractAsUser,
          grantSpecialMinterRole,
          AssetCreateContract,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateSingleMintSignature(
          user.address,
          0,
          1,
          true,
          metadataHashes[0]
        );
        await expect(
          AssetCreateContractAsUser.createSpecialAsset(
            signature,
            1,
            metadataHashes[0],
            user.address
          )
        ).to.emit(AssetCreateContract, 'SpecialAssetMinted');
      });
      it('should emit SpecialAssetMinted event with the correct data', async function () {
        const {
          mintSpecialAsset,
          generateSingleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateSingleMintSignature(
          user.address,
          0,
          1,
          true,
          metadataHashes[0]
        );
        const result = await mintSpecialAsset(signature, 1, metadataHashes[0]);
        const eventData = result.events.filter(
          (e: Event) => e.event == 'SpecialAssetMinted'
        )[0].args;

        // creator should be user
        expect(eventData.creator).to.equal(user.address);
        // tier should be 1
        expect(eventData.tier).to.equal(0);
        // amount should be 1
        expect(eventData.amount).to.equal(1);
        // metadataHash should be metadataHashes[0]
        expect(eventData.metadataHash).to.equal(metadataHashes[0]);
        // revealed should be true
        expect(eventData.revealed).to.be.true;
      });
    });
  });
  describe('Multiple special assets mint', function () {
    describe('Success', function () {
      it('should allow special minter role to mint multiple special assets with tier 0 (TSB Exclusive)', async function () {
        const {
          mintMultipleSpecialAssets,
          generateMultipleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateMultipleMintSignature(
          user.address,
          [0, 0],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleSpecialAssets(signature, [1, 1], metadataHashes)
        ).to.not.be.reverted;
      });
    });
    describe('Revert', function () {
      it('should NOT ALLOW unauthorized wallets to mint multiple special assets', async function () {
        const {
          mintMultipleSpecialAssets,
          generateMultipleMintSignature,
          user,
          metadataHashes,
        } = await runCreateTestSetup();

        const signature = await generateMultipleMintSignature(
          user.address,
          [0, 0],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleSpecialAssets(signature, [1, 1], metadataHashes)
        ).to.be.revertedWith(
          `AccessControl: account ${user.address.toLocaleLowerCase()} is missing role 0xb696df569c2dfecb5a24edfd39d7f55b0f442be14350cbc68dbe8eb35489d3a6`
        );
      });
      it('should NOT ALLOW minting tiers other than 0 (TSB Exclusive) using createMultipleSpecialAssets', async function () {
        const {
          mintMultipleSpecialAssets,
          generateMultipleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateMultipleMintSignature(
          user.address,
          [4, 0],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          mintMultipleSpecialAssets(signature, [1, 1], metadataHashes)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
    });
    describe('Event', function () {
      it('should emit a SpecialAssetBatchMinted event', async function () {
        const {
          generateMultipleMintSignature,
          user,
          metadataHashes,
          AssetCreateContractAsUser,
          grantSpecialMinterRole,
          AssetCreateContract,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateMultipleMintSignature(
          user.address,
          [0, 0],
          [1, 1],
          [true, true],
          metadataHashes
        );
        await expect(
          AssetCreateContractAsUser.createMultipleSpecialAssets(
            signature,
            [1, 1],
            metadataHashes,
            user.address
          )
        ).to.emit(AssetCreateContract, 'SpecialAssetBatchMinted');
      });
      it('should emit SpecialAssetBatchMinted event with the correct data', async function () {
        const {
          mintMultipleSpecialAssets,
          generateMultipleMintSignature,
          user,
          metadataHashes,
          grantSpecialMinterRole,
        } = await runCreateTestSetup();

        await grantSpecialMinterRole(user.address);
        const signature = await generateMultipleMintSignature(
          user.address,
          [0, 0],
          [1, 1],
          [true, true],
          metadataHashes
        );
        const result = await mintMultipleSpecialAssets(
          signature,
          [1, 1],
          metadataHashes
        );
        const eventData = result.events.filter(
          (e: Event) => e.event == 'SpecialAssetBatchMinted'
        )[0].args;

        // creator should be user
        expect(eventData.creator).to.equal(user.address);
        // tiers should be [0, 0]
        expect(eventData.tiers[0]).to.equal(0);
        expect(eventData.tiers[1]).to.equal(0);
        // amounts should be [1, 1]
        expect(eventData.amounts[0]).to.equal(1);
        expect(eventData.amounts[1]).to.equal(1);
        // metadataHashes should be metadataHashes
        expect(eventData.metadataHashes[0]).to.equal(metadataHashes[0]);
        expect(eventData.metadataHashes[1]).to.equal(metadataHashes[1]);
        // revealed should be [true, true]
        expect(eventData.revealed[0]).to.be.true;
        expect(eventData.revealed[1]).to.be.true;
      });
    });
  });
  describe('Single asset lazy mint', function () {
    describe('Success', function () {
      it('should correctly lazy mint an asset if all conditions are met', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
        } = await runCreateTestSetup();

        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];
        const approveAmount = sandPrice.mul(amount);

        await expect(
          await approveAndCall(user, approveAmount, 'lazyCreateAsset', data)
        ).to.not.be.reverted;
      });
      it('should create a new tokenId when lazy minting an asset for the first time', async function () {
        const {
          mintCatalyst,
          approveAndCall,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetContract,
          AssetCreateContract,
          extractTokenIdFromEventData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );
        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        const result = await approveAndCall(
          user,
          approveAmount,
          'lazyCreateAsset',
          data
        );

        const lazyMintEvent = result.events.filter(
          (e: Event) => e.address == AssetCreateContract.address
        )[0];

        const tokenId = extractTokenIdFromEventData(lazyMintEvent.data);

        expect(await AssetContract.exists(tokenId)).to.be.true;
        expect(
          await AssetContract.getTokenIdByMetadataHash(metadataHashes[0])
        ).to.equal(tokenId);
      });
      it('should increase the supply of an existing tokenId when lazy minting an asset for the second time', async function () {
        const {
          mintCatalyst,
          approveAndCall,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetContract,
          AssetCreateContract,
          extractTokenIdFromEventData,
        } = await runCreateTestSetup();

        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount * 2, user.address);

        const firstSignature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', [
          user.address,
          firstSignature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          [],
        ]);

        const secondSignature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const result = await approveAndCall(
          user,
          approveAmount,
          'lazyCreateAsset',
          [
            user.address,
            secondSignature,
            [
              user.address,
              tier,
              amount,
              sandPrice,
              MockERC20Contract.address,
              metadataHashes[0],
              maxSupply,
              creator.address,
            ],
            [],
          ]
        );

        const lazyMintEvent = result.events.filter(
          (e: Event) => e.address == AssetCreateContract.address
        )[0];

        const tokenId = extractTokenIdFromEventData(lazyMintEvent.data);

        expect(await AssetContract.balanceOf(user.address, tokenId)).to.equal(
          2
        );
      });
      it('should distribute the correct amount of sand to the creator', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          approveAndCall,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetCreateContract,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;
        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const creatorBalanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );

        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', data);

        const creatorBalanceAfter = await MockERC20Contract.balanceOf(
          creator.address
        );

        const lazyMintFeeInBps = await AssetCreateContract.lazyMintFeeInBps();
        const creatorShare = sandPrice.sub(
          sandPrice.mul(lazyMintFeeInBps).div(10000)
        );
        expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
          creatorShare
        );
      });
      it('should distribute the correct fee amount to TSB treasury', async function () {
        const {
          mintCatalyst,
          approveAndCall,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetCreateContract,
          treasury,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;
        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const tsbTreasuryBalanceBefore = await MockERC20Contract.balanceOf(
          treasury.address
        );

        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', data);

        const tsbTreasuryBalanceAfter = await MockERC20Contract.balanceOf(
          treasury.address
        );

        const lazyMintFeeInBps = await AssetCreateContract.lazyMintFeeInBps();
        const feeAmount = sandPrice.mul(lazyMintFeeInBps).div(10000);
        expect(tsbTreasuryBalanceAfter.sub(tsbTreasuryBalanceBefore)).to.equal(
          feeAmount
        );
      });
      it('should send the full amount to creator if there is no TSB fee set', async function () {
        const {
          mintCatalyst,
          approveAndCall,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetCreateContractAsAdmin,
        } = await runCreateTestSetup();
        await AssetCreateContractAsAdmin.setLazyMintFee(0);
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;
        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const creatorBalanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );

        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', data);

        const creatorBalanceAfter = await MockERC20Contract.balanceOf(
          creator.address
        );

        expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
          sandPrice
        );
      });
      it('should burn the catalysts from the user', async function () {
        const {
          mintCatalyst,
          approveAndCall,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          CatalystContract,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;
        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const catalystBalanceBefore = await CatalystContract.balanceOf(
          user.address,
          tier
        );

        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', data);

        const catalystBalanceAfter = await CatalystContract.balanceOf(
          user.address,
          tier
        );

        expect(catalystBalanceAfter).to.equal(
          catalystBalanceBefore.sub(amount)
        );
      });
      it('should increment the callers nonce', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          approveAndCall,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetCreateContractAsUser,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;
        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const nonceBefore = await AssetCreateContractAsUser.signatureNonces(
          user.address
        );

        const approveAmount = sandPrice.mul(amount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', data);

        const nonceAfter = await AssetCreateContractAsUser.signatureNonces(
          user.address
        );

        expect(nonceAfter).to.equal(nonceBefore + 1);
      });
      it('should allow lazy minting with manual approval and direct AssetCreate call', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          AssetCreateContractAsUser,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);

        await approveSandForAssetCreate(user, approveAmount);

        const data = [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          [],
        ];

        await MockERC20Contract.approve(
          AssetCreateContractAsUser.address,
          approveAmount
        );

        await expect(AssetCreateContractAsUser.lazyCreateAsset(...data)).to.not
          .be.reverted;
      });

      it('should purchase missing catalysts if user only has partial balance', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          approveSandForExchange,
          CatalystContract,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 3;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, 1, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        await approveSandForExchange(user, parseEther('10'));

        const approveAmount = sandPrice.mul(amount);

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          sampleExchangeOrderData,
        ]);

        const catalystBalanceAfter = await CatalystContract.balanceOf(
          user.address,
          tier
        );

        expect(catalystBalanceAfter).to.equal(0);
      });
      it("should purchase catalysts if user doesn't have any catalysts", async function () {
        const {
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          approveSandForExchange,
          CatalystContract,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 2;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        await approveSandForExchange(user, parseEther('10'));

        const approveAmount = sandPrice.mul(amount);

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          // empty match orders data
          sampleExchangeOrderData,
        ]);

        const catalystBalanceAfter = await CatalystContract.balanceOf(
          user.address,
          tier
        );

        expect(catalystBalanceAfter).to.equal(0);
      });
      it('should purchase catalysts if user have enough catalysts but order data was provided', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          approveSandForExchange,
          CatalystContract,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 2;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);
        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        await approveSandForExchange(user, parseEther('10'));

        const approveAmount = sandPrice.mul(amount);

        await approveAndCall(user, approveAmount, 'lazyCreateAsset', [
          user.address,
          signature,
          [
            user.address,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
          ],
          sampleExchangeOrderData,
        ]);

        const catalystBalanceAfter = await CatalystContract.balanceOf(
          user.address,
          tier
        );

        // users balance should be 2
        expect(catalystBalanceAfter).to.equal(2);
      });
    });
    describe('Revert', function () {
      it('should revert if mintData.caller is different than from address', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
            user,
            // wrong from address
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid caller');
      });
      it('should not allow minting with invalid signature - invalid tier', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            5,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid amount', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            2,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid sandPrice', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            parseEther('0.2'),
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid maxSupply', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            5,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid metadataHash', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[1],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid payment token', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            user.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with invalid signature - invalid creator', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            user.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting with the same signature twice', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await lazyMintAsset(
          signature,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply,
          creator.address
        );

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should not allow minting over the max supply, initial mint', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 11;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Max supply exceeded');
      });
      it('should not allow minting over the max supply, secondary mint', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 5;
        const sandPrice = parseEther('0.1');
        const maxSupply = 9;

        await mintCatalyst(tier, amount * 2, user.address);

        const firstSignature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await lazyMintAsset(
          firstSignature,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply,
          creator.address
        );

        const secondSignature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        await expect(
          lazyMintAsset(
            secondSignature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Max supply reached');
      });
      it("should not allow minting if user doesn't have enough sand", async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('10000000');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it('should not allow minting if user did not approve enough sand for AssetCreate', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
        ).to.be.revertedWith('ERC20: insufficient allowance');
      });
      it('should not allow minting if user did not approve enough sand for Exchange', async function () {
        const {
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          approveSandForAssetCreate,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address,
            undefined,
            undefined,
            sampleExchangeOrderData
          )
        ).to.be.revertedWith('ERC20: insufficient allowance');
      });
      it("should fail if user doesn't have enough catalysts and there is no order data", async function () {
        const {
          generateLazyMintSignature,
          metadataHashes,
          creator,
          MockERC20Contract,
          lazyMintAsset,
          mintCatalyst,
          approveSandForExchange,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        // mint some catalysts to other user
        await mintCatalyst(tier, amount, creator.address);

        await approveSandForExchange(creator, parseEther('10'));

        await expect(
          lazyMintAsset(
            signature,
            tier,
            amount,
            sandPrice,
            MockERC20Contract.address,
            metadataHashes[0],
            maxSupply,
            creator.address
          )
          // Fails to burn catalysts
        ).to.be.revertedWith('ERC1155: burn amount exceeds balance');
      });
    });
    describe('Event', function () {
      it('should emit AssetLazyMinted event with the correct data', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintAsset,
          AssetContract,
          approveSandForAssetCreate,
          extractTokenIdFromEventData,
        } = await runCreateTestSetup();
        const tier = 4;
        const amount = 1;
        const sandPrice = parseEther('0.1');
        const maxSupply = 10;

        await mintCatalyst(tier, amount, user.address);

        const signature = await generateLazyMintSignature(
          creator.address,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply
        );

        const approveAmount = sandPrice.mul(amount);
        await approveSandForAssetCreate(user, approveAmount);

        const result = await lazyMintAsset(
          signature,
          tier,
          amount,
          sandPrice,
          MockERC20Contract.address,
          metadataHashes[0],
          maxSupply,
          creator.address
        );

        const lazyMintEvent = result.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0];

        expect(
          lazyMintEvent.args.recipient,
          "Recipient doesn't match"
        ).to.equal(user.address);
        //creator should be creator
        expect(lazyMintEvent.args.creator, "Creator doesn't match").to.equal(
          creator.address
        );
        //tokenId should be the correct tokenId
        const tokenId = extractTokenIdFromEventData(lazyMintEvent.data);
        expect(
          await AssetContract.getTokenIdByMetadataHash(metadataHashes[0]),
          "TokenId doesn't match metadataHash"
        ).to.equal(tokenId);
        //tier should be the correct tier
        expect(lazyMintEvent.args.tier, "Tier doesn't match").to.equal(tier);
        //amount should be the correct amount
        expect(lazyMintEvent.args.amount, "Amount doesn't match").to.equal(
          amount
        );
        //metadataHash should be the correct metadataHash
        expect(
          lazyMintEvent.args.metadataHash,
          "MetadataHash doesn't match"
        ).to.equal(metadataHashes[0]);
      });
    });
  });
  describe('Batch Lazy Mint', function () {
    describe('Success', function () {
      it('should allow batch lazy minting with valid data', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          [creator.address, creator.address],
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const data = [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ];
        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );
        await expect(
          await approveAndCall(
            user,
            approveAmount,
            'lazyCreateMultipleAssets',
            data
          )
        ).to.not.be.reverted;
      });
      it('should create two new tokens for new assets', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetContract,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          [creator.address, creator.address],
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const data = [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ];
        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );
        await approveAndCall(
          user,
          approveAmount,
          'lazyCreateMultipleAssets',
          data
        );

        for (const asset of assets) {
          const tokenId = await AssetContract.getTokenIdByMetadataHash(
            metadataHashes[assets.indexOf(asset)]
          );
          // token should exist
          expect(await AssetContract.exists(tokenId)).to.be.true;
          // the amount should be correct
          expect(await AssetContract.totalSupply(tokenId)).to.equal(
            asset.amount
          );
        }
      });
      it('should create one new token and increase the supply of an existing token for existing assets', async function () {
        const {
          mintCatalyst,
          generateLazyMintSignature,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetContract,
          approveSandForAssetCreate,
          lazyMintAsset,
        } = await runCreateTestSetup();

        const asset1 = {
          creator: creator.address,
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          metadataHash: metadataHashes[0],
          maxSupply: 10,
        };

        const asset2 = {
          creator: creator.address,
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          metadataHash: metadataHashes[1],
          maxSupply: 10,
        };

        // lazy mint the seconds asset once
        await mintCatalyst(asset2.tier, asset2.amount, user.address);
        await approveSandForAssetCreate(user, asset2.sandPrice);
        const singleMintSignature = await generateLazyMintSignature(
          asset2.creator,
          asset2.tier,
          asset2.amount,
          asset2.sandPrice,
          MockERC20Contract.address,
          asset2.metadataHash,
          asset2.maxSupply
        );

        await lazyMintAsset(
          singleMintSignature,
          asset2.tier,
          asset2.amount,
          asset2.sandPrice,
          MockERC20Contract.address,
          asset2.metadataHash,
          asset2.maxSupply,
          creator.address
        );

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((a) => a.metadataHash),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const data = [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ];
        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );
        await approveAndCall(
          user,
          approveAmount,
          'lazyCreateMultipleAssets',
          data
        );

        for (const asset of assets) {
          const tokenId = await AssetContract.getTokenIdByMetadataHash(
            asset.metadataHash
          );
          // token should exist
          expect(await AssetContract.exists(tokenId)).to.be.true;
          //  the second and third asset should have their supply increased
          if (asset.metadataHash == metadataHashes[1]) {
            expect(await AssetContract.totalSupply(tokenId)).to.equal(2);
          } else {
            expect(await AssetContract.totalSupply(tokenId)).to.equal(1);
          }
        }
      });
      it('should increase the qantity of two lazy minted assets that have been minted before', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetContract,
        } = await runCreateTestSetup();

        const asset1 = {
          creator: creator.address,
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          metadataHash: metadataHashes[0],
          maxSupply: 10,
        };

        const asset2 = {
          creator: creator.address,
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          metadataHash: metadataHashes[1],
          maxSupply: 10,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount * 2, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((a) => a.metadataHash),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature1 = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount * 2)),
          BigNumber.from(0)
        );
        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature1,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        const signature2 = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature2,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        for (const asset of assets) {
          const tokenId = await AssetContract.getTokenIdByMetadataHash(
            asset.metadataHash
          );
          // token should exist
          expect(await AssetContract.exists(tokenId)).to.be.true;
          // the amount should be correct
          expect(await AssetContract.totalSupply(tokenId)).to.equal(2);
        }
      });
      it('should correctly call the Exchange contract to purchase Catalysts', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          approveSandForExchange,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
          AssetContract,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 2,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        // mint only the second asset cats
        await mintCatalyst(asset2.tier, asset2.amount, user.address);

        // approve enough sand for the exchange
        await approveSandForExchange(user, parseEther('10'));

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );
        await approveSandForAssetCreate(user, approveAmount);

        await lazyMintMultipleAssets(user.address, signature, mintData, user, [
          sampleExchangeOrderData,
          [],
        ]);

        for (const asset of assets) {
          const tokenId = await AssetContract.getTokenIdByMetadataHash(
            metadataHashes[assets.indexOf(asset)]
          );
          expect(await AssetContract.exists(tokenId)).to.be.true;
        }
      });
      it('should correctly distribute the sand to the creator and TSB fee', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetCreateContract,
          treasury,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }
        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        const creatorBalanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );
        const treasuryBalanceBefore = await MockERC20Contract.balanceOf(
          treasury.address
        );

        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        const creatorBalanceAfter = await MockERC20Contract.balanceOf(
          creator.address
        );
        const tsbFeeAfter = await MockERC20Contract.balanceOf(treasury.address);

        let totalCreatorShare = BigNumber.from(0);
        let totalTSBShare = BigNumber.from(0);

        const tsbBps = await AssetCreateContract.lazyMintFeeInBps();

        for (const asset of assets) {
          const totalSand = asset.sandPrice.mul(asset.amount);
          const creatorShare = totalSand.mul(10000 - tsbBps).div(10000);
          const tsbShare = totalSand.sub(creatorShare);
          totalCreatorShare = totalCreatorShare.add(creatorShare);
          totalTSBShare = totalTSBShare.add(tsbShare);
        }

        expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
          totalCreatorShare
        );

        expect(tsbFeeAfter.sub(treasuryBalanceBefore)).to.equal(totalTSBShare);
      });
      it('should correctly distribute the sand to the creator, without TSB fee', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetCreateContract,
          AssetCreateContractAsAdmin,
          treasury,
        } = await runCreateTestSetup();

        await AssetCreateContractAsAdmin.setLazyMintFee(0);

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        const creatorBalanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );
        const treasuryBalanceBefore = await MockERC20Contract.balanceOf(
          treasury.address
        );

        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        const creatorBalanceAfter = await MockERC20Contract.balanceOf(
          creator.address
        );
        const tsbFeeAfter = await MockERC20Contract.balanceOf(treasury.address);

        let totalCreatorShare = BigNumber.from(0);
        let totalTSBShare = BigNumber.from(0);

        const tsbBps = await AssetCreateContract.lazyMintFeeInBps();

        for (const asset of assets) {
          const totalSand = asset.sandPrice.mul(asset.amount);
          const creatorShare = totalSand.mul(10000 - tsbBps).div(10000);
          const tsbShare = totalSand.sub(creatorShare);
          totalCreatorShare = totalCreatorShare.add(creatorShare);
          totalTSBShare = totalTSBShare.add(tsbShare);
        }

        expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
          totalCreatorShare
        );

        expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(
          assets.reduce(
            (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
            BigNumber.from(0)
          )
        );

        expect(tsbFeeAfter.sub(treasuryBalanceBefore)).to.equal(totalTSBShare);
      });
      it('should correctly burn the Catalysts from the user', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          CatalystContract,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        const catalystAsset1BalanceBefore = await CatalystContract.balanceOf(
          user.address,
          asset1.tier
        );

        const catalystAsset2BalanceBefore = await CatalystContract.balanceOf(
          user.address,
          asset2.tier
        );

        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        const catalystAsset1BalanceAfter = await CatalystContract.balanceOf(
          user.address,
          asset1.tier
        );

        const catalystAsset2BalanceAfter = await CatalystContract.balanceOf(
          user.address,
          asset2.tier
        );

        expect(catalystAsset1BalanceAfter).to.equal(
          catalystAsset1BalanceBefore.sub(asset1.amount)
        );

        expect(catalystAsset2BalanceAfter).to.equal(
          catalystAsset2BalanceBefore.sub(asset2.amount)
        );
      });
      it('should correctly increment the callers nonce', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveAndCall,
          AssetCreateContract,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        const nonceBefore = await AssetCreateContract.signatureNonces(
          user.address
        );

        await approveAndCall(user, approveAmount, 'lazyCreateMultipleAssets', [
          user.address,
          signature,
          [user.address, ...mintData],
          // empty match orders data
          [],
        ]);

        const nonceAfter = await AssetCreateContract.signatureNonces(
          user.address
        );

        expect(nonceAfter).to.equal(nonceBefore + 1);
      });
    });
    describe('Revert', function () {
      it('should revert if minting any of the assets fails, missing catalyst and no order data', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          approveSandForAssetCreate,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        await mintCatalyst(assets[0].tier, assets[0].amount, user.address);

        // mint cats to other user for more realistic scenario
        await mintCatalyst(assets[1].tier, assets[1].amount, creator.address);

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('ERC1155: burn amount exceeds balance');
      });
      it('should rever if the mintData.caller is different than from address', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(creator.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: Invalid caller');
      });
      it('should revert if creators array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          [creator.address],
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 1-Array lengths');
      });
      it('should revert if amounts array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          [1],
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 2-Array lengths');
      });
      it('should revert if sandPrices array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          [parseEther('0.1')],
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 3-Array lengths');
      });
      it('should revert if paymentTokens array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          [
            MockERC20Contract.address,
            MockERC20Contract.address,
            MockERC20Contract.address,
          ],
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 4-Array lengths');
      });
      it('should revert if metadataHashes array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          [metadataHashes[0]],
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 5-Array lengths');
      });
      it('should revert if maxSupplies array has incorrect length', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 1,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          [10],
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: 6-Array lengths');
      });
      it('should revert if any of the tokens exceed the max supply, initial mint', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 1,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 10,
          sandPrice: parseEther('0.1'),
          maxSupply: 8,
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: Max supply exceeded');
      });
      it('should revert if any of the tokens exceed the max supply, secondary mint', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 6,
          sandPrice: parseEther('0.1'),
          maxSupply: 10,
          creator: creator.address,
        };

        const assets = [asset1];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map((a) => a.maxSupply),
          assets.map((a) => a.creator),
        ];

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount.mul(2));

        const signature1 = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        await lazyMintMultipleAssets(user.address, signature1, mintData, user, [
          [],
          [],
        ]);
        const signature2 = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        await expect(
          lazyMintMultipleAssets(user.address, signature2, mintData, user, [
            [],
            [],
          ])
        ).to.be.revertedWith('AssetCreate: Max supply reached');
      });
      it('should revert when Exchange contract has not been approved for the correct amount of sand', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount - 2, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map(() => 10),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );
        await approveSandForAssetCreate(user, approveAmount);

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            sampleExchangeOrderData,
            sampleExchangeOrderData,
          ])
        ).to.be.revertedWith('ERC20: insufficient allowance');
      });
      it("should revert if the user doesn't have enough sand to purchase Catalysts", async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          approveSandForExchange,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const asset2 = {
          tier: 2,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount - 2, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map(() => 10),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        // send 95 sand from user to creator
        await MockERC20Contract.connect(user).transfer(
          creator.address,
          parseEther('95')
        );

        await approveSandForAssetCreate(user, approveAmount);
        await approveSandForExchange(user, parseEther('10'));

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            sampleExchangeOrderData,
            sampleExchangeOrderData,
          ])
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it("should revert if the user doesn't have enough sand to pay the creator", async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          approveSandForExchange,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          approveSandForAssetCreate,
          lazyMintMultipleAssets,
          sampleExchangeOrderData,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
        };

        const assets = [asset1];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount - 2, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((_, i) => metadataHashes[i]),
          assets.map(() => 10),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);
        await approveSandForExchange(user, parseEther('10'));

        // send away 90 sand
        await MockERC20Contract.connect(user).transfer(
          creator.address,
          parseEther('90')
        );

        await expect(
          lazyMintMultipleAssets(user.address, signature, mintData, user, [
            sampleExchangeOrderData,
            sampleExchangeOrderData,
          ])
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
    });
    describe('Event', function () {
      it('should emit AssetBatchLazyMinted event with the correct data', async function () {
        const {
          mintCatalyst,
          generateLazyMintMultipleAssetsSignature,
          approveSandForAssetCreate,
          metadataHashes,
          creator,
          user,
          MockERC20Contract,
          lazyMintMultipleAssets,
          AssetContract,
        } = await runCreateTestSetup();

        const asset1 = {
          tier: 4,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
          metadataHash: metadataHashes[0],
        };

        const asset2 = {
          tier: 2,
          amount: 10,
          sandPrice: parseEther('0.1'),
          creator: creator.address,
          metadataHash: metadataHashes[1],
        };

        const assets = [asset1, asset2];

        for (const asset of assets) {
          await mintCatalyst(asset.tier, asset.amount, user.address);
        }

        const mintData: LazyMintBatchData = [
          assets.map((a) => a.tier),
          assets.map((a) => a.amount),
          assets.map((a) => a.sandPrice),
          assets.map(() => MockERC20Contract.address),
          assets.map((a) => a.metadataHash),
          assets.map(() => 10),
          assets.map((a) => a.creator),
        ];

        const signature = await generateLazyMintMultipleAssetsSignature(
          mintData
        );

        const approveAmount = assets.reduce(
          (acc, a) => acc.add(a.sandPrice.mul(a.amount)),
          BigNumber.from(0)
        );

        await approveSandForAssetCreate(user, approveAmount);

        const tx = await lazyMintMultipleAssets(
          user.address,
          signature,
          mintData,
          user,
          [[], []]
        );

        const tokenId1 = await AssetContract.getTokenIdByMetadataHash(
          metadataHashes[0]
        );
        const tokenId2 = await AssetContract.getTokenIdByMetadataHash(
          metadataHashes[1]
        );

        const eventData = tx.events.filter(
          (e: Event) => e.event === 'AssetBatchLazyMinted'
        )[0].args;

        expect(eventData[0]).to.equal(user.address);
        // indexed creators
        expect(eventData[1]).to.be.instanceOf(Object);
        expect(eventData[2]).to.deep.equal([tokenId1, tokenId2]);
        expect(eventData[3]).to.deep.equal([asset1.tier, asset2.tier]);
        expect(eventData[4]).to.deep.equal([
          BigNumber.from(asset1.amount),
          BigNumber.from(asset2.amount),
        ]);
        expect(eventData[5]).to.deep.equal([
          asset1.metadataHash,
          asset2.metadataHash,
        ]);
      });
    });
  });
});
