import { deployments } from "hardhat";
import {
  batchRevealSignature,
  burnAndRevealSignature,
  revealSignature,
} from "../utils/revealSignature";

export const runRevealTestSetup = deployments.createFixture(
    async ({ deployments, getNamedAccounts, getUnnamedAccounts, ethers }) => {
      await deployments.fixture([
        "AssetReveal",
        "Asset",
        "AuthValidator",
        "MockMinter", // reveal tests use MockMinter instead of AssetCreate
      ]);
      // SET UP ROLES
      const { deployer, trustedForwarder } =
        await getNamedAccounts();
      const users = await getUnnamedAccounts();
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
        users[0]
      );
      await AssetContract.grantRole(MinterRole, AssetRevealContract.address);
      // END SET UP ROLES
  
      // mint a tier 5 asset with 10 copies
      const unRevMintTx = await MockMinterContract.mintAsset(
        users[0],
        10, // amount
        5, // tier
        false, // revealed
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA" // metadata hash
      );
      const unRevResult = await unRevMintTx.wait();
      const unrevealedtokenId = unRevResult.events[2].args.tokenId.toString();
  
      // await AssetContract.safeTransferFrom(
      //   users[0],
      //   users[1], 
      //   unrevealedtokenId,
      //   1,
      //   "0x00"
      // );
  
      // mint a tier 5 asset with 10 copies
      const unRevMintTx2 = await MockMinterContract.mintAsset(
        users[0],
        10,
        5,
        false,
        "QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJD"
      );
      const unRevResult2 = await unRevMintTx2.wait();
      const unrevealedtokenId2 = unRevResult2.events[2].args.tokenId.toString();
  
      // mint a revealed version, tier 5 asset with 10 copies
      const revMintTx = await MockMinterContract.mintAsset(
        users[0],
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
        amounts: number[],
        metadataHashes: string[]
      ) => {
        const tx = await AssetRevealContract.revealMint(
          signature,
          tokenId,
          amounts,
          metadataHashes
        );
        const result = await tx.wait();
        return result;
      };
  
      // const burnAsset = async (tokenId: number, amount: number) => {
      //   const tx = await AssetRevealContract.revealBurn(tokenId, amount);
      //   const result = await tx.wait();
      //   const burnEvent = result.events[1];
      //   return { result, nonce: burnEvent.args[2] };
      // };
  
      const revealAssetBatch = async (
        signature: string,
        tokenIds: number[],
        amounts: number[][],
        metadataHashes: string[][]
      ) => {
        const tx = await AssetRevealContract.revealBatchMint(
          signature,
          tokenIds,
          amounts,
          metadataHashes
        );
        const result = await tx.wait();
        return result;
      };
  
      // const burnAssetBatch = async (tokenIds: number[], amounts: number[]) => {
      //   const tx = await AssetRevealContract.revealBatchBurn(tokenIds, amounts);
      //   const result = await tx.wait();
      //   const nonces = [];
      //   // get nonce from every odd event // TODO: why?
      //   for (let i = 0; i < result.events.length; i++) {
      //     if (i % 2 === 1) {
      //       const burnEvent = result.events[i];
      //       nonces.push(burnEvent.args[2]);
      //     }
      //   }
      //   return { result, nonces };
      // };
  
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
  
      const generateRevealSignature = async (
        revealer: string,
        prevTokenId: number,
        amounts: number[],
        metadataHashes: string[]
      ) => {
        const signature = await revealSignature(
          revealer,
          prevTokenId,
          amounts,
          metadataHashes
        );
        return signature;
      };
  
      const generateBatchRevealSignature = async (
        revealer: string,
        prevTokenIds: number[],
        amounts: number[][],
        metadataHashes: string[][]
      ) => {
        const signature = await batchRevealSignature(
          revealer,
          prevTokenIds,
          amounts,
          metadataHashes
        );
        return signature;
      };
  
      const generateBurnAndRevealSignature = async (
        revealer: string,
        prevTokenId: number,
        amounts: number[],
        metadataHashes: string[]
      ) => {
        const signature = await burnAndRevealSignature(
          revealer,
          prevTokenId,
          amounts,
          metadataHashes
        );
        return signature;
      };
  
      return {
        deployer,
        generateRevealSignature,
        generateBatchRevealSignature,
        generateBurnAndRevealSignature,
        revealAsset,
        revealAssetBatch,
        instantReveal,
        // burnAsset,
        // burnAssetBatch,
        AssetRevealContract,
        AssetContract,
        AuthValidatorContract,
        trustedForwarder,
        unrevealedtokenId,
        unrevealedtokenId2,
        revealedtokenId,
        users,
      };
    }
  );