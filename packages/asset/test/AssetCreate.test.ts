import {expect} from 'chai';
import {BigNumber, Event, ethers} from 'ethers';
import {runCreateTestSetup} from './fixtures/asset/assetCreateFixtures';

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
      const randomAddress = ethers.Wallet.createRandom().address;
      await AssetCreateContractAsAdmin.setTrustedForwarder(randomAddress);
      expect(
        await AssetCreateContractAsAdmin.getTrustedForwarder()
      ).to.be.equal(randomAddress);
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
        ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
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
        ).to.be.revertedWith('AssetCreate: Arrays must be same length');
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
        ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
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
});
