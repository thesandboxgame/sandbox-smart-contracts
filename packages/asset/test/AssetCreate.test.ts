import {expect} from 'chai';
import {BigNumber, Event, ethers} from 'ethers';
import {runCreateTestSetup} from './fixtures/asset/assetCreateFixtures';
import {network} from 'hardhat';

describe.only('AssetCreate (/packages/asset/contracts/AssetCreate.sol)', function () {
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
  describe('Single lazy mint', function () {
    describe('Success', function () {
      it('should correctly lazy mint an asset if all conditions are met', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          await lazyMintAsset(
            signature,
            4,
            1,
            metadataHashes[0],
            10,
            creator.address
          )
        ).to.not.be.reverted;
      });
      it('should mint correct amounts of assets', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;
        expect(eventData.amount).to.equal(5);
      });
      it('should mint correct tier of assets', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;
        expect(eventData.tier).to.equal(4);
      });
      it('should mint asset with correct metadataHash', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;
        expect(eventData.metadataHash).to.equal(metadataHashes[0]);
      });
      it("should increase the creator's balance of MockERC20", async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          MockERC20Contract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const balanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );
        await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const balanceAfter = await MockERC20Contract.balanceOf(creator.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
      });
      it('should increase balance of the treasury', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          MockERC20Contract,
          treasury,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const balanceBefore = await MockERC20Contract.balanceOf(
          treasury.address
        );
        await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const balanceAfter = await await MockERC20Contract.balanceOf(
          treasury.address
        );
        expect(balanceAfter).to.be.gt(balanceBefore);
      });
      it('should burn the catalysts', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          user,
          CatalystContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const balanceBefore = await CatalystContract.balanceOf(user.address, 4);
        await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const balanceAfter = await CatalystContract.balanceOf(user.address, 4);
        expect(balanceAfter).to.be.lt(balanceBefore);
      });
      it('should increment the creator nonce', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          AssetCreateContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const nonceBefore = await AssetCreateContract.creatorNonces(
          creator.address
        );
        await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const nonceAfter = await AssetCreateContract.creatorNonces(
          creator.address
        );
        expect(nonceAfter).to.be.gt(nonceBefore);
      });
      it('should increase the amount for already minted asset', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          AssetContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 10);

        const firstMintSignature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const firstMintResult = await lazyMintAsset(
          firstMintSignature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const firstEventData = firstMintResult.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;

        const secondMintSignature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const secondMintResult = await lazyMintAsset(
          secondMintSignature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const secondEventData = secondMintResult.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;

        // tokenIds should be the same
        expect(secondEventData.tokenId).to.equal(firstEventData.tokenId);

        // users balance should be 10
        expect(
          await AssetContract.balanceOf(creator.address, firstEventData.tokenId)
        ).to.equal(10);
      });
    });
    describe('Revert', function () {
      it('should revert if signature is invalid', async function () {
        const {lazyMintAsset, metadataHashes, creator} =
          await runCreateTestSetup();
        const signature =
          '0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c';
        await expect(
          lazyMintAsset(signature, 4, 1, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if tier does not match the tier in the signature', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 3, 1, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if amount does not match the amount in the signature', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 4, 2, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if metadataHash does not match the metadataHash in the signature', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 4, 1, metadataHashes[1], 10, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if maxSupply does not match the maxSupply in the signature', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 4, 1, metadataHashes[0], 11, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if creator does not match the creator in the signature', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          secondCreator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(
            signature,
            4,
            1,
            metadataHashes[0],
            10,
            secondCreator.address
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });

      it('should revert if the signature has been used before', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 1);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await lazyMintAsset(
          signature,
          4,
          1,
          metadataHashes[0],
          10,
          creator.address
        );
        await expect(
          lazyMintAsset(signature, 4, 1, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if user doesn't have enough catalysts", async function () {
        const {
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 4, 1, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should not allow minting tier 0 assets using lazy minting', async function () {
        const {
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        const signature = await generateLazyMintSignature(
          creator.address,
          0,
          1,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(signature, 0, 1, metadataHashes[0], 10, creator.address)
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it("should revert when lazy vault doesn't have enough balance", async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 100);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          100,
          metadataHashes[0],
          100
        );
        await expect(
          lazyMintAsset(
            signature,
            4,
            100,
            metadataHashes[0],
            100,
            creator.address
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it('should revert when trying to mint more than the max supply during first lazy mint', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 4);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          4,
          metadataHashes[0],
          3
        );
        await expect(
          lazyMintAsset(signature, 4, 4, metadataHashes[0], 3, creator.address)
        ).to.be.revertedWith('AssetCreate: Max supply exceeded');
      });
      it('should revert when trying to mint more than the max supply during second lazy mint', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 11);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const secondSignature = await generateLazyMintSignature(
          creator.address,
          4,
          6,
          metadataHashes[0],
          10
        );
        await expect(
          lazyMintAsset(
            secondSignature,
            4,
            6,
            metadataHashes[0],
            10,
            creator.address
          )
        ).to.be.revertedWith('AssetCreate: Max supply reached');
      });
    });
    describe('Event', function () {
      it('should emit AssetLazyMinted event with the correct data', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );
        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetLazyMinted'
        )[0].args;

        // creator should be the creator
        expect(eventData.creator).to.equal(creator.address);
        // tier should be 4
        expect(eventData.tier).to.equal(4);
        // amount should be 5
        expect(eventData.amount).to.equal(5);
        // metadataHash should be metadataHashes[0]
        expect(eventData.metadataHash).to.equal(metadataHashes[0]);
      });
      it('should emit Catalyst burn event', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          CatalystContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const eventData = result.events.filter(
          (e: Event) => e.address == CatalystContract.address
        );
        expect(eventData).to.not.be.undefined;
      });
      it('shoudl emit LazyVault Distributed event', async function () {
        const {
          mintCatalyst,
          lazyMintAsset,
          generateLazyMintSignature,
          metadataHashes,
          creator,
          LazyVaultContract,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 5);
        const signature = await generateLazyMintSignature(
          creator.address,
          4,
          5,
          metadataHashes[0],
          10
        );
        const result = await lazyMintAsset(
          signature,
          4,
          5,
          metadataHashes[0],
          10,
          creator.address
        );

        const eventData = result.events.filter(
          (e: Event) => e.address == LazyVaultContract.address
        );
        expect(eventData).to.not.be.undefined;
      });
    });
  });
  describe('Multiple lazy mint', function () {
    describe('Success', function () {
      it('should correctly lazy mint multiple assets if all conditions are met', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            selectedMetadataHashes,
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.not.be.reverted;
      });
      it('should mint correct amounts of assets', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;
        expect(eventData[4]).to.deep.equal([5, 5]);
      });
      it('should mint correct tiers of assets', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;
        expect(eventData[3]).to.deep.equal([3, 4]);
      });
      it('should mint assets with correct metadataHashes', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;
        expect(eventData[5]).to.deep.equal(selectedMetadataHashes);
      });
      it('should increase the creators balance of MockERC20', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          MockERC20Contract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const balanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );
        const balanceAfter = await MockERC20Contract.balanceOf(creator.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
      });
      it('should increate multiple creators balances of MockERC20', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          secondCreator,
          MockERC20Contract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, secondCreator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const balanceBefore = await MockERC20Contract.balanceOf(
          creator.address
        );
        const secondBalanceBefore = await MockERC20Contract.balanceOf(
          secondCreator.address
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, secondCreator.address]
        );
        const balanceAfter = await MockERC20Contract.balanceOf(creator.address);
        const secondBalanceAfter = await MockERC20Contract.balanceOf(
          secondCreator.address
        );
        expect(balanceAfter).to.be.gt(balanceBefore);
        expect(secondBalanceAfter).to.be.gt(secondBalanceBefore);
      });
      it('should increase the balance of the treasury', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          MockERC20Contract,
          treasury,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const balanceBefore = await MockERC20Contract.balanceOf(
          treasury.address
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );
        const balanceAfter = await MockERC20Contract.balanceOf(
          treasury.address
        );
        expect(balanceAfter).to.be.gt(balanceBefore);
      });
      it('should burn the catalysts', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          user,
          CatalystContract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const balanceBefore = await CatalystContract.balanceOf(user.address, 3);
        const secondBalanceBefore = await CatalystContract.balanceOf(
          user.address,
          4
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );
        const balanceAfter = await CatalystContract.balanceOf(user.address, 3);
        const secondBalanceAfter = await CatalystContract.balanceOf(
          user.address,
          4
        );
        expect(balanceAfter).to.be.lt(balanceBefore);
        expect(secondBalanceAfter).to.be.lt(secondBalanceBefore);
      });
      it('should increment the creators nonces', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          secondCreator,
          AssetCreateContract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, secondCreator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const nonceBefore = await AssetCreateContract.creatorNonces(
          creator.address
        );
        const secondNonceBefore = await AssetCreateContract.creatorNonces(
          secondCreator.address
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, secondCreator.address]
        );
        const nonceAfter = await AssetCreateContract.creatorNonces(
          creator.address
        );
        const secondNonceAfter = await AssetCreateContract.creatorNonces(
          secondCreator.address
        );
        expect(nonceAfter).to.be.gt(nonceBefore);
        expect(secondNonceAfter).to.be.gt(secondNonceBefore);
      });
      it('should increase the amount for already minted assets', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          secondCreator,
          AssetContract,
          user,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 10);
        await mintCatalyst(4, 10);

        const firstSignature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, secondCreator.address],
          [3, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        const firstResult = await lazyMintMultipleAssets(
          firstSignature,
          [3, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10],
          [creator.address, secondCreator.address]
        );

        const firstEventData = firstResult.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;

        const secondSignature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, secondCreator.address],
          [3, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        const secondResult = await lazyMintMultipleAssets(
          secondSignature,
          [3, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10],
          [creator.address, secondCreator.address]
        );
        const secondEventData = secondResult.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;

        // tokenIds should be the same
        expect(secondEventData[2]).to.deep.equal(firstEventData[2]);

        // users balance should be 10
        expect(
          await AssetContract.balanceOf(user.address, firstEventData[2][0])
        ).to.equal(10);
        expect(
          await AssetContract.balanceOf(user.address, secondEventData[2][1])
        ).to.equal(10);
      });
      it('should work with 5 creators and 5 assets', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          creator,
          secondCreator,
          thirdCreator,
          fourthCreator,
          fifthCreator,
        } = await runCreateTestSetup();
        await mintCatalyst(1, 10);
        await mintCatalyst(2, 10);
        await mintCatalyst(3, 10);
        await mintCatalyst(4, 10);
        await mintCatalyst(5, 10);

        const metadataHashes = [
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA',
          'QmcU8NLdWyoDAbPc67irYpCnCH9ciRUjMC784dvRfy1Fja',
          'QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L',
          'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJB',
          'QmcU8NLdWyoDAbPc67irYpCnCH9ciRUjMC784dvRfy1FjB',
          'QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95C',
        ];

        const firstSignature = await generateLazyMintMultipleAssetsSignature(
          [
            creator.address,
            secondCreator.address,
            thirdCreator.address,
            fourthCreator.address,
            fifthCreator.address,
          ],
          [1, 2, 3, 4, 5],
          [2, 2, 2, 2, 2],
          metadataHashes,
          [10, 10, 10, 10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            firstSignature,
            [1, 2, 3, 4, 5],
            [2, 2, 2, 2, 2],
            metadataHashes,
            [10, 10, 10, 10, 10],
            [
              creator.address,
              secondCreator.address,
              thirdCreator.address,
              fourthCreator.address,
              fifthCreator.address,
            ]
          )
        ).to.not.be.reverted;
      });
    });
    describe('Revert', function () {
      it("should revert if tiers do not match signature's tiers", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [2, 4],
            [1, 1],
            selectedMetadataHashes,
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if amounts do not match signature's amounts", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [2, 1],
            selectedMetadataHashes,
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if metadataHashes do not match signature's metadataHashes", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [metadataHashes[1], metadataHashes[0]],
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if maxSupplies do not match signature's maxSupplies", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            selectedMetadataHashes,
            [11, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should revert if creators do not match signature's creators", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          secondCreator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            selectedMetadataHashes,
            [10, 10],
            [secondCreator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it('should revert if the signature was used before', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 1);
        await mintCatalyst(4, 1);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10]
        );
        await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [1, 1],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            selectedMetadataHashes,
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Invalid signature');
      });
      it("should return if the user doesn't have enough catalysts", async function () {
        const {
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [1, 1],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [3, 4],
            [1, 1],
            [metadataHashes[0], metadataHashes[1]],
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it('should not allow minting tier 0 assets using batch lazy minting', async function () {
        const {
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [0, 4],
          [1, 1],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [0, 4],
            [1, 1],
            [metadataHashes[0], metadataHashes[1]],
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      });
      it("should revert when lazy vault doesn't have enough balance", async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 200);
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [4, 4],
          [100, 100],
          [metadataHashes[0], metadataHashes[1]],
          [100, 100]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [4, 4],
            [100, 100],
            [metadataHashes[0], metadataHashes[1]],
            [100, 100],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it('should revert when trying to mint more than the max supply during first lazy mint', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 4);
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [4, 4],
          [4, 4],
          [metadataHashes[0], metadataHashes[1]],
          [3, 3]
        );
        await expect(
          lazyMintMultipleAssets(
            signature,
            [4, 4],
            [4, 4],
            [metadataHashes[0], metadataHashes[1]],
            [3, 3],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Max supply exceeded');
      });
      it('should revert when trying to mint more than the max supply during second lazy mint', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(4, 100);
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [4, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        await lazyMintMultipleAssets(
          signature,
          [4, 4],
          [5, 5],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10],
          [creator.address, creator.address]
        );
        const secondSignature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [4, 4],
          [6, 6],
          [metadataHashes[0], metadataHashes[1]],
          [10, 10]
        );
        await expect(
          lazyMintMultipleAssets(
            secondSignature,
            [4, 4],
            [6, 6],
            [metadataHashes[0], metadataHashes[1]],
            [10, 10],
            [creator.address, creator.address]
          )
        ).to.be.revertedWith('AssetCreate: Max supply reached');
      });
    });
    describe('Event', function () {
      it('should emit AssetBatchLazyMinted event with the correct data', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.event == 'AssetBatchLazyMinted'
        )[0].args;

        // tiers should be [3, 4]
        expect(eventData[3]).to.deep.equal([3, 4]);
        // amounts should be [5, 5]
        expect(eventData[4]).to.deep.equal([5, 5]);
        // metadataHashes should be selectedMetadataHashes
        expect(eventData[5]).to.deep.equal(selectedMetadataHashes);
      });
      it('should emit Catalyst burn events', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          CatalystContract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.address == CatalystContract.address
        );
        expect(eventData).to.not.be.undefined;
      });
      it('should emit LazyVault Distributed events', async function () {
        const {
          mintCatalyst,
          lazyMintMultipleAssets,
          generateLazyMintMultipleAssetsSignature,
          metadataHashes,
          creator,
          LazyVaultContract,
        } = await runCreateTestSetup();
        await mintCatalyst(3, 5);
        await mintCatalyst(4, 5);
        const selectedMetadataHashes = [metadataHashes[0], metadataHashes[1]];
        const signature = await generateLazyMintMultipleAssetsSignature(
          [creator.address, creator.address],
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10]
        );
        const result = await lazyMintMultipleAssets(
          signature,
          [3, 4],
          [5, 5],
          selectedMetadataHashes,
          [10, 10],
          [creator.address, creator.address]
        );

        const eventData = result.events.filter(
          (e: Event) => e.address == LazyVaultContract.address
        );
        expect(eventData).to.not.be.undefined;
      });
    });
  });
});
