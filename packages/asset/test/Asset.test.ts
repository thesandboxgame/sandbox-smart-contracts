import { expect } from "chai";
import { deployments, getUnnamedAccounts } from "hardhat";
import { expectEventWithArgs } from "../util";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { setupOperatorFilter } from "./fixture";
import { mock } from "node:test";

const catalystArray = [1, 2, 3, 4, 5, 6];

const catalystBurnAmount = [2, 4, 6, 8, 10, 12];

type AssetMintData = {
  creator: string;
  amount: number;
  tier: number;
  isNFT: boolean;
  revealed: boolean;
  revealHash: number;
};

function getAssetData(
  creator: string,
  amount: number,
  tier: number,
  creatorNonce: number,
  isNFT: boolean,
  revealed: boolean,
  revealHash: number
) {
  return {
    creator: creator,
    amount: amount,
    tier: tier,
    creatorNonce: creatorNonce,
    isNFT: isNFT,
    revealed: revealed,
    revealHash: revealHash,
  };
}

function generateOldAssetId(
  creator: string,
  assetNumber: number,
  isNFT: boolean
) {
  const hex = assetNumber.toString(16);
  const hexLength = hex.length;
  let zeroAppends = "";
  const zeroAppendsLength = 24 - hexLength;
  for (let i = 0; i < zeroAppendsLength; i++) {
    if (i == zeroAppendsLength - 1) {
      if (isNFT) {
        zeroAppends = "8" + zeroAppends;
      } else {
        zeroAppends = zeroAppends + "0";
      }
    } else {
      zeroAppends = zeroAppends + "0";
    }
  }
  return `${creator}${zeroAppends}${hex}`;
}

const runAssetSetup = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    console.log("deploy");
    await deployments.fixture(["Asset"]);
    const { deployer, revealer } = await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const owner = users[0];
    const secondOwner = users[1];
    const bridgeMinter = users[2];
    const AssetContract = await ethers.getContract("Asset", deployer);
    const Asset = await ethers.getContract("Asset");
    const minterRole = await AssetContract.MINTER_ROLE();
    const bridgeMinterRole = await AssetContract.BRIDGE_MINTER_ROLE();
    await AssetContract.grantRole(minterRole, deployer);
    await AssetContract.grantRole(bridgeMinterRole, bridgeMinter);
    const uris = [
      "QmSRVTH8VumE42fqmdzPHuA57LjCaUXQRequVzEDTGMyHY",
      "QmTeRr1J2kaKM6e1m8ixLfZ31hcb7XNktpbkWY5tMpjiFR",
      "QmUxnKe5DyjxKuwq2AMGDLYeQALnQxcffCZCgtj5a41DYw",
      "QmYQztw9x8WyrUFDxuc5D4xYaN3pBXWNGNAaguvfDhLLgg",
      "QmUXH1JBPMYxCmzNEMRDGTPtHmePvbo4uVEBreN3sowDwG",
      "QmdRwSPCuPGfxSYTaot9Eqz8eU9w1DGp8mY97pTCjnSWqk",
      "QmNrwUiZfQLYaZFHNLzxqfiLxikKYRzZcdWviyDaNhrVhm",
    ];
    const baseUri = "ipfs://";

    return {
      deployer,
      AssetContract,
      Asset,
      revealer,
      owner,
      secondOwner,
      bridgeMinter,
      minterRole,
      bridgeMinterRole,
      uris,
      baseUri,
    };
  }
);

describe.skip("AssetContract", () => {
  it("Should deploy correctly", async () => {
    const { AssetContract } = await runAssetSetup();
    expect(AssetContract.address).to.be.properAddress;
  });

  describe("Token URI", () => {
    it("Should return correct asset uri ", async () => {
      const { AssetContract, owner, uris, baseUri } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );
    });

    it("admin can change asset uri ", async () => {
      const { AssetContract, owner, uris, baseUri } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );

      await AssetContract.setTokenUri(tokenId, uris[1]);

      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[1]}`
      );
    });

    it("admin can change asset uri ", async () => {
      const { AssetContract, owner, uris, baseUri } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[0]}`
      );

      await AssetContract.setTokenUri(tokenId, uris[1]);

      expect(await AssetContract.uri(tokenId)).to.be.equal(
        `${baseUri}${uris[1]}`
      );
    });

    it.skip("no two asset can have same uri ", async () => {
      const { AssetContract, owner, uris, baseUri } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      await AssetContract.mint(assetData, uris[0]);
      const assetDataNew = getAssetData(owner, 10, 3, 2, false, false, 0);

      await expect(
        AssetContract.mint(assetDataNew, uris[0])
      ).to.be.revertedWith("ipfs already used");
    });
  });

  describe("Minting", () => {
    it("Should mint an asset", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);
    });

    it("only minter can mint an asset", async () => {
      const { Asset, owner, minterRole, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).mint(
          assetData,
          uris[0]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Should mint asset with same tier and same creator with different ids ", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId1)).to.be.equal(10);
      const assetData2 = getAssetData(owner, 5, 3, 2, false, false, 0);
      const tnx2 = await AssetContract.mint(assetData2, uris[1]);
      const args2 = await expectEventWithArgs(
        AssetContract,
        tnx2,
        "TransferSingle"
      );
      const tokenId2 = args2.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId2)).to.be.equal(5);
      expect(tokenId1).not.be.equal(tokenId2);
    });

    it("Should mint Batch assets", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      let assetDataArr = [];
      let assetUris = [];
      for (let i = 0; i < catalystArray.length; i++) {
        assetDataArr.push(
          getAssetData(owner, 10, catalystArray[i], i + 1, false, false, 0)
        );
        assetUris.push(uris[i]);
      }
      const tnx = await AssetContract.mintBatch(assetDataArr, assetUris);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferBatch"
      );
      const tokenIds = args.args.ids;
      for (let i = 0; i < tokenIds.length; i++) {
        expect(await AssetContract.balanceOf(owner, tokenIds[i])).to.be.equal(
          10
        );
      }
    });

    it("only minter can mint batch an asset", async () => {
      const { Asset, owner, minterRole, uris } = await runAssetSetup();
      let assetDataArr = [];
      let assetUris = [];
      for (let i = 0; i < catalystArray.length; i++) {
        assetDataArr.push(
          getAssetData(owner, 10, catalystArray[i], i + 1, false, false, 0)
        );
        assetUris.push(uris[i]);
      }
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).mintBatch(
          assetDataArr,
          assetUris
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Should mint Batch assets with same catalyst and creator with different ids", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      let assetDataArr = [];
      let assetUris = [];
      for (let i = 0; i < 2; i++) {
        assetDataArr.push(getAssetData(owner, 10, 3, i + 1, false, false, 0));
        assetUris.push(uris[i]);
      }
      const tnx = await AssetContract.mintBatch(assetDataArr, assetUris);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferBatch"
      );
      const tokenIds = args.args.ids;
      expect(tokenIds[0]).to.not.be.equal(tokenIds[1]);
      for (let i = 0; i < tokenIds.length; i++) {
        expect(await AssetContract.balanceOf(owner, tokenIds[i])).to.be.equal(
          10
        );
      }
    });
  });

  describe("Reveal Mint", () => {
    it.skip("Should not mint new revealed token when the reveal hash is same for tokens with same creator and same catalyst tier", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);
      await AssetContract.burnFrom(owner, tokenId, 2);
      const tnxReveal = await AssetContract.revealMint(
        owner,
        2,
        tokenId,
        [123, 123],
        [uris[1], uris[1]]
      );
      const argsReveal = await expectEventWithArgs(
        AssetContract,
        tnxReveal,
        "TransferBatch"
      );
      const tokenIdReveled = argsReveal.args.ids;
      expect(tokenIdReveled[0]).to.be.equal(tokenIdReveled[1]);
      expect(
        await AssetContract.balanceOf(owner, tokenIdReveled[0])
      ).to.be.equal(2);
    });

    it.skip("only minter can reveal mint", async () => {
      const { AssetContract, owner, Asset, minterRole, uris } =
        await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);
      await AssetContract.burnFrom(owner, tokenId, 2);
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).revealMint(
          owner,
          2,
          tokenId,
          [123, 123],
          [uris[1], uris[1]]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });
  });

  describe("Mint Special", () => {
    it("Should mintSpecial asset", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mintSpecial(owner, assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = await args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);
    });

    it("only minter can mint special", async () => {
      const { Asset, owner, minterRole, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).mintSpecial(
          owner,
          assetData,
          uris[0]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });
  });

  describe.skip("Bridge minting", () => {
    it("Should bridge mint asset", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, false);
      const tnx = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 10, 3, owner, false, 123, uris[0]);
      const args = await expectEventWithArgs(Asset, tnx, "TransferSingle");
      const tokenId = await args.args.id;
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(10);
    });

    it("Should bridge mint a NFT with supply 1", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, true);
      const tnx = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 1, 3, owner, true, 123, uris[0]);
      const args = await expectEventWithArgs(Asset, tnx, "TransferSingle");
      const tokenId = await args.args.id;
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(1);
    });

    it("Should revert for bridge minting a NFT with supply more than 1", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, true);
      await expect(
        Asset.connect(await ethers.provider.getSigner(bridgeMinter)).bridgeMint(
          oldAssetId,
          10,
          3,
          owner,
          true,
          123,
          uris[0]
        )
      ).to.be.revertedWith("Amount must be 1 for NFTs");
    });

    it("Should not bridge mint a NFT with supply 1 twice", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, true);
      const tnx = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 1, 3, owner, true, 123, uris[0]);
      const args = await expectEventWithArgs(Asset, tnx, "TransferSingle");
      const tokenId = await args.args.id;
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(1);

      // TODO this transaction should be reverted as an NFT should not be bridge minted twice
      const tnx1 = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 1, 3, owner, true, 123, uris[0]);
      const args1 = await expectEventWithArgs(Asset, tnx1, "TransferSingle");
      const tokenId1 = await args1.args.id;
      expect(tokenId).to.be.equal(tokenId1);
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(2);
      expect(await Asset.balanceOf(owner, tokenId1)).to.be.equal(2);
    });

    it("Should  bridge mint a FT with twice", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, false);
      const tnx = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 5, 3, owner, true, 123, uris[0]);
      const args = await expectEventWithArgs(Asset, tnx, "TransferSingle");
      const tokenId = await args.args.id;
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(5);

      const tnx1 = await Asset.connect(
        await ethers.provider.getSigner(bridgeMinter)
      ).bridgeMint(oldAssetId, 5, 3, owner, true, 123, uris[0]);
      const args1 = await expectEventWithArgs(Asset, tnx1, "TransferSingle");
      const tokenId1 = await args1.args.id;
      expect(tokenId).to.be.equal(tokenId1);
      expect(await Asset.balanceOf(owner, tokenId)).to.be.equal(10);
      expect(await Asset.balanceOf(owner, tokenId1)).to.be.equal(10);
    });

    it("only bridge minter can bridge mint", async () => {
      const { Asset, owner, bridgeMinterRole, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, false);
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).bridgeMint(
          oldAssetId,
          10,
          3,
          owner,
          false,
          123,
          uris[0]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${bridgeMinterRole}`
      );
    });

    it("Should not bridge mint a NFT with supply 0", async () => {
      const { Asset, owner, bridgeMinter, uris } = await runAssetSetup();
      const oldAssetId = generateOldAssetId(owner, 1, false);
      await expect(
        Asset.connect(await ethers.provider.getSigner(bridgeMinter)).bridgeMint(
          oldAssetId,
          0,
          3,
          owner,
          true,
          123,
          uris[0]
        )
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Burn Assets", () => {
    it("minter should burnFrom asset of any owner", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);

      await AssetContract.burnFrom(owner, tokenId, 2);

      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(8);
    });

    it("Only minter should burn asset of any owner", async () => {
      const { AssetContract, owner, Asset, secondOwner, minterRole, uris } =
        await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(10);

      await expect(
        Asset.connect(await ethers.provider.getSigner(secondOwner)).burnFrom(
          owner,
          tokenId,
          2
        )
      ).to.be.rejectedWith(
        `AccessControl: account ${secondOwner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it("owner can burn an asset", async () => {
      const { AssetContract, owner, Asset, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      expect(await AssetContract.balanceOf(owner, tokenId1)).to.be.equal(10);

      await Asset.connect(await ethers.provider.getSigner(owner)).burn(
        owner,
        tokenId1,
        10
      );

      expect(await AssetContract.balanceOf(owner, tokenId1)).to.be.equal(0);
    });

    it("owner can batch burn assets", async () => {
      const { AssetContract, owner, Asset, uris } = await runAssetSetup();
      let assetDataArr = [];
      let assetUris = [];
      for (let i = 0; i < 2; i++) {
        assetDataArr.push(getAssetData(owner, 10, 3, i + 1, false, false, 0));
        assetUris.push(uris[i]);
      }
      const tnx = await AssetContract.mintBatch(assetDataArr, assetUris);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferBatch"
      );
      const tokenIds = args.args.ids;

      expect(await AssetContract.balanceOf(owner, tokenIds[0])).to.be.equal(10);

      expect(await AssetContract.balanceOf(owner, tokenIds[1])).to.be.equal(10);

      await Asset.connect(await ethers.provider.getSigner(owner)).burnBatch(
        owner,
        [tokenIds[0], tokenIds[1]],
        [10, 10]
      );

      expect(await AssetContract.balanceOf(owner, tokenIds[0])).to.be.equal(0);

      expect(await AssetContract.balanceOf(owner, tokenIds[1])).to.be.equal(0);
    });
  });

  describe("Recycle mint and Extraction", () => {
    for (let i = 0; i < catalystArray.length; i++) {
      it(`Should extract a ${catalystArray[i]} via burning ${[
        catalystBurnAmount[i],
      ]} amount of asset`, async () => {
        const { AssetContract, owner, uris } = await runAssetSetup();
        const assetData = getAssetData(
          owner,
          catalystBurnAmount[i],
          catalystArray[i],
          1,
          false,
          false,
          0
        );
        const tnx = await AssetContract.mint(assetData, uris[1]);
        const args = await expectEventWithArgs(
          AssetContract,
          tnx,
          "TransferSingle"
        );
        const tokenId = args.args.id;
        expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(
          catalystBurnAmount[i]
        );
        const tnx1 = await AssetContract.recycleBurn(
          owner,
          [tokenId],
          [catalystBurnAmount[i]],
          catalystArray[i]
        );

        const args1 = await expectEventWithArgs(
          AssetContract,
          tnx1,
          "AssetsRecycled"
        );
        const numCatalystExtracted = await args1.args.catalystAmount;
        expect(numCatalystExtracted).to.be.equal(1);
      });
    }

    it("only minter can recycle mint", async () => {
      const { AssetContract, owner, Asset, minterRole, uris } =
        await runAssetSetup();
      const assetData = getAssetData(owner, 2, 1, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(2);
      await expect(
        Asset.connect(await ethers.provider.getSigner(owner)).recycleBurn(
          owner,
          [tokenId],
          [2],
          1
        )
      ).to.be.revertedWith(
        `AccessControl: account ${owner.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it("only catalyst with non zero recycle amount can be recycle burn", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      await AssetContract.setRecyclingAmount(1, 0);
      const assetData = getAssetData(owner, 2, 1, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(2);
      await expect(
        AssetContract.recycleBurn(owner, [tokenId], [2], 1)
      ).to.be.revertedWith("Catalyst tier is not eligible for recycling");
    });

    it("should revert if asset doesn't have the same tier as catalyst to be extracted", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      await AssetContract.setRecyclingAmount(1, 0);
      const assetData = getAssetData(owner, 2, 1, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId = args.args.id;
      expect(await AssetContract.balanceOf(owner, tokenId)).to.be.equal(2);
      await expect(
        AssetContract.recycleBurn(owner, [tokenId], [2], 2)
      ).to.be.revertedWith("Catalyst id does not match");
    });

    for (let i = 0; i < catalystArray.length; i++) {
      it(`Should extract a ${catalystArray[i]} via burning ${[
        catalystBurnAmount[i],
      ]} amount of different asset`, async () => {
        const { AssetContract, owner, uris } = await runAssetSetup();
        const assetData = getAssetData(
          owner,
          catalystBurnAmount[i] / 2,
          catalystArray[i],
          1,
          false,
          false,
          0
        );
        const tnx1 = await AssetContract.mint(assetData, uris[0]);
        const args1 = await expectEventWithArgs(
          AssetContract,
          tnx1,
          "TransferSingle"
        );
        const tokenId1 = args1.args.id;

        const assetData2 = getAssetData(
          owner,
          catalystBurnAmount[i] / 2,
          catalystArray[i],
          2,
          false,
          false,
          0
        );
        const tnx2 = await AssetContract.mint(assetData2, uris[1]);
        const args2 = await expectEventWithArgs(
          AssetContract,
          tnx2,
          "TransferSingle"
        );
        const tokenId2 = args2.args.id;
        expect(await AssetContract.balanceOf(owner, tokenId1)).to.be.equal(
          catalystBurnAmount[i] / 2
        );
        expect(await AssetContract.balanceOf(owner, tokenId2)).to.be.equal(
          catalystBurnAmount[i] / 2
        );

        expect(tokenId1).to.be.not.equal(tokenId2);
        const tnx3 = await AssetContract.recycleBurn(
          owner,
          [tokenId1, tokenId2],
          [catalystBurnAmount[i] / 2, catalystBurnAmount[i] / 2],
          catalystArray[i]
        );

        const args3 = await expectEventWithArgs(
          AssetContract,
          tnx3,
          "AssetsRecycled"
        );
        const numCatalystExtracted = await args3.args.catalystAmount;
        expect(numCatalystExtracted).to.be.equal(1);
      });
    }

    for (let i = 0; i < catalystArray.length; i++) {
      it(`Should have recycling amount ${[catalystBurnAmount[i]]} for tier ${
        catalystArray[i]
      } catalyst`, async () => {
        const { AssetContract } = await runAssetSetup();
        const recycleAmount = await AssetContract.getRecyclingAmount(
          catalystArray[i]
        );
        expect(recycleAmount).to.be.equals(catalystBurnAmount[i]);
      });
    }

    it.skip("can get creator address from tokenId", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      const creator = await AssetContract.extractCreatorFromId(tokenId1);

      expect(creator).to.be.equals(owner);
    });

    it.skip("can get tier from tokenId", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      const tier = await AssetContract.extractTierFromId(tokenId1);

      expect(tier).to.be.equals(3);
    });

    it.skip("can get revealed from tokenId", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      const isRevealed = await AssetContract.extractIsRevealedFromId(tokenId1);

      expect(isRevealed).to.be.equals(false);
    });

    it.skip("can get creator nonce from tokenId", async () => {
      const { AssetContract, owner, uris } = await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      const nonce = await AssetContract.extractCreatorNonceFromId(tokenId1);

      expect(nonce).to.be.equals(1);
    });
  });

  describe("Token transfer", () => {
    it("owner can transfer an asset", async () => {
      const { AssetContract, owner, Asset, secondOwner, uris } =
        await runAssetSetup();
      const assetData = getAssetData(owner, 10, 3, 1, false, false, 0);
      const tnx = await AssetContract.mint(assetData, uris[0]);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferSingle"
      );
      const tokenId1 = args.args.id;

      expect(await AssetContract.balanceOf(owner, tokenId1)).to.be.equal(10);

      await Asset.connect(
        await ethers.provider.getSigner(owner)
      ).safeTransferFrom(owner, secondOwner, tokenId1, 10, "0x");

      expect(await AssetContract.balanceOf(secondOwner, tokenId1)).to.be.equal(
        10
      );
    });

    it("owner can batch transfer assets", async () => {
      const { AssetContract, owner, Asset, secondOwner, uris } =
        await runAssetSetup();
      let assetDataArr = [];
      let assetUris = [];
      for (let i = 0; i < 2; i++) {
        assetDataArr.push(getAssetData(owner, 10, 3, i + 1, false, false, 0));
        assetUris.push(uris[i]);
      }
      const tnx = await AssetContract.mintBatch(assetDataArr, assetUris);
      const args = await expectEventWithArgs(
        AssetContract,
        tnx,
        "TransferBatch"
      );
      const tokenIds = args.args.ids;

      expect(await AssetContract.balanceOf(owner, tokenIds[0])).to.be.equal(10);

      expect(await AssetContract.balanceOf(owner, tokenIds[1])).to.be.equal(10);

      await Asset.connect(
        await ethers.provider.getSigner(owner)
      ).safeBatchTransferFrom(
        owner,
        secondOwner,
        [tokenIds[0], tokenIds[1]],
        [10, 10],
        "0x"
      );

      expect(
        await AssetContract.balanceOf(secondOwner, tokenIds[0])
      ).to.be.equal(10);

      expect(
        await AssetContract.balanceOf(secondOwner, tokenIds[1])
      ).to.be.equal(10);
    });
  });
});

describe("OperatorFilterer", function () {
  it("should be registered", async function () {
    const { operatorFilterRegistry, Asset } = await setupOperatorFilter();
    expect(
      await operatorFilterRegistry.isRegistered(Asset.address)
    ).to.be.equal(true);
  });

  it("should be subscribed to common subscription", async function () {
    const { operatorFilterRegistry, Asset, filterOperatorSubscription } =
      await setupOperatorFilter();
    expect(
      await operatorFilterRegistry.subscriptionOf(Asset.address)
    ).to.be.equal(filterOperatorSubscription);
  });

  it("default subscription should blacklist Mock Market places 1, 2 and not 3, 4", async function () {
    const {
      operatorFilterRegistry,
      Asset,
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      DEFAULT_SUBSCRIPTION,
    } = await setupOperatorFilter();
    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        DEFAULT_SUBSCRIPTION,
        mockMarketPlace1.address
      )
    ).to.be.equal(true);
    const MockERC1155MarketPlace1CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        DEFAULT_SUBSCRIPTION,
        MockERC1155MarketPlace1CodeHash
      )
    ).to.be.equal(true);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        DEFAULT_SUBSCRIPTION,
        mockMarketPlace2.address
      )
    ).to.be.equal(true);

    const MockERC1155MarketPlace2CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        DEFAULT_SUBSCRIPTION,
        MockERC1155MarketPlace2CodeHash
      )
    ).to.be.equal(true);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        DEFAULT_SUBSCRIPTION,
        mockMarketPlace3.address
      )
    ).to.be.equal(false);

    const MockERC1155MarketPlace3CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        DEFAULT_SUBSCRIPTION,
        MockERC1155MarketPlace3CodeHash
      )
    ).to.be.equal(false);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        DEFAULT_SUBSCRIPTION,
        mockMarketPlace4.address
      )
    ).to.be.equal(false);

    const MockERC1155MarketPlace4CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        DEFAULT_SUBSCRIPTION,
        MockERC1155MarketPlace4CodeHash
      )
    ).to.be.equal(false);
  });

  it("common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription", async function () {
    const {
      operatorFilterRegistry,
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        filterOperatorSubscription,
        mockMarketPlace1.address
      )
    ).to.be.equal(true);
    const MockERC1155MarketPlace1CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        filterOperatorSubscription,
        MockERC1155MarketPlace1CodeHash
      )
    ).to.be.equal(true);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        filterOperatorSubscription,
        mockMarketPlace2.address
      )
    ).to.be.equal(true);

    const MockERC1155MarketPlace2CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        filterOperatorSubscription,
        MockERC1155MarketPlace2CodeHash
      )
    ).to.be.equal(true);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        filterOperatorSubscription,
        mockMarketPlace3.address
      )
    ).to.be.equal(false);

    const MockERC1155MarketPlace3CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        filterOperatorSubscription,
        MockERC1155MarketPlace3CodeHash
      )
    ).to.be.equal(false);

    expect(
      await operatorFilterRegistry.isOperatorFiltered(
        filterOperatorSubscription,
        mockMarketPlace4.address
      )
    ).to.be.equal(false);

    const MockERC1155MarketPlace4CodeHash =
      await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
    expect(
      await operatorFilterRegistry.isCodeHashFiltered(
        filterOperatorSubscription,
        MockERC1155MarketPlace4CodeHash
      )
    ).to.be.equal(false);
  });

  it("should be able to safe transfer asset if from is the owner of token", async function () {
    const { Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

    await users[0].Asset.safeTransferFrom(
      users[0].address,
      users[1].address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
  });

  it("should be able to safe batch transfer asset if from is the owner of token", async function () {
    const { Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

    await users[0].Asset.safeBatchTransferFrom(
      users[0].address,
      users[1].address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
    expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
  });

  it("should be able to safe transfer asset if from is the owner of asset and to is a blacklisted marketplace", async function () {
    const { mockMarketPlace1, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

    await users[0].Asset.safeTransferFrom(
      users[0].address,
      mockMarketPlace1.address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(1);
  });

  it("should be able to safe batch transfer assets if from is the owner of assets and to is a blacklisted marketplace", async function () {
    const { mockMarketPlace1, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

    await users[0].Asset.safeBatchTransferFrom(
      users[0].address,
      mockMarketPlace1.address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(1);
    expect(await Asset.balanceOf(mockMarketPlace1.address, 2)).to.be.equal(1);
  });

  it("it should not setApprovalForAll blacklisted market places", async function () {
    const { mockMarketPlace1, users } = await setupOperatorFilter();
    await expect(
      users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
    ).to.be.reverted;
  });

  it("it should setApprovalForAll non blacklisted market places", async function () {
    const { mockMarketPlace3, Asset, users } = await setupOperatorFilter();
    users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);
    expect(
      await Asset.isApprovedForAll(users[0].address, mockMarketPlace3.address)
    ).to.be.equal(true);
  });

  it("it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ", async function () {
    const {
      mockMarketPlace3,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
      Asset,
      users,
    } = await setupOperatorFilter();
    await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

    expect(
      await Asset.isApprovedForAll(users[0].address, mockMarketPlace3.address)
    ).to.be.equal(true);

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace3.address,
      true
    );

    await expect(
      users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
    ).to.be.revertedWithCustomError;
  });

  it("it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ", async function () {
    const {
      mockMarketPlace3,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
      Asset,
      users,
    } = await setupOperatorFilter();

    const mockMarketPlace3CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace3.address
      );

    await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

    expect(
      await Asset.isApprovedForAll(users[0].address, mockMarketPlace3.address)
    ).to.be.equal(true);

    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace3CodeHash,
      true
    );

    await expect(
      users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
    ).to.be.revertedWith;
  });

  it("it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ", async function () {
    const {
      mockMarketPlace1,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
      Asset,
      users,
    } = await setupOperatorFilter();

    const mockMarketPlace1CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace1.address
      );

    await expect(
      users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
    ).to.be.revertedWithCustomError;

    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace1CodeHash,
      false
    );

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace1.address,
      false
    );

    await users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true);

    expect(
      await Asset.isApprovedForAll(users[0].address, mockMarketPlace1.address)
    ).to.be.equal(true);
  });

  it("it should not be able to transfer through blacklisted market places", async function () {
    const { mockMarketPlace1, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace1.address,
      true
    );
    await expect(
      mockMarketPlace1.transferTokenForERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        1,
        1,
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should not be able to transfer through market places after they are blacklisted", async function () {
    const {
      mockMarketPlace3,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );

    await mockMarketPlace3.transferTokenForERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace3.address,
      true
    );

    await expect(
      mockMarketPlace3.transferTokenForERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        1,
        1,
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should be able to transfer through non blacklisted market places", async function () {
    const { mockMarketPlace3, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );
    await mockMarketPlace3.transferTokenForERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
  });

  it("it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted", async function () {
    const {
      mockMarketPlace3,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );
    await mockMarketPlace3.transferTokenForERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

    const mockMarketPlace3CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace3.address
      );
    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace3CodeHash,
      true
    );

    await expect(
      mockMarketPlace3.transferTokenForERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        1,
        1,
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should be able to transfer through blacklisted market places after they are removed from blacklist", async function () {
    const {
      mockMarketPlace1,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    const mockMarketPlace1CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace1.address
      );
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace1.address,
      true
    );

    await expect(
      mockMarketPlace1.transferTokenForERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        1,
        1,
        "0x"
      )
    ).to.be.revertedWithCustomError;

    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace1CodeHash,
      false
    );

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace1.address,
      false
    );
    await mockMarketPlace1.transferTokenForERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      1,
      1,
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
  });

  it("it should not be able to batch transfer through blacklisted market places", async function () {
    const { mockMarketPlace1, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace1.address,
      true
    );
    await expect(
      mockMarketPlace1.batchTransferTokenERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should not be able to batch transfer through market places after they are blacklisted", async function () {
    const {
      mockMarketPlace3,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );

    await mockMarketPlace3.batchTransferTokenERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

    expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace3.address,
      true
    );

    await expect(
      mockMarketPlace3.batchTransferTokenERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should be able to batch transfer through non blacklisted market places", async function () {
    const { mockMarketPlace3, Asset, users } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );
    await mockMarketPlace3.batchTransferTokenERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
    expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
  });

  it("it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted", async function () {
    const {
      mockMarketPlace3,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace3.address,
      true
    );
    await mockMarketPlace3.batchTransferTokenERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
    expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

    const mockMarketPlace3CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace3.address
      );
    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace3CodeHash,
      true
    );

    await expect(
      mockMarketPlace3.batchTransferTokenERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        "0x"
      )
    ).to.be.revertedWithCustomError;
  });

  it("it should be able to batch transfer through blacklisted market places after they are removed from blacklist", async function () {
    const {
      mockMarketPlace1,
      Asset,
      users,
      operatorFilterRegistryAsSubscription,
      filterOperatorSubscription,
    } = await setupOperatorFilter();
    const mockMarketPlace1CodeHash =
      await operatorFilterRegistryAsSubscription.codeHashOf(
        mockMarketPlace1.address
      );
    await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
    await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

    await users[0].Asset.setApprovalForAllWithoutFilter(
      mockMarketPlace1.address,
      true
    );

    await expect(
      mockMarketPlace1.batchTransferTokenERC1155(
        Asset.address,
        users[0].address,
        users[1].address,
        [1, 2],
        [1, 1],
        "0x"
      )
    ).to.be.revertedWithCustomError;

    await operatorFilterRegistryAsSubscription.updateCodeHash(
      filterOperatorSubscription,
      mockMarketPlace1CodeHash,
      false
    );

    await operatorFilterRegistryAsSubscription.updateOperator(
      filterOperatorSubscription,
      mockMarketPlace1.address,
      false
    );
    await mockMarketPlace1.batchTransferTokenERC1155(
      Asset.address,
      users[0].address,
      users[1].address,
      [1, 2],
      [1, 1],
      "0x"
    );

    expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
    expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
  });
});
