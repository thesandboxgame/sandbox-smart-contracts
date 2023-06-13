import { deployments } from "hardhat";
import { expect } from "chai";
import {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
} from "./utils/signatures";
import { BigNumber } from "ethers";

const runTestSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture(["Asset", "AssetCreate", "AuthValidator"]);
    const { deployer, catalystMinter } = await getNamedAccounts();
    const AssetContract = await ethers.getContract("Asset", deployer);

    // SETUP ROLES
    const MinterRole = await AssetContract.MINTER_ROLE();
    const AssetCreateContract = await ethers.getContract(
      "AssetCreate",
      deployer
    );
    const AuthValidatorContract = await ethers.getContract(
      "AuthValidator",
      deployer
    );
    await AssetContract.grantRole(MinterRole, AssetCreateContract.address);

    const CatalystContract = await ethers.getContract("Catalyst", deployer);
    const CatalystMinterRole = await CatalystContract.MINTER_ROLE();
    await CatalystContract.grantRole(
      CatalystMinterRole,
      AssetCreateContract.address
    );
    // END SETUP ROLES

    const mintCatalyst = async (
      tier: number,
      amount: number,
      to = deployer
    ) => {
      const signer = ethers.provider.getSigner(catalystMinter);
      await CatalystContract.connect(signer).mint(to, tier, amount);
    };

    const mintSingleAsset = async (
      signature: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      await AssetCreateContract.createAsset(
        signature,
        tier,
        amount,
        revealed,
        metadataHash,
        deployer
      );
    };

    const mintMultipleAssets = async (
      signature: string,
      tiers: number[],
      amounts: number[],
      revealed: boolean[],
      metadataHashes: string[]
    ) => {
      await AssetCreateContract.createMultipleAssets(
        signature,
        tiers,
        amounts,
        revealed,
        metadataHashes,
        deployer
      );
    };

    const SpecialMinterRole = await AssetCreateContract.SPECIAL_MINTER_ROLE();

    const grantSpecialMinterRole = async (address: string) => {
      await AssetCreateContract.grantRole(SpecialMinterRole, address);
    };

    const mintSpecialAsset = async (
      signature: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      await AssetCreateContract.createSpecialAsset(
        signature,
        tier,
        amount,
        revealed,
        metadataHash,
        deployer
      );
    };
    const getCreatorNonce = async (creator: string) => {
      const nonce = await AssetCreateContract.creatorNonces(creator);
      return nonce;
    };

    const generateSingleMintSignature = async (
      creator: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      const signature = await createAssetMintSignature(
        creator,
        tier,
        amount,
        revealed,
        metadataHash
      );
      return signature;
    };

    const generateMultipleMintSignature = async (
      creator: string,
      tiers: number[],
      amounts: number[],
      revealed: boolean[],
      metadataHashes: string[]
    ) => {
      const signature = await createMultipleAssetsMintSignature(
        creator,
        tiers,
        amounts,
        revealed,
        metadataHashes
      );
      return signature;
    };

    return {
      metadataHashes: [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA",
        "QmcU8NLdWyoDAbPc67irYpCnCH9ciRUjMC784dvRfy1Fja",
      ],
      additionalMetadataHash: "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
      deployer,
      otherWallet: "0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B",
      AssetContract,
      AssetCreateContract,
      AuthValidatorContract,
      CatalystContract,
      mintCatalyst,
      mintSingleAsset,
      mintMultipleAssets,
      mintSpecialAsset,
      grantSpecialMinterRole,
      generateSingleMintSignature,
      generateMultipleMintSignature,
      getCreatorNonce,
    };
  }
);

describe("AssetCreate", () => {
  describe("General", async () => {
    it("should initialize with the correct values", async () => {
      const {
        AssetCreateContract,
        AssetContract,
        CatalystContract,
        AuthValidatorContract,
      } = await runTestSetup();
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
  describe("Single asset mint", async () => {
    it("should revert if the signature is invalid", async () => {
      const { mintCatalyst, mintSingleAsset, metadataHashes } =
        await runTestSetup();
      await mintCatalyst(4, 1);
      const signature =
        "0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c";

      await expect(
        mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if tier mismatches signed tier", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(5, 1);
      const signedTier = 4;
      const txSuppliedTier = 5;
      const signature = await generateSingleMintSignature(
        deployer,
        signedTier,
        1,
        true,
        metadataHashes[0]
      );

      await expect(
        mintSingleAsset(signature, txSuppliedTier, 1, true, metadataHashes[0])
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if amount mismatches signed amount", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 2);
      const signedAmount = 1;
      const txSuppliedAmount = 2;
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        signedAmount,
        true,
        metadataHashes[0]
      );

      await expect(
        mintSingleAsset(signature, 4, txSuppliedAmount, true, metadataHashes[0])
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if metadataHash mismatches signed metadataHash", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 2);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        1,
        true,
        metadataHashes[0]
      );

      await expect(
        mintSingleAsset(signature, 4, 1, true, "0x1234")
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if the signature has been used before", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 2);
      const signature = await generateSingleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if user doesn't have enough catalysts", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
        otherWallet,
      } = await runTestSetup();
      await mintCatalyst(4, 1, otherWallet);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        1,
        true,
        metadataHashes[0]
      );

      await expect(
        mintSingleAsset(signature, 4, 1, true, metadataHashes[0])
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });
    it("should mint a single asset successfully if all conditions are met", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 1);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        1,
        true,
        metadataHashes[0]
      );

      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;
    });
    it("should increment the creator nonce correctly", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        getCreatorNonce,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 1);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        1,
        true,
        metadataHashes[0]
      );

      await expect(mintSingleAsset(signature, 4, 1, true, metadataHashes[0])).to
        .not.be.reverted;

      expect(await getCreatorNonce(deployer)).to.equal(BigNumber.from(1));
    });
    it("should mint the correct amount of assets", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetContract,
        AssetCreateContract,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 5);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        5,
        true,
        metadataHashes[0]
      );
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // get tokenId from the event
      // @ts-ignore
      const tokenId = (await AssetCreateContract.queryFilter("AssetMinted"))[0]
        .args.tokenId;

      expect(await AssetContract.balanceOf(deployer, tokenId)).to.equal(
        BigNumber.from(5)
      );
    });
    it("should mint the correct tier of assets", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetCreateContract,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 5);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        5,
        true,
        metadataHashes[0]
      );
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // get tokenId from the event
      // @ts-ignore
      const tier = (await AssetCreateContract.queryFilter("AssetMinted"))[0]
        .args.tier;
      expect(tier).to.equal(4);
    });
    it("should mint an asset with correct metadataHash", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetContract,
        AssetCreateContract,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 5);
      const signature = await generateSingleMintSignature(
        deployer,
        4,
        5,
        true,
        metadataHashes[0]
      );
      await expect(mintSingleAsset(signature, 4, 5, true, metadataHashes[0])).to
        .not.be.reverted;

      // get tokenId from the event
      // @ts-ignore
      const tokenId = (await AssetCreateContract.queryFilter("AssetMinted"))[0]
        .args.tokenId;

      expect(await AssetContract.hashUsed(metadataHashes[0])).to.equal(tokenId);
    });
    it("should emit an AssetMinted event", async () => {
      const {
        deployer,
        mintCatalyst,
        generateSingleMintSignature,
        AssetCreateContract,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 5);
      const signature = await generateSingleMintSignature(
        deployer,
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
          deployer
        )
      ).to.emit(AssetCreateContract, "AssetMinted");
    });
    it;
    it("should NOT allow minting with the same metadata twice", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 4);
      const signature1 = await generateSingleMintSignature(
        deployer,
        4,
        2,
        true,
        metadataHashes[0]
      );
      await expect(mintSingleAsset(signature1, 4, 2, true, metadataHashes[0]))
        .to.not.be.reverted;
      const signature2 = await generateSingleMintSignature(
        deployer,
        4,
        2,
        true,
        metadataHashes[0]
      );
      await expect(
        mintSingleAsset(signature2, 4, 2, true, metadataHashes[0])
      ).to.be.revertedWith("metadata hash mismatch for tokenId");
    });
    it("should NOT mint same token ids", async () => {
      const {
        deployer,
        mintCatalyst,
        mintSingleAsset,
        generateSingleMintSignature,
        AssetCreateContract,
        metadataHashes,
      } = await runTestSetup();
      await mintCatalyst(4, 4);
      const signature1 = await generateSingleMintSignature(
        deployer,
        4,
        2,
        true,
        metadataHashes[0]
      );
      await expect(mintSingleAsset(signature1, 4, 2, true, metadataHashes[0]))
        .to.not.be.reverted;
      const signature2 = await generateSingleMintSignature(
        deployer,
        4,
        2,
        true,
        metadataHashes[1]
      );
      await expect(mintSingleAsset(signature2, 4, 2, true, metadataHashes[1]))
        .to.not.be.reverted;

      // @ts-ignore
      const tokenId1 = (await AssetCreateContract.queryFilter("AssetMinted"))[0]
        .args.tokenId;
      // @ts-ignore
      const tokenId2 = (await AssetCreateContract.queryFilter("AssetMinted"))[1]
        .args.tokenId;

      expect(tokenId1).to.not.equal(tokenId2);
    });
  });
  describe("Multiple assets mint", async () => {
    it("should revert if signature is invalid", async () => {
      const { mintMultipleAssets, metadataHashes } = await runTestSetup();
      const signature =
        "0x45956f9a4b3f24fcc1a7c1a64f5fe7d21c00dd224a44f868ad8a67fd7b7cf6601e3a69a6a78a6a74377dddd1fa8c0c0f64b766d4a75842c1653b2a1a76c3a0ce1c";
      await expect(
        mintMultipleAssets(
          signature,
          [3, 4],
          [1, 1],
          [true, true],
          metadataHashes
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if tiers mismatch signed values", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(5, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if tiers, amounts and metadatahashes are not of the same length", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        additionalMetadataHash,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Arrays must be same length");
    });
    it("should revert if amounts mismatch signed values", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if metadataHashes mismatch signed values", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        additionalMetadataHash,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if signature has already been used", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("Invalid signature");
    });
    it("should revert if user doesn't have enough catalysts", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
        otherWallet,
      } = await runTestSetup();
      mintCatalyst(3, 1);
      mintCatalyst(4, 1, otherWallet);
      const signature = await generateMultipleMintSignature(
        deployer,
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
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });
    it("should correctly mint multiple assets if all conditions are met", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 1);
      await mintCatalyst(4, 1);

      const signature = await generateMultipleMintSignature(
        deployer,
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
    it("should mint correct amounts of assets", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        AssetContract,
        AssetCreateContract,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 3);
      await mintCatalyst(4, 5);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      const events = await AssetCreateContract.queryFilter("AssetBatchMinted");
      const event = events[0];
      const args = event.args;
      expect(args).to.not.be.undefined;
      const tokenIds = args![1];

      expect(await AssetContract.balanceOf(deployer, tokenIds[0])).to.equal(3);
      expect(await AssetContract.balanceOf(deployer, tokenIds[1])).to.equal(5);
    });
    it("should mint correct tiers of assets", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        AssetCreateContract,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 3);
      await mintCatalyst(4, 5);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      const events = await AssetCreateContract.queryFilter("AssetBatchMinted");
      const event = events[0];
      const args = event.args;
      expect(args).to.not.be.undefined;
      const tiers = args![2];

      expect(tiers[0]).to.equal(3);
      expect(tiers[1]).to.equal(4);
    });
    it("should mint assets with correct metadataHashes", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        AssetContract,
        AssetCreateContract,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 3);
      await mintCatalyst(4, 5);

      const signature = await generateMultipleMintSignature(
        deployer,
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
      const events = await AssetCreateContract.queryFilter("AssetBatchMinted");
      const event = events[0];
      const args = event.args;
      expect(args).to.not.be.undefined;
      const tokenIds = args![1];

      expect(await AssetContract.hashUsed(metadataHashes[0])).to.equal(
        tokenIds[0]
      );
      expect(await AssetContract.hashUsed(metadataHashes[1])).to.equal(
        tokenIds[1]
      );
    });
    it("should emit an AssetBatchMinted event", async () => {
      const {
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        AssetCreateContract,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 3);
      await mintCatalyst(4, 5);

      const signature = await generateMultipleMintSignature(
        deployer,
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
          deployer
        )
      ).to.emit(AssetCreateContract, "AssetBatchMinted");
    });
    it("should NOT allow minting with the same metadataHash twice", async () => {
      const {
        mintMultipleAssets,
        generateMultipleMintSignature,
        mintCatalyst,
        metadataHashes,
        deployer,
      } = await runTestSetup();
      await mintCatalyst(3, 6);
      await mintCatalyst(4, 10);

      const signature1 = await generateMultipleMintSignature(
        deployer,
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
        deployer,
        [3, 4],
        [3, 5],
        [true, true],
        metadataHashes
      );
      expect(
        mintMultipleAssets(
          signature2,
          [3, 4],
          [3, 5],
          [true, true],
          metadataHashes
        )
      ).to.be.revertedWith("metadata hash mismatch for tokenId");
    });
  });
  describe("Special asset mint", () => {
    it("should allow special minter role to mint special assets", async () => {
      const {
        mintSpecialAsset,
        generateSingleMintSignature,
        deployer,
        metadataHashes,
        grantSpecialMinterRole,
      } = await runTestSetup();

      await grantSpecialMinterRole(deployer);
      const signature = await generateSingleMintSignature(
        deployer,
        1,
        1,
        true,
        metadataHashes[0]
      );
      await expect(mintSpecialAsset(signature, 1, 1, true, metadataHashes[0]))
        .to.not.be.reverted;
    });
    it("should NOT ALLOW unauthorized wallets to mint special assets", async () => {
      const {
        mintSpecialAsset,
        generateSingleMintSignature,
        deployer,
        metadataHashes,
      } = await runTestSetup();

      const signature = await generateSingleMintSignature(
        deployer,
        1,
        1,
        true,
        metadataHashes[0]
      );
      await expect(
        mintSpecialAsset(signature, 1, 1, true, metadataHashes[0])
      ).to.be.revertedWith(
        "AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0xb696df569c2dfecb5a24edfd39d7f55b0f442be14350cbc68dbe8eb35489d3a6"
      );
    });
  });
});
