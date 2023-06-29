import { expect } from "chai";
import { ethers } from "hardhat";
import { runCatalystSetup } from "./fixtures/catalystFixture";
import { CATALYST_IPFS_CID_PER_TIER } from "../constants";
const catalystArray = [1, 2, 3, 4, 5, 6];
describe("catalyst Contract", () => {
  it("Should deploy correctly", async () => {
    const { catalyst } = await runCatalystSetup();
    expect(catalyst.address).to.be.properAddress;
  });
  describe("Mint Token", () => {
    it("minter can mint", async () => {
      const { catalystAsMinter, user1 } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 6, 2);
      expect(await catalystAsMinter.balanceOf(user1, 6)).to.be.equal(2);
    });
    it("Non minter cannot mint", async () => {
      const { catalyst, user2, user1, minterRole } = await runCatalystSetup();
      await expect(
        catalyst
          .connect(await ethers.provider.getSigner(user1))
          .mint(user2, 1, 1)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Cannot mint invalid catalyst Id", async () => {
      const { catalystAsMinter, user1 } = await runCatalystSetup();
      await expect(catalystAsMinter.mint(user1, 7, 1)).to.be.revertedWith(
        "INVALID_CATALYST_ID"
      );
    });
    it("Minter can batch mint token", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.balanceOf(user1, catalystArray[i])).to.be.equal(
          catalystArray[i] * 2
        );
      }
    });
    it("Minter can mint token", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
    });
  });
  describe("Total Supply", () => {
    it("Total Supply increase on minting", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
        await catalystAsMinter.mint(user1, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(2);
      }
    });
    it("Total Supply increase on batch minting", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
    });
    it("Total Supply decrease on burning", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(0);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystArray, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystAmount[i]
        );

        await catalystAsMinter.burnFrom(user1, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(
          catalystArray[i] * 2 - 2
        );
      }
    });
    it("Total Supply decrease on batch burning", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
      }
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
      catalystAmount = [];

      for (let i = 0; i < catalystArray.length; i++) {
        catalystAmount.push(1);
      }

      await catalystAsMinter.burnBatchFrom(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2 - 1
        );
      }
    });
  });
  describe("Burn catalyst", () => {
    it("minter can burn user's catalyst", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      await catalystAsMinter.burnFrom(user1, 1, 2);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
    });
    it("minter can batch burn user's catalyst", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      await catalystAsMinter.mint(user1, 2, 6);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(6);
      let catalystId = [1, 2];
      let catalystAmount = [2, 2];
      await catalystAsMinter.burnBatchFrom(user1, catalystId, catalystAmount);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(4);
    });
    it("user can burn their catalyst", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .burn(user1, 1, 2);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
    });
    it("user can batch burn their catalyst", async () => {
      const { catalyst, user1, catalystAsMinter } = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      await catalystAsMinter.mint(user1, 2, 6);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(6);
      let catalystId = [1, 2];
      let catalystAmount = [2, 2];
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .burnBatch(user1, catalystId, catalystAmount);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(4);
    });
  });
  describe("Metadata", () => {
    it("user can view token's metadata", async () => {
      const { catalyst } = await runCatalystSetup();
      for(let i = 0; i < catalystArray.length; i++){
        expect(
          await catalyst.uri(catalystArray[i])
        ).to.be.equal(`ipfs://${CATALYST_IPFS_CID_PER_TIER[i]}`);
      }
    });
  });

  describe("Token transfer and approval", () => {
    it("owner can approve operator", async () => {
      const { catalyst, user1, catalystAsMinter, user2 } =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
    });
    it("approved operator can transfer", async () => {
      const { catalyst, user1, catalystAsMinter, user2 } =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .safeTransferFrom(user1, user2, 1, 10, "0x");
      expect(await catalyst.balanceOf(user2, 1)).to.be.equal(10);
    });
    it("approved operator can batch transfer", async () => {
      const { catalyst, user1, catalystAsMinter, user2 } =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      await catalystAsMinter.mint(user1, 2, 10);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .safeBatchTransferFrom(user1, user2, [1, 2], [10, 10], "0x");
      expect(await catalyst.balanceOf(user2, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user2, 2)).to.be.equal(10);
    });
  });
});
