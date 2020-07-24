const {assert, expect} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {getGems, getValues} = require("../../lib/getGems.js");
const {findEvents} = require("../../lib/findEvents.js");
const {
  expectRevert,
  emptyBytes,
  waitFor,
  checERC20Balances,
  checERC1155Balances,
  toWei,
  mine,
  zeroAddress,
} = require("local-utils");
const {BigNumber} = require("ethers");
const {assertValidAttributes} = require("./_testHelper.js");

const nftConfig = {
  catalystConfig: [
    {minQuantity: 4000, maxQuantity: 20000, sandMintingFee: 0, sandUpdateFee: 0},
    {minQuantity: 1500, maxQuantity: 4000, sandMintingFee: 0, sandUpdateFee: 0},
    {minQuantity: 200, maxQuantity: 1500, sandMintingFee: 0, sandUpdateFee: 0},
    {minQuantity: 1, maxQuantity: 200, sandMintingFee: 0, sandUpdateFee: 0},
  ],
};

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const specialBurnAddressForSandFee = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

const CommonCatalyst = 0;
const RareCatalyst = 1;
const EpicCatalyst = 2;
const LegendaryCatalyst = 3;

const PowerGem = 0;
const DefenseGem = 1;
const SpeedGem = 2;
const MagicGem = 3;
const LuckGem = 4;

function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000");
}

describe("Catalyst:Minting", function () {
  it("creator mint Asset", async function () {
    const {creator, catalyst, catalystRegistry} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 201;
    const receipt = await waitFor(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        EpicCatalyst,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
    const {totalGems, maxGemsConfigured} = await getGems(receipt, catalyst, catalystRegistry);
    assert.isAtMost(totalGems, maxGemsConfigured, "more gems than allowed!");
  });

  it("creator without gems cannot mint Asset", async function () {
    const {creatorWithoutGems: creator} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 201;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        EpicCatalyst,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator without catalyst cannot mint Asset", async function () {
    const {creatorWithoutCatalyst: creator} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 201;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        EpicCatalyst,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator without sand cannot mint Asset", async function () {
    const {creatorWithoutSand: creator, user, catalystMinterContract} = await setupCatalystUsers();
    await waitFor(catalystMinterContract.setFeeCollector(user.address));
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 201;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        EpicCatalyst,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator mint Epic Asset", async function () {
    const {creator, asset, gem, catalyst, sand, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, PowerGem, PowerGem];
    const quantity = 201;

    const {tokenId, receipt} = await checERC1155Balances(
      creator.address,
      {PowerGem: [gem, PowerGem, -3], EpicCatalyst: [catalyst, EpicCatalyst, -1]},
      () => creator.mintAsset({catalyst: EpicCatalyst, gemIds, quantity})
    );

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(EpicCatalyst);
    const {totalGems, maxGemsConfigured} = await getGems(receipt, catalyst, catalystRegistry);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    // TODO await assertValidEvents({catalystRegistry, tokenId, gemIds, range: [51, 75]});
    assert.isAtMost(totalGems, maxGemsConfigured, "more gems than allowed!");
    assert.equal(balance, 201);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Legendary Asset", async function () {
    const {creator, asset, gem, catalyst, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, DefenseGem, LuckGem];
    const quantity = 3;

    const {tokenId, receipt} = await checERC1155Balances(
      creator.address,
      {
        PowerGem: [gem, PowerGem, -1],
        DefenseGem: [gem, DefenseGem, -1],
        LuckGem: [gem, LuckGem, -1],
        LegendaryCatalyst: [catalyst, LegendaryCatalyst, -1],
      },
      () => creator.mintAsset({catalyst: LegendaryCatalyst, gemIds, quantity})
    );
    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(LegendaryCatalyst);

    const {totalGems, maxGemsConfigured} = await getGems(receipt, catalyst, catalystRegistry);
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.isAtMost(totalGems, maxGemsConfigured, "more gems than allowed!");
    assert.equal(balance, quantity);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Legendary Asset And extract", async function () {
    const {creator, asset, catalyst, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, DefenseGem, LuckGem];
    const quantity = 3;

    const {tokenId: originalTokenId, receipt: mintReceipt} = await creator.mintAsset({
      catalyst: LegendaryCatalyst,
      gemIds,
      quantity,
    });
    const receipt = await waitFor(creator.Asset.extractERC721(originalTokenId, creator.address));
    const {totalGems, maxGemsConfigured} = await getGems(mintReceipt, catalyst, catalystRegistry);
    const transferEvents = await findEvents(asset, "Transfer", receipt.blockHash);
    const tokenId = transferEvents[0].args[2];

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(LegendaryCatalyst);

    assert.isAtMost(totalGems, maxGemsConfigured, "more gems than allowed!");
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds, range: [76, 100]});

    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Rare Asset And Upgrade to Legendary", async function () {
    const {creator, asset, catalyst, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, DefenseGem];
    const quantity = 1500;
    const {tokenId: originalTokenId, receipt: mintReceipt} = await creator.mintAsset({
      catalyst: RareCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [DefenseGem, SpeedGem, MagicGem];
    const {tokenId, receipt: postExtractionReceipt} = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: LegendaryCatalyst,
      gemIds,
    });
    const {totalGems: originalTotalGems, maxGemsConfigured: originalMaxGems} = await getGems(
      mintReceipt,
      catalyst,
      catalystRegistry
    );
    const {totalGems: newTotalGems, maxGemsConfigured: newMaxGems} = await getGems(
      postExtractionReceipt,
      catalyst,
      catalystRegistry
    );
    const catalystAppliedEvent = await findEvents(catalystRegistry, "CatalystApplied", postExtractionReceipt.blockHash);
    const eventGemIds = catalystAppliedEvent[0].args[3];
    const originalCatalystData = await catalystRegistry.getCatalyst(originalTokenId);

    expect(originalCatalystData[0]).to.equal(true);
    expect(originalCatalystData[1]).to.equal(RareCatalyst);

    const catalystData = await catalystRegistry.getCatalyst(tokenId);

    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(LegendaryCatalyst);

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
    assert.equal(originalMaxGems, 2);
    assert.equal(originalTotalGems, 2);
    assert.equal(newMaxGems, 4);
    assert.equal(newTotalGems, 3);
    assert.isAtMost(originalTotalGems, originalMaxGems, "more gems than allowed!");
    assert.isAtMost(newTotalGems, newMaxGems, "more gems than allowed!");
    assert.equal(gemIds.length, eventGemIds.length);
  });

  it("creator mint Epic Asset And Downgrade to Rare", async function () {
    const {creator, asset, catalyst, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, DefenseGem, DefenseGem];
    const quantity = 202;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [LuckGem, LuckGem];
    const {tokenId, receipt: postExtractionReceipt} = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: RareCatalyst,
      gemIds,
    });

    const {totalGems: newTotalGems, maxGemsConfigured: newMaxGems} = await getGems(
      postExtractionReceipt,
      catalyst,
      catalystRegistry
    );

    expect(newTotalGems).to.equal(2);
    expect(newMaxGems).to.equal(2);
    assert.isAtMost(newTotalGems, newMaxGems);

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(RareCatalyst);

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [26, 50]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("extracted asset share same catalyst", async function () {
    const {creator, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [MagicGem, SpeedGem, MagicGem];
    const quantity = 202;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const {tokenId} = await creator.extractAsset(originalTokenId);

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(EpicCatalyst);

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Epic Asset And new owner add gems", async function () {
    const {creator, user, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 202;
    const {tokenId: originalTokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });
    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash))[0];
    const seed = catalystAppliedEvent.args.seed;

    const newGemIds = [4];
    const {tokenId, receipt} = await user.extractAndAddGems(originalTokenId, {newGemIds});

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(EpicCatalyst);

    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];

    const mintedGems = catalystAppliedEvent.args.gemIds.length;
    const addedGems = gemsAddedEvent.args.gemIds.length;
    const totalGems = mintedGems + addedGems;

    expect(totalGems).to.equal(3);
    expect(gemsAddedEvent.args.gemIds[0]).to.equal(newGemIds[0]);
    expect(gemsAddedEvent.args.assetId).to.equal(tokenId);
    expect(gemsAddedEvent.args.startIndex).to.equal(2);
    expect(gemsAddedEvent.args.seed).to.equal(seed);
    expect(gemsAddedEvent.args.blockNumber).to.equal(receipt.blockNumber + 1);

    const originalBalance = await asset["balanceOf(address,uint256)"](user.address, originalTokenId);
    expect(originalBalance).to.equal(quantity - 1);

    const balance = await asset["balanceOf(address,uint256)"](user.address, tokenId);
    expect(balance).to.equal(1);

    const rarity = await asset.rarity(tokenId);
    expect(rarity).to.equal(0); // rarity is no more in use
  });

  it("creator mint multiple Asset", async function () {
    const {creator, catalyst} = await setupCatalystUsers();
    const packId = 0;
    await waitFor(
      creator.CatalystMinter.mintMultiple(
        creator.address,
        packId,
        dummyHash,
        [0, 3, 1, 3, 2],
        [0, 1, 1, 1],
        [
          {
            gemIds: [1, 2, 3],
            quantity: 201,
            catalystId: EpicCatalyst,
          },
          {
            gemIds: [4, 3],
            quantity: 1500,
            catalystId: RareCatalyst,
          },
          {
            gemIds: [4, 3, 1, 1],
            quantity: 2,
            catalystId: LegendaryCatalyst,
          },
        ],
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator mint many Asset", async function () {
    const {creator, catalyst} = await setupCatalystUsers();
    const packId = 0;
    const assets = [];
    const gemsQuantities = [0, 0, 0, 0, 0];
    const catalystsQuantities = [0, 0, 0, 0];
    for (let i = 0; i < 16; i++) {
      const gemIds = [i % 5];
      assets.push({
        gemIds,
        quantity: 4000 + i,
        catalystId: CommonCatalyst,
      });
      gemsQuantities[gemIds[0]]++;
      catalystsQuantities[0]++;
    }
    for (let i = 0; i < 11; i++) {
      const gemIds = [(i + 1) % 5, (i + 3) % 5];
      assets.push({
        gemIds,
        quantity: 1500 + i,
        catalystId: RareCatalyst,
      });
      gemsQuantities[gemIds[0]]++;
      gemsQuantities[gemIds[1]]++;
      catalystsQuantities[1]++;
    }
    for (let i = 0; i < 5; i++) {
      const gemIds = [(i + 1) % 5, (i + 3) % 5, (i + 2) % 5];
      assets.push({
        gemIds,
        quantity: 200 + i,
        catalystId: EpicCatalyst,
      });
      gemsQuantities[gemIds[0]]++;
      gemsQuantities[gemIds[1]]++;
      gemsQuantities[gemIds[2]]++;
      catalystsQuantities[2]++;
    }
    const receipt = await waitFor(
      creator.CatalystMinter.mintMultiple(
        creator.address,
        packId,
        dummyHash,
        gemsQuantities,
        catalystsQuantities,
        assets,
        creator.address,
        emptyBytes
      )
    );
    console.log("Gas used: ", receipt.gasUsed.toNumber());
  });

  it("creator mint Legendary Asset with 3 gems and get correct values", async function () {
    const {creator, asset, sand, gem, catalyst, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, DefenseGem, LuckGem];
    const quantity = 3;
    const {tokenId, receipt} = await creator.mintAsset({catalyst: LegendaryCatalyst, gemIds, quantity});
    await mine(); // future block need to be mined to get the value
    const values = await getValues({assetId: tokenId, fromBlockHash: receipt.blockHash, catalystRegistry});
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.be.within(1, 25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Legendary Asset with 2 identitcal gems + other and get correct values", async function () {
    const {creator, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [SpeedGem, LuckGem, SpeedGem];
    const quantity = 3;
    const {tokenId, receipt} = await creator.mintAsset({catalyst: LegendaryCatalyst, gemIds, quantity});
    await mine(); // future block need to be mined to get the value
    const values = await getValues({assetId: tokenId, fromBlockHash: receipt.blockHash, catalystRegistry});
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.equal(25);
    expect(values[1]).to.be.within(1, 25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Epic Asset And Downgrade to Rare: get correct values", async function () {
    const {creator, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, DefenseGem, DefenseGem];
    const quantity = 202;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [LuckGem, LuckGem];
    const {tokenId, receipt: postExtractionReceipt} = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: RareCatalyst,
      gemIds,
    });
    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      fromBlockHash: postExtractionReceipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(2);
    expect(values[0]).to.equal(25);
    expect(values[1]).to.be.within(1, 25);
  });
  it("creator mint Epic Asset And new owner add gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 202;
    const {tokenId: originalTokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });
    const newGemIds = [SpeedGem];
    const {tokenId, receipt} = await user.extractAndAddGems(originalTokenId, {newGemIds});

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash))[0];
    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];
    expect(gemsAddedEvent.args.seed).to.equal(catalystAppliedEvent.args.seed);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      originalTokenId,
      fromBlockHash: originalReceipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.equal(25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Epic Asset And new owner set Legendary catalyst with gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 202;
    const {tokenId: originalTokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const originalCatalystAppliedEvent = (
      await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash)
    )[0];
    expect(originalCatalystAppliedEvent.args.seed).to.equal(originalTokenId);

    const {tokenId, receipt} = await user.extractAndChangeCatalyst(originalTokenId, {
      catalyst: LegendaryCatalyst,
      gemIds: [PowerGem, LuckGem, LuckGem],
    });

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", receipt.blockHash))[0];
    expect(catalystAppliedEvent.args.seed).to.equal(tokenId);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      originalTokenId,
      fromBlockHash: receipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.equal(25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Legendart NFT Asset And new owner set Legendary catalyst with new gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers(nftConfig);
    const originalGemIds = [PowerGem, SpeedGem, SpeedGem, LuckGem];
    const quantity = 1;
    const {tokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: LegendaryCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const originalCatalystAppliedEvent = (
      await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash)
    )[0];
    expect(originalCatalystAppliedEvent.args.seed).to.equal(tokenId);

    const {receipt} = await user.changeCatalyst(tokenId, {
      catalyst: LegendaryCatalyst,
      gemIds: [PowerGem, MagicGem, LuckGem, LuckGem],
    });

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", receipt.blockHash))[0];
    expect(catalystAppliedEvent.args.seed).to.equal(tokenId);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      tokenId,
      fromBlockHash: receipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(4);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.be.within(1, 25);
    expect(values[2]).to.equal(25);
    expect(values[3]).to.be.within(1, 25);
  });

  it("creator mint Legendart NFT Asset and new owner add new gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers(nftConfig);
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 1;
    const {tokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: LegendaryCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const originalCatalystAppliedEvent = (
      await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash)
    )[0];
    expect(originalCatalystAppliedEvent.args.seed).to.equal(tokenId);

    const newGemIds = [SpeedGem];
    const {receipt} = await user.addGems(tokenId, {newGemIds});

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", originalReceipt.blockHash))[0];
    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];
    expect(gemsAddedEvent.args.seed).to.equal(catalystAppliedEvent.args.seed);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      tokenId,
      fromBlockHash: originalReceipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.equal(25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Epic Asset And new owner set Legendary catalyst and add gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 202;
    const {tokenId: originalTokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const {tokenId, receipt: catalystReceipt} = await user.extractAndChangeCatalyst(originalTokenId, {
      catalyst: LegendaryCatalyst,
      gemIds: [PowerGem, LuckGem, SpeedGem],
    });

    const newGemIds = [SpeedGem];
    const {receipt} = await user.addGems(tokenId, {newGemIds});

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", catalystReceipt.blockHash))[0];
    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];
    expect(gemsAddedEvent.args.seed).to.equal(catalystAppliedEvent.args.seed);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      originalTokenId,
      fromBlockHash: originalReceipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.equal(25);
    expect(values[2]).to.be.within(1, 25);
  });

  it("creator mint Epic Asset And new owner set Common then Legendary catalyst and add gems: get correct values", async function () {
    const {creator, user, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 202;
    const {tokenId: originalTokenId, receipt: originalReceipt} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const {tokenId} = await user.extractAndChangeCatalyst(originalTokenId, {
      catalyst: CommonCatalyst,
      gemIds: [PowerGem],
    });

    const {receipt: catalystReceipt} = await user.changeCatalyst(tokenId, {
      catalyst: LegendaryCatalyst,
      gemIds: [PowerGem, LuckGem, SpeedGem],
    });

    const newGemIds = [SpeedGem];
    const {receipt} = await user.addGems(tokenId, {newGemIds});

    const catalystAppliedEvent = (await findEvents(catalystRegistry, "CatalystApplied", catalystReceipt.blockHash))[0];
    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];
    expect(gemsAddedEvent.args.seed).to.equal(catalystAppliedEvent.args.seed);

    await mine(); // future block need to be mined to get the value
    const values = await getValues({
      assetId: tokenId,
      originalTokenId,
      fromBlockHash: originalReceipt.blockHash,
      catalystRegistry,
    });
    expect(values).to.have.lengthOf(3);
    expect(values[0]).to.be.within(1, 25);
    expect(values[1]).to.equal(25);
    expect(values[2]).to.be.within(1, 25);
  });

  describe("fees", function () {
    it("setting the fee collector emits a FeeCollector event", async function () {
      const {users, catalystMinterContract} = await setupCatalystUsers();
      const receipt = await waitFor(catalystMinterContract.setFeeCollector(users[0].address));
      const event = receipt.events[0];
      assert.equal(event.event, "FeeCollector");
      assert.equal(event.args[0], users[0].address);
    });

    it("fee collection results in a SAND Transfer event to zero address if fee collector is set to special burn address", async function () {
      const {sand, user, catalystMinterContract, creator} = await setupCatalystUsers();
      const newFeeCollectorReceipt = await waitFor(
        catalystMinterContract.setFeeCollector(specialBurnAddressForSandFee)
      );
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF");
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);
      const {receipt} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, zeroAddress);
      assert.ok(value.eq(BigNumber.from(totalExpectedFee)));
    });

    it("fee collection results in a SAND Transfer event to fee collector address", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);

      const {receipt} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);
      const newBalance = await sand.balanceOf(creatorWithoutSand.address);
      assert.ok(newBalance.eq(BigNumber.from(value)));
      assert.ok(value.eq(BigNumber.from(totalExpectedFee)));
    });

    it("transaction reverts if fee collector is set to special burn address and user does not have enough SAND", async function () {
      const {user, catalystMinterContract, creatorWithoutSand} = await setupCatalystUsers();
      await catalystMinterContract.setFeeCollector(specialBurnAddressForSandFee);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      await expectRevert(
        creatorWithoutSand.mintAsset({
          catalyst: EpicCatalyst,
          gemIds: originalGemIds,
          quantity,
          to: user.address,
        }),
        "Not enough funds"
      );
    });

    it("transaction reverts if fee collection is enabled but user does not have enough SAND", async function () {
      const {user, catalystMinterContract, creatorWithoutSand, creator} = await setupCatalystUsers();
      await catalystMinterContract.setFeeCollector(creator.address);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      await expectRevert(
        creatorWithoutSand.mintAsset({
          catalyst: EpicCatalyst,
          gemIds: originalGemIds,
          quantity,
          to: user.address,
        }),
        "not enough fund"
      );
    });

    it("transaction is successful and asset is minted if fee collection is enabled but fee collector is set to zeroAddress", async function () {
      const {user, catalystMinterContract, creator} = await setupCatalystUsers();
      await catalystMinterContract.setFeeCollector(zeroAddress);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;

      // if feeCollector is set to zeroAddress, then the applicable sandFee is not collected but the asset is still minted
      await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
    });

    it("fee is not collected and catalyst is not changed if not extracted first", async function () {
      const {user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;

      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(user.CatalystMinter.changeCatalyst(user.address, tokenId, LegendaryCatalyst, [], user.address)),
        "INVALID_NOT_NFT"
      );
    });

    it("fee is not taken and catalyst is not changed if from != sender", async function () {
      const {user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;

      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(user.CatalystMinter.changeCatalyst(creator.address, tokenId, LegendaryCatalyst, [], creator.address)),
        "NOT_SENDER"
      );
    });

    it("fee is not taken and catalyst is not extracted and changed if from != sender", async function () {
      const {user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;

      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(
          user.CatalystMinter.extractAndChangeCatalyst(creator.address, tokenId, LegendaryCatalyst, [], creator.address)
        ),
        "NOT_SENDER"
      );
    });

    it("the correct sandFee is collected when gems are added", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();

      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);

      // creator mint asset and give to user
      const originalGemIds = []; // can add up to 3 gems for Epic Catalyst
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);

      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });

      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);

      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      assert.ok(newBalanceAfterMint.eq(BigNumber.from(value)));
      assert.ok(value.eq(BigNumber.from(totalExpectedFee)));

      // user adds gems to the asset
      const gemAdditionFee = sandWei(1); // initially set up via CatalystMinter constructor (uint256 gemAdditionFee)
      const gemsToBeAdded = [LuckGem, MagicGem, SpeedGem];
      const gemsAdditionReceipt = await waitFor(
        user.CatalystMinter.extractAndAddGems(user.address, tokenId, gemsToBeAdded, user.address)
      );

      // check the fee collector has received the correct fee for adding the gems
      const changeEventsMatching = await findEvents(sand, "Transfer", gemsAdditionReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      assert.ok(changeEvent.args[2].eq(gemAdditionFee.mul(gemsToBeAdded.length)));

      // check fee collector's new balance has been increased by the catalystChangeSandFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      const totalGemFee = gemAdditionFee.mul(gemsToBeAdded.length);
      assert.ok(newBalanceAfterCatalystChange.eq(newBalanceAfterMint.add(totalGemFee)));
    });

    it("the correct sandFee is collected when a gem is added (via setGemAdditionFee function)", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();

      // admin sets new fee
      const newGemAdditionFeeReceipt = await waitFor(catalystMinterContract.setGemAdditionFee(toWei(4)));
      assert.ok(newGemAdditionFeeReceipt.events[0].event, "GemAdditionFee");
      assert.ok(newGemAdditionFeeReceipt.events[0].args[0].eq(toWei(4)));

      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);

      // creator mint asset and give to user
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);

      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });

      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);

      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      assert.ok(newBalanceAfterMint.eq(BigNumber.from(value)));
      assert.ok(value.eq(BigNumber.from(totalExpectedFee)));

      // user updates the gems in the asset
      const expectedGemAdditionFee = toWei(4);
      const gemsAddedReceipt = await waitFor(
        user.CatalystMinter.extractAndAddGems(user.address, tokenId, [MagicGem], user.address) // 1 more gem will fit in Epic Catalyst (MAX 3)
      );

      // check the fee collector has received the correct fee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", gemsAddedReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      assert.ok(changeEvent.args[2].eq(expectedGemAdditionFee));

      // check fee collector's new balance has been increased by the gemAdditionFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      assert.ok(newBalanceAfterCatalystChange.eq(newBalanceAfterMint.add(expectedGemAdditionFee)));
    });

    it("cannot set a new gemAdditionFee if not admin)", async function () {
      const {user} = await setupCatalystUsers();
      await expectRevert(waitFor(user.CatalystMinter.setGemAdditionFee(toWei(4))), "NOT_AUTHORIZED_ADMIN");
    });
  });

  describe("fee tests using new catalystConfig or gemAdditionFee", function () {
    it("the correct sandFee is collected when a catalyst is extracted and changed (catalyst change fee set via fixture)", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers({
        catalystConfig: [
          undefined,
          undefined,
          {minQuantity: 10, maxQuantity: 50, sandMintingFee: toWei(11), sandUpdateFee: toWei(12)}, // Epic
          {minQuantity: 1, maxQuantity: 1, sandMintingFee: toWei(500), sandUpdateFee: toWei(1000)}, // Legendary fake new data
        ],
      });
      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      // creator mint asset and give to user
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 30;
      const totalExpectedFee = toWei(quantity * 11);
      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);
      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterMint).to.equal(BigNumber.from(value));
      expect(value).to.equal(BigNumber.from(totalExpectedFee));
      // user updates the catalyst in the asset
      const sandUpdateFee = toWei(1000); // in catalystConfig
      const catalystChangeReceipt = await waitFor(
        user.CatalystMinter.extractAndChangeCatalyst(user.address, tokenId, LegendaryCatalyst, [], user.address) // empty gem array
      );
      // check the fee collector has received the correct fee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", catalystChangeReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      expect(changeEvent.args[2]).to.equal(sandUpdateFee);
      // check fee collector's new balance has been increased by the catalystChangeSandFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterCatalystChange).to.equal(newBalanceAfterMint.add(sandUpdateFee));
    });

    it("the transaction reverts if the user does not have enough SAND to pay the catalystChangeFee (catalyst change fee set via fixture)", async function () {
      const {creator, creatorWithoutSand, user, catalystMinterContract, sand} = await setupCatalystUsers({
        catalystConfig: [
          undefined,
          undefined,
          {minQuantity: 10, maxQuantity: 50, sandMintingFee: toWei(11), sandUpdateFee: toWei(300)},
          {minQuantity: 1, maxQuantity: 1, sandMintingFee: toWei(500), sandUpdateFee: toWei(1000)}, // Legendary fake new data
        ],
      });

      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(user.address)); // set a fee collector here so that SAND payment is required
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], user.address);

      // creator mint asset and give to creatorWithoutSand
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 30;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: creatorWithoutSand.address,
      });

      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterMint).to.equal(BigNumber.from(0));

      await expectRevert(
        waitFor(
          creatorWithoutSand.CatalystMinter.extractAndChangeCatalyst(
            creatorWithoutSand.address,
            tokenId,
            LegendaryCatalyst,
            [],
            creatorWithoutSand.address
          )
        ),
        "not enough fund"
      );
    });

    it("the correct sandFee is collected when 1 gem is added (via gemAdditionFee option in fixture)", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      // creator mint asset and give to user
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);
      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);
      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterMint).to.equal(BigNumber.from(value));
      expect(value).to.equal(BigNumber.from(totalExpectedFee));
      // user updates the gems in the asset
      const expectedGemAdditionFee = toWei(2);
      const gemsAddedReceipt = await waitFor(
        user.CatalystMinter.extractAndAddGems(user.address, tokenId, [MagicGem], user.address) // 1 more gem will fit in Epic Catalyst (MAX 3)
      );
      // check the fee collector has received the correct fee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", gemsAddedReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      expect(changeEvent.args[2]).to.equal(expectedGemAdditionFee);
      // check fee collector's new balance has been increased by the gemAdditionFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterCatalystChange).to.equal(newBalanceAfterMint.add(expectedGemAdditionFee));
    });

    it("the correct sandFee is collected when MAX gems are added (via gemAdditionFee option in fixture)", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      // creator mint asset and give to user
      const originalGemIds = [];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);
      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);
      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterMint).to.equal(BigNumber.from(value));
      expect(value).to.equal(BigNumber.from(totalExpectedFee));
      // user updates the gems in the asset
      const expectedGemAdditionFee = toWei(2).mul(3);
      const gemsAddedReceipt = await waitFor(
        user.CatalystMinter.extractAndAddGems(user.address, tokenId, [MagicGem, LuckGem, PowerGem], user.address) // 3 gems will fit in Epic Catalyst
      );
      // check the fee collector has received the correct fee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", gemsAddedReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      expect(changeEvent.args[2]).to.equal(expectedGemAdditionFee);
      // check fee collector's new balance has been increased by the gemAdditionFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterCatalystChange).to.equal(newBalanceAfterMint.add(expectedGemAdditionFee));
    });

    it("the correct sandFee is collected when 1 gem is added to an empty asset (via gemAdditionFee option in fixture)", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);
      // creator mint asset and give to user
      const originalGemIds = [];
      const quantity = 202;
      const totalExpectedFee = toWei(quantity * 10);
      const {receipt, tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      // ensure the SAND transfer event occurred
      const eventsMatching = await findEvents(sand, "Transfer", receipt.blockHash);
      const event = eventsMatching[0];
      const from = event.args[0];
      const to = event.args[1];
      const value = event.args[2];
      assert.equal(from, creator.address);
      assert.equal(to, creatorWithoutSand.address);
      // check fee collector has received the correct fee for the mint
      const newBalanceAfterMint = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterMint).to.equal(BigNumber.from(value));
      expect(value).to.equal(BigNumber.from(totalExpectedFee));
      // user updates the gems in the asset
      const expectedGemAdditionFee = toWei(2);
      const gemsAddedReceipt = await waitFor(
        user.CatalystMinter.extractAndAddGems(user.address, tokenId, [SpeedGem], user.address) // up to 3 gems will fit in Epic Catalyst
      );
      // check the fee collector has received the correct fee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", gemsAddedReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      expect(changeEvent.args[2]).to.equal(expectedGemAdditionFee);
      // check fee collector's new balance has been increased by the gemAdditionFee
      const newBalanceAfterCatalystChange = await sand.balanceOf(creatorWithoutSand.address);
      expect(newBalanceAfterCatalystChange).to.equal(newBalanceAfterMint.add(expectedGemAdditionFee));
    });

    it("the transaction reverts if user attempts to add several more gems than available sockets - SOCKETS FULL - (via gemAdditionFee option in fixture)", async function () {
      const {user, creator} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      const originalGemIds = [SpeedGem, SpeedGem, SpeedGem];
      const quantity = 202;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(
          user.CatalystMinter.extractAndAddGems(user.address, tokenId, [SpeedGem, SpeedGem], user.address) // up to 3 gems will fit in Epic Catalyst
        ),
        "INVALID_GEMS_TOO_MANY"
      );
    });

    it("the transaction reverts if user attempts to add one more gem than available sockets - SOCKETS FULL - (via gemAdditionFee option in fixture)", async function () {
      const {user, creator} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      const originalGemIds = [SpeedGem, SpeedGem, SpeedGem];
      const quantity = 202;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(
          user.CatalystMinter.extractAndAddGems(user.address, tokenId, [SpeedGem], user.address) // up to 3 gems will fit in Epic Catalyst
        ),
        "INVALID_GEMS_TOO_MANY"
      );
    });

    it("the transaction reverts if user attempts to add several more gems than available sockets - NOT FULL - (via gemAdditionFee option in fixture)", async function () {
      const {user, creator} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      const originalGemIds = [SpeedGem];
      const quantity = 202;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(
          user.CatalystMinter.extractAndAddGems(
            user.address,
            tokenId,
            [SpeedGem, SpeedGem, SpeedGem, SpeedGem],
            user.address
          ) // up to 3 gems will fit in Epic Catalyst
        ),
        "INVALID_GEMS_TOO_MANY"
      );
    });

    it("the transaction reverts if user attempts to add one more gem than available sockets - NOT FULL - (via gemAdditionFee option in fixture)", async function () {
      const {user, creator} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      const originalGemIds = [SpeedGem, SpeedGem];
      const quantity = 202;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: user.address,
      });
      await expectRevert(
        waitFor(
          user.CatalystMinter.extractAndAddGems(user.address, tokenId, [SpeedGem, SpeedGem], user.address) // up to 3 gems will fit in Epic Catalyst
        ),
        "INVALID_GEMS_TOO_MANY"
      );
    });

    it("the transaction reverts if user does not have enough SAND to pay the gemAdditionFee (set via fixture)", async function () {
      const {creator, creatorWithoutSand} = await setupCatalystUsers({
        gemAdditionFee: toWei(2),
      });
      const originalGemIds = [SpeedGem, SpeedGem];
      const quantity = 202;
      const {tokenId} = await creator.mintAsset({
        catalyst: EpicCatalyst,
        gemIds: originalGemIds,
        quantity,
        to: creatorWithoutSand.address,
      });
      await expectRevert(
        waitFor(
          creatorWithoutSand.CatalystMinter.extractAndAddGems(
            creatorWithoutSand.address,
            tokenId,
            [SpeedGem, SpeedGem],
            creatorWithoutSand.address
          ) // up to 3 gems will fit in Epic Catalyst
        ),
        "INVALID_GEMS_TOO_MANY"
      );
    });
  });
});
