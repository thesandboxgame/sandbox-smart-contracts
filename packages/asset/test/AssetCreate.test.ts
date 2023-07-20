import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {runCreateTestSetup} from './fixtures/assetCreateFixtures';

// TODO: missing AssetCreate DEFAULT_ADMIN, trustedForwarder tests, setTrustedForwarder

describe('AssetCreate (/packages/asset/contracts/AssetCreate.sol)', function () {
  describe('General', function () {
    it('should initialize with the correct values', async function () {
      const {
        AssetCreateContract,
        AssetContract,
        CatalystContract,
        AuthValidatorContract,
      } = await runCreateTestSetup();
      expect(await AssetCreateContract.getAssetContract()).to.equal(
        AssetContract.address
      );
      expect(await AssetCreateContract.getCatalystContract()).to.equal(
        CatalystContract.address
      );
      expect(await AssetCreateContract.getAuthValidator()).to.equal(
        AuthValidatorContract.address
      );
    });
  });
  describe('Single asset mint', function () {
    it('should revert if the signature is invalid', async function () {
      const {mintCatalyst, mintSingleAsset, metadataHashes} =
        await runCreateTestSetup();
      await mintCatalyst(4, 1);
      const signature =
        '0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c';

      await expect(
        mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Invalid signature');
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
        mintSingleAsset(signature, 4, txSuppliedAmount, true, metadataHashes[0])
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Invalid signature');
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
      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;

      await expect(
        mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
      ).to.be.revertedWith('Invalid signature');
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

      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;
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

      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;

      expect(await getCreatorNonce(user.address)).to.equal(BigNumber.from(1));
    });
    it('should mint the correct amount of assets', async function () {
      const {
        user,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetContract,
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
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // TODO:
      // get tokenId from the event
      const tokenId = (
        await AssetCreateContract.queryFilter('AssetMinted')
      )?.[0].args?.tokenId;

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
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // get tokenId from the event
      let tier;
      const events = await AssetCreateContract.queryFilter('AssetMinted');
      if (events != undefined && events.length > 0) {
        const event = events[0];
        if (event != undefined && event.args) {
          tier = event.args.tier;
        }
      }
      expect(tier).to.equal(4);
    });
    it('should mint an asset with correct metadataHash', async function () {
      const {
        user,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetContract,
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
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // get tokenId from the event

      let tokenId;
      const events = await AssetCreateContract.queryFilter('AssetMinted');
      if (events != undefined && events.length > 0) {
        const event = events[0];
        if (event != undefined && event.args) {
          tokenId = event.args.tokenId;
        }
      }
      expect(await AssetContract.hashUsed(metadataHashes[0])).to.equal(tokenId);
    });
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
    it;
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
        AssetCreateContract,
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
        metadataHashes[1]
      );
      await expect(mintSingleAsset(signature2, 4, 2, true, metadataHashes[1]))
        .to.not.be.reverted;

      let tokenId1;
      const events = await AssetCreateContract.queryFilter('AssetMinted');
      if (events != undefined && events.length > 0) {
        const event = events[0];
        if (event != undefined && event.args) {
          tokenId1 = event.args.tokenId;
        }
      }

      let tokenId2;
      if (events != undefined && events.length > 0) {
        const event = events[1];
        if (event != undefined && event.args) {
          tokenId2 = event.args.tokenId;
        }
      }

      expect(tokenId1).to.not.equal(tokenId2);
    });
  });
  describe('Multiple assets mint', function () {
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
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Arrays must be same length');
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
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Invalid signature');
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
      ).to.be.revertedWith('Invalid signature');
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
      const events = await AssetCreateContract.queryFilter('AssetBatchMinted');
      const event = events[0];
      const args = event.args;
      expect(args).to.not.be.undefined;
      let tokenIds;
      if (args != undefined) {
        tokenIds = args[1];
      }

      expect(await AssetContract.balanceOf(user.address, tokenIds[0])).to.equal(
        3
      );
      expect(await AssetContract.balanceOf(user.address, tokenIds[1])).to.equal(
        5
      );
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
      const events = await AssetCreateContract.queryFilter('AssetBatchMinted');
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
      const events = await AssetCreateContract.queryFilter('AssetBatchMinted');
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
  describe('Special asset mint', function () {
    it('should allow special minter role to mint special assets', async function () {
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
        1,
        1,
        true,
        metadataHashes[0]
      );
      await expect(mintSpecialAsset(signature, 1, 1, true, metadataHashes[0]))
        .to.not.be.reverted;
    });
    it('should NOT ALLOW unauthorized wallets to mint special assets', async function () {
      const {
        mintSpecialAsset,
        generateSingleMintSignature,
        user,
        metadataHashes,
      } = await runCreateTestSetup();

      const signature = await generateSingleMintSignature(
        user.address,
        1,
        1,
        true,
        metadataHashes[0]
      );
      await expect(
        mintSpecialAsset(signature, 1, 1, true, metadataHashes[0])
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLocaleLowerCase()} is missing role 0xb696df569c2dfecb5a24edfd39d7f55b0f442be14350cbc68dbe8eb35489d3a6`
      );
    });
  });
});
