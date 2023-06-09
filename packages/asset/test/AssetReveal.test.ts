import { expect } from "chai";
import { deployments } from "hardhat";
import { createEIP712RevealSignature } from "./utils/revealSignature";

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

    const generateSignature = async (
      recipient: string,
      amounts: number[],
      prevTokenId: number,
      metadataHashes: string[]
    ) => {
      const signature = await createEIP712RevealSignature(
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
      // creator
      expect(burnEvent.args[2]).to.equal(deployer);
      // tier
      expect(burnEvent.args[3].toString()).to.equal("5");
      // nonce
      expect(burnEvent.args[4].toString()).to.equal("1");
      // amount
      expect(burnEvent.args[5].toString()).to.equal("1");
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
        generateSignature,
        AssetRevealContract,
        AssetContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHash
      );

      const tx = await AssetRevealContract.revealMint(
        signature,
        unrevealedtokenId,
        amountToMint,
        newMetadataHash
      );

      const result = await tx.wait();
      expect(result.events[2].event).to.equal("AssetsRevealed");

      const newTokenId = result.events[2].args.newTokenIds[0];
      const balance = await AssetContract.balanceOf(deployer, newTokenId);
      expect(balance.toString()).to.equal("1");
    });
    it("Should allow mintingw when multiple copies revealed to the same metadata hash", async () => {
      const {
        deployer,
        unrevealedtokenId,
        AssetRevealContract,
        generateSignature,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [2];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHash
      );

      const tx = await AssetRevealContract.revealMint(
        signature,
        unrevealedtokenId,
        amountToMint,
        newMetadataHash
      );

      const result = await tx.wait();
      expect(result.events[2].event).to.equal("AssetsRevealed");
      expect(result.events[2].args["newTokenIds"].length).to.equal(1);
    });
    it("Should allow batch reveal minting with valid signatures", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        unrevealedtokenId2,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash1 = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const newMetadataHash2 = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJZ",
      ];
      const amountToMint1 = [1];
      const amountToMint2 = [1];
      const signature1 = await generateSignature(
        deployer,
        amountToMint1,
        unrevealedtokenId,
        newMetadataHash1
      );

      const signature2 = await generateSignature(
        deployer,
        amountToMint2,
        unrevealedtokenId2,
        newMetadataHash2
      );

      const tx = await AssetRevealContract.revealBatchMint(
        [signature1, signature2],
        [unrevealedtokenId, unrevealedtokenId2],
        [amountToMint1, amountToMint2],
        [newMetadataHash1, newMetadataHash2]
      );

      const result = await tx.wait();
      // expect two events with name AssetsRevealed
      expect(result.events[2].event).to.equal("AssetsRevealed");
      expect(result.events[5].event).to.equal("AssetsRevealed");
    });
    it("Should allow revealing multiple copies at the same time", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        AssetRevealContract,
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
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHashes
      );

      const tx = await AssetRevealContract.revealMint(
        signature,
        unrevealedtokenId,
        amountToMint,
        newMetadataHashes
      );
      const result = await tx.wait();
      expect(result.events[7].event).to.equal("AssetsRevealed");
      expect(result.events[7].args["newTokenIds"].length).to.equal(6);
    });

    it("Should not allow minting with invalid signature", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      await expect(
        AssetRevealContract.revealMint(
          "0x1556a70d76cc452ae54e83bb167a9041f0d062d000fa0dcb42593f77c544f6471643d14dbd6a6edc658f4b16699a585181a08dba4f6d16a9273e0e2cbed622da1b",
          unrevealedtokenId,
          amountToMint,
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid prevTokenId", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          123,
          amountToMint,
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid amount", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          [123],
          newMetadataHash
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting with invalid metadataHashes", async () => {
      const {
        deployer,
        generateSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        unrevealedtokenId,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          amountToMint,
          ["QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE"]
        )
      ).to.be.revertedWith("Invalid signature");
    });
    it("Should not allow minting an asset that is already revealed", async () => {
      const {
        deployer,
        generateSignature,
        revealedtokenId,
        AssetRevealContract,
      } = await runTestSetup();
      const newMetadataHash = [
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF",
      ];
      const amountToMint = [1];
      const signature = await generateSignature(
        deployer,
        amountToMint,
        revealedtokenId,
        newMetadataHash
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          revealedtokenId,
          amountToMint,
          newMetadataHash
        )
      ).to.be.revertedWith("Asset: already revealed");
    });
  });
});
