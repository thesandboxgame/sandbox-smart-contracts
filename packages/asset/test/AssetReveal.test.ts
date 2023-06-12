import { expect } from "chai";
import { deployments } from "hardhat";
import {
  createBurnAndRevealSignature,
  createRevealSignature,
} from "./utils/revealSignature";

const runTestSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture([
      "AssetReveal",
      "Asset",
      "AuthValidator",
      "MockMinter",
    ]);
    const { deployer, trustedForwarder, upgradeAdmin } =
      await getNamedAccounts();
    const AssetContract = await ethers.getContract("Asset", deployer);
    const AuthValidatorContract = await ethers.getContract(
      "AuthValidator",
      deployer
    );
    const MockMinterContract = await ethers.getContract("MockMinter", deployer);
    // add mock minter as minter
    const MinterRole = await AssetContract.MINTER_ROLE();
    await AssetContract.grantRole(MinterRole, MockMinterContract.address);
    const AssetRevealContract = await ethers.getContract(
      "AssetReveal",
      deployer
    );
    await AssetContract.grantRole(MinterRole, AssetRevealContract.address);

    // mint a tier 5 asset with 10 copies
    const unRevMintTx = await MockMinterContract.mintAsset(
      deployer,
      10,
      5,
      false,
      "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA"
    );
    const unRevResult = await unRevMintTx.wait();
    const unrevealedtokenId = unRevResult.events[2].args.tokenId.toString();

    await AssetContract.safeTransferFrom(
      deployer,
      upgradeAdmin,
      unrevealedtokenId,
      1,
      "0x00"
    );

    // mint a tier 5 asset with 10 copies
    const unRevMintTx2 = await MockMinterContract.mintAsset(
      deployer,
      10,
      5,
      false,
      "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJD"
    );
    const unRevResult2 = await unRevMintTx2.wait();
    const unrevealedtokenId2 = unRevResult2.events[2].args.tokenId.toString();

    // mint a tier 2 asset with 5 copies
    const revMintTx = await MockMinterContract.mintAsset(
      deployer,
      10,
      5,
      true,
      "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJC"
    );

    const revResult = await revMintTx.wait();
    const revealedtokenId = revResult.events[2].args.tokenId.toString();

    const revealAsset = async (
      signature: string,
      tokenId: number,
      nonce: number,
      amounts: number[],
      metadataHashes: string[]
    ) => {
      const tx = await AssetRevealContract.revealMint(
        signature,
        tokenId,
        nonce,
        amounts,
        metadataHashes
      );
      const result = await tx.wait();
      return result;
    };

    const burnAsset = async (tokenId: number, amount: number) => {
      const tx = await AssetRevealContract.revealBurn(tokenId, amount);
      const result = await tx.wait();
      const burnEvent = result.events[1];
      return { result, nonce: burnEvent.args[2] };
    };

    const revealAssetBatch = async (
      signatures: string[],
      tokenIds: number[],
      nonces: number[],
      amounts: number[][],
      metadataHashes: string[][]
    ) => {
      const tx = await AssetRevealContract.revealBatchMint(
        signatures,
        tokenIds,
        nonces,
        amounts,
        metadataHashes
      );
      const result = await tx.wait();
      return result;
    };

    const burnAssetBatch = async (tokenIds: number[], amounts: number[]) => {
      const tx = await AssetRevealContract.revealBatchBurn(tokenIds, amounts);
      const result = await tx.wait();
      const nonces = [];
      // get nonce from every odd event
      for (let i = 0; i < result.events.length; i++) {
        if (i % 2 === 1) {
          const burnEvent = result.events[i];
          nonces.push(burnEvent.args[2]);
        }
      }
      return { result, nonces };
    };

    const instantReveal = async (
      signature: string,
      tokenId: number,
      burnAmount: number,
      mintAmounts: number[],
      metadataHashes: string[]
    ) => {
      const tx = await AssetRevealContract.burnAndReveal(
        signature,
        tokenId,
        burnAmount,
        mintAmounts,
        metadataHashes
      );
      const result = await tx.wait();
      return result;
    };

    const generateSignature = async (
      recipient: string,
      amounts: number[],
      prevTokenId: number,
      nonce: number,
      metadataHashes: string[]
    ) => {
      const signature = await createRevealSignature(
        recipient,
        amounts,
        prevTokenId,
        nonce,
        metadataHashes
      );
      return signature;
    };

    const generateBurnAndRevealSignature = async (
      recipient: string,
      amounts: number[],
      prevTokenId: number,
      metadataHashes: string[]
    ) => {
      const signature = await createBurnAndRevealSignature(
        recipient,
        amounts,
        prevTokenId,
        metadataHashes
      );
      return signature;
    };

    return {
      deployer,
      generateSignature,
      generateBurnAndRevealSignature,
      revealAsset,
      revealAssetBatch,
      instantReveal,
      burnAsset,
      burnAssetBatch,
      AssetRevealContract,
      AssetContract,
      AuthValidatorContract,
      trustedForwarder,
      unrevealedtokenId,
      unrevealedtokenId2,
      revealedtokenId,
      testAccount: upgradeAdmin,
    };
  }
);

describe.only("AssetReveal", () => {
  describe("General", () => {
    it("Should deploy correctly", async () => {
      const { AssetRevealContract } = await runTestSetup();
      expect(AssetRevealContract.address).to.be.properAddress;
    });
    it("Should have the asset address set correctly", async () => {
      const { AssetRevealContract, AssetContract } = await runTestSetup();
      const assetAddress = await AssetRevealContract.getAssetContract();
      expect(assetAddress).to.equal(AssetContract.address);
    });
    it("Should have the auth validator address set correctly", async () => {
      const { AssetRevealContract, AuthValidatorContract } =
        await runTestSetup();
      const authValidatorAddress = await AssetRevealContract.getAuthValidator();
      expect(authValidatorAddress).to.equal(AuthValidatorContract.address);
    });
    it("Should have the forwarder address set correctly", async () => {
      const { AssetRevealContract, trustedForwarder } = await runTestSetup();
      const forwarderAddress = await AssetRevealContract.getTrustedForwarder();
      expect(forwarderAddress).to.equal(trustedForwarder);
    });
  });
  describe("Burning", () => {
    it("Deployer should have correct initial balance", async () => {
      const { AssetContract, deployer, unrevealedtokenId, revealedtokenId } =
        await runTestSetup();
      const unRevealedDeployerBalance = await AssetContract.balanceOf(
        deployer,
        unrevealedtokenId
      );
      const revealedDeployerBalance = await AssetContract.balanceOf(
        deployer,
        revealedtokenId
      );
      expect(unRevealedDeployerBalance.toString()).to.equal("9");
      expect(revealedDeployerBalance.toString()).to.equal("10");
    });
    it("Should not be able to burn amount less than one", async () => {
      const { AssetRevealContract, unrevealedtokenId } = await runTestSetup();
      await expect(
        AssetRevealContract.revealBurn(unrevealedtokenId, 0)
      ).to.be.revertedWith("Amount should be greater than 0");
    });
    it("Should not be able to burn an asset that is already revealed", async () => {
      const { AssetRevealContract, revealedtokenId } = await runTestSetup();
      await expect(
        AssetRevealContract.revealBurn(revealedtokenId, 1)
      ).to.be.revertedWith("Asset is already revealed");
    });
    it("Should not be able to burn more than owned by the caller", async () => {
      const { AssetRevealContract, unrevealedtokenId } = await runTestSetup();
      await expect(
        AssetRevealContract.revealBurn(unrevealedtokenId, 10)
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });
    it("Should not be able to burn a token that doesn't exist", async () => {
      const { AssetRevealContract } = await runTestSetup();
      await expect(AssetRevealContract.revealBurn(123, 1)).to.be.revertedWith(
        "ERC1155: burn amount exceeds totalSupply"
      );
    });
    it("Should be able to burn unrevealed owned assets", async () => {
      const {
        AssetRevealContract,
        AssetContract,
        unrevealedtokenId,
        deployer,
      } = await runTestSetup();
      const burnTx = await AssetRevealContract.revealBurn(unrevealedtokenId, 1);
      await burnTx.wait();

      const deployerBalance = await AssetContract.balanceOf(
        deployer,
        unrevealedtokenId
      );
      expect(deployerBalance.toString()).to.equal("8");
    });
    it("Should emit burn event with correct data", async () => {
      const { AssetRevealContract, unrevealedtokenId, deployer } =
        await runTestSetup();
      const burnTx = await AssetRevealContract.revealBurn(unrevealedtokenId, 1);
      const burnResult = await burnTx.wait();
      const burnEvent = burnResult.events[1];
      expect(burnEvent.event).to.equal("AssetRevealBurn");
      // msgSender
      expect(burnEvent.args[0]).to.equal(deployer);
      // tokenId
      expect(burnEvent.args[1]).to.equal(unrevealedtokenId);
      // nonce
      expect(burnEvent.args[2].toString()).to.equal("1");
      // creator
      expect(burnEvent.args[3]).to.equal(deployer);
      // tier
      expect(burnEvent.args[4].toString()).to.equal("5");
      // nonce
      expect(burnEvent.args[5].toString()).to.equal("1");
      // amount
      expect(burnEvent.args[6].toString()).to.equal("1");
    });
    it("Should be able to burn multiple unrevealed owned assets", async () => {
      const {
        AssetRevealContract,
        AssetContract,
        unrevealedtokenId,
        unrevealedtokenId2,
        deployer,
      } = await runTestSetup();
      const burnTx = await AssetRevealContract.revealBatchBurn(
        [unrevealedtokenId, unrevealedtokenId2],
        [5, 5]
      );
      await burnTx.wait();

      const deployerBalance1 = await AssetContract.balanceOf(
        deployer,
        unrevealedtokenId
      );
      expect(deployerBalance1.toString()).to.equal("4");

      const deployerBalance2 = await AssetContract.balanceOf(
        deployer,
        unrevealedtokenId2
      );
      expect(deployerBalance2.toString()).to.equal("5");
    });
  });
  describe("Minting", () => {
    it("Should allow minting with valid signature", async () => {
      const {
        deployer,
        unrevealedtokenId,
        burnAsset,
        generateSignature,
        revealAsset,
        AssetContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);

      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        nonce,
        [amount],
        newMetadataHash
      );
      expect(result.events[2].event).to.equal("AssetsRevealed");

      const newTokenId = result.events[2].args.newTokenIds[0];
      const balance = await AssetContract.balanceOf(deployer, newTokenId);
      expect(balance.toString()).to.equal("1");
    });
    it("Should allow mintingw when multiple copies revealed to the same metadata hash", async () => {
      const {
        deployer,
        unrevealedtokenId,
        burnAsset,
        revealAsset,
        generateSignature,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 2;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        nonce,
        [amount],
        newMetadataHash
      );

      expect(result.events[2].event).to.equal("AssetsRevealed");
      expect(result.events[2].args["newTokenIds"].length).to.equal(1);
    });
    it("should increase the tokens supply for tokens with same metadata hash", async () => {
      const {
        deployer,
        unrevealedtokenId,
        burnAsset,
        generateSignature,
        revealAsset,
        AssetContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce: firstNonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        firstNonce,
        newMetadataHash
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        firstNonce,
        [amount],
        newMetadataHash
      );
      const newTokenId = result.events[2].args.newTokenIds[0];
      const balance = await AssetContract.balanceOf(deployer, newTokenId);
      expect(balance.toString()).to.equal("1");

      const { nonce: secondNonce } = await burnAsset(unrevealedtokenId, amount);
      const signature2 = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        secondNonce,
        newMetadataHash
      );
      await revealAsset(
        signature2,
        unrevealedtokenId,
        secondNonce,
        [amount],
        newMetadataHash
      );
      const balance2 = await AssetContract.balanceOf(deployer, newTokenId);
      expect(balance2.toString()).to.equal("2");
    });
    it("Should allow batch reveal minting with valid signatures", async () => {
      const {
        deployer,
        revealAssetBatch,
        burnAssetBatch,
        generateSignature,
        unrevealedtokenId,
        unrevealedtokenId2,
      } = await runTestSetup();
      const newMetadataHash1 = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const newMetadataHash2 = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJZ",
      ];
      const amount1 = 1;
      const amount2 = 1;

      const { nonces } = await burnAssetBatch(
        [unrevealedtokenId, unrevealedtokenId2],
        [amount1, amount2]
      );
      const signature1 = await generateSignature(
        deployer,
        [amount1],
        unrevealedtokenId,
        nonces[0],
        newMetadataHash1
      );

      const signature2 = await generateSignature(
        deployer,
        [amount2],
        unrevealedtokenId2,
        nonces[1],
        newMetadataHash2
      );
      const result = await revealAssetBatch(
        [signature1, signature2],
        [unrevealedtokenId, unrevealedtokenId2],
        nonces,
        [[amount1], [amount2]],
        [newMetadataHash1, newMetadataHash2]
      );

      // expect two events with name AssetsRevealed
      expect(result.events[2].event).to.equal("AssetsRevealed");
      expect(result.events[5].event).to.equal("AssetsRevealed");
    });
    it("Should allow revealing multiple copies at the same time", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        revealAsset,
        unrevealedtokenId,
      } = await runTestSetup();
      const newMetadataHashes = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ1",
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ2",
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ3",
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ4",
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ5",
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ6",
      ];
      const amountToMint = [1, 2, 1, 7, 1, 2];
      const { nonce } = await burnAsset(unrevealedtokenId, 1);
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        nonce,
        newMetadataHashes
      );

      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        nonce,
        amountToMint,
        newMetadataHashes
      );
      expect(result.events[7].event).to.equal("AssetsRevealed");
      expect(result.events[7].args["newTokenIds"].length).to.equal(6);
    });
    it("Should allow instant reveal when authorized by the backed", async () => {
      const {
        deployer,
        generateBurnAndRevealSignature,
        instantReveal,
        unrevealedtokenId,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;

      const signature = await generateBurnAndRevealSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        newMetadataHash
      );

      const result = await instantReveal(
        signature,
        unrevealedtokenId,
        amount,
        [amount],
        newMetadataHash
      );
      expect(result.events[3].event).to.equal("AssetsRevealed");
    });
    it("Should not allow minting with invalid signature", async () => {
      const { revealAsset, unrevealedtokenId } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      await expect(
        revealAsset(
          "0x1556a70d76cc452ae54e83bb167a9041f0d062d000fa0dcb42593f77c544f6471643d14dbd6a6edc658f4b16699a585181a08dba4f6d16a9273e0e2cbed622da1b",
          unrevealedtokenId,
          0,
          amountToMint,
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid prevTokenId", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          123,
          nonce,
          [amount],
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid amount", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          nonce,
          [123],
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid metadataHashes", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          nonce,
          [amount],
          ["QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE"]
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid nonce", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          3,
          [amount],
          ["QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE"]
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow using the same signature twice", async () => {
      const {
        deployer,
        generateSignature,
        burnAsset,
        revealAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amount = 1;
      const { nonce } = await burnAsset(unrevealedtokenId, amount);
      const signature = await generateSignature(
        deployer,
        [amount],
        unrevealedtokenId,
        nonce,
        newMetadataHash
      );

      await revealAsset(
        signature,
        unrevealedtokenId,
        nonce,
        [amount],
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          nonce,
          [amount],
          newMetadataHash
        )
      ).to.be.revertedWith("Signature has already been used");
    });
  });
});
