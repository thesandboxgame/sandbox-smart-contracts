const {assert, expect} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {
  expectRevert,
  emptyBytes,
  waitFor,
  findEvents,
  checERC20Balances,
  checERC1155Balances,
  toWei,
  mine,
} = require("local-utils");
const {assertValidAttributes} = require("./_testHelper.js");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

const CommonCatalyst = 0;
const RareCatalyst = 1;
const EpicCatalyst = 2;
const LegendaryCatalyst = 3;

const PowerGem = 0;
const DefenseGem = 1;
const SpeedGem = 2;
const MagicGem = 3;
const LuckGem = 4;

describe("Catalyst:Minting", function () {
  it("creator mint Asset", async function () {
    const {creator} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await waitFor(
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

  it("creator without gems cannot mint Asset", async function () {
    const {creatorWithoutGems: creator} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
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
    const quantity = 11;
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
    const {creatorWithoutSand: creator} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
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
    const quantity = 11;
    const totalExpectedFee = toWei(11 * 10);

    // TODO check Sand fee
    const {tokenId} = await checERC1155Balances(
      creator.address,
      {PowerGem: [gem, PowerGem, -3], EpicCatalyst: [catalyst, EpicCatalyst, -1]},
      () => creator.mintAsset({catalyst: EpicCatalyst, gemIds, quantity})
    );
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    // TODO await assertValidEvents({catalystRegistry, tokenId, gemIds, range: [51, 75]});

    assert.equal(balance, 11);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Legendary Asset", async function () {
    const {creator, asset, sand, gem, catalyst, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, DefenseGem, LuckGem];
    const quantity = 3;
    const totalExpectedFee = toWei(3 * 200);

    // TODO check Sand fee
    const {tokenId} = await checERC1155Balances(
      creator.address,
      {
        PowerGem: [gem, PowerGem, -1],
        DefenseGem: [gem, DefenseGem, -1],
        LuckGem: [gem, LuckGem, -1],
        LegendaryCatalyst: [catalyst, LegendaryCatalyst, -1],
      },
      () => creator.mintAsset({catalyst: LegendaryCatalyst, gemIds, quantity})
    );
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.equal(balance, quantity);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Legendary Asset And extract", async function () {
    const {creator, asset, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [PowerGem, DefenseGem, LuckGem];
    const quantity = 3;

    const {tokenId: originalTokenId} = await creator.mintAsset({catalyst: LegendaryCatalyst, gemIds, quantity});
    const receipt = await waitFor(creator.Asset.extractERC721(originalTokenId, creator.address));
    const events = await findEvents(asset, "Transfer", receipt.blockHash);
    const tokenId = events[0].args[2];

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds, range: [76, 100]});

    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Rare Asset And Upgrade to Legendary", async function () {
    const {creator, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, DefenseGem];
    const quantity = 60;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: RareCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [DefenseGem, SpeedGem, MagicGem];
    const {tokenId} = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: LegendaryCatalyst,
      gemIds,
    });

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    // TODO await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Epic Asset And Downgrade to Rare", async function () {
    const {creator, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, DefenseGem, DefenseGem];
    const quantity = 30;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [LuckGem, LuckGem];
    const {tokenId} = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: RareCatalyst,
      gemIds,
    });

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
    const quantity = 30;
    const {tokenId: originalTokenId} = await creator.mintAsset({
      catalyst: EpicCatalyst,
      gemIds: originalGemIds,
      quantity,
    });

    const {tokenId} = await creator.extractAsset(originalTokenId);
    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    // TODO await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds: originalGemIds, range: [51, 75]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 0); // rarity is no more in use
  });

  it("creator mint Epic Asset And new onwer add gems", async function () {
    const {creator, user, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [PowerGem, SpeedGem];
    const quantity = 30;
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
    const originalBalance = await asset["balanceOf(address,uint256)"](user.address, originalTokenId);
    const balance = await asset["balanceOf(address,uint256)"](user.address, tokenId);
    const rarity = await asset.rarity(tokenId);

    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];

    expect(gemsAddedEvent.args.gemIds[0]).to.equal(newGemIds[0]);
    expect(gemsAddedEvent.args.assetId).to.equal(tokenId);
    expect(gemsAddedEvent.args.startIndex).to.equal(2);
    expect(gemsAddedEvent.args.seed).to.equal(seed);
    expect(gemsAddedEvent.args.blockNumber).to.equal(receipt.blockNumber + 1);
    expect(originalBalance).to.equal(quantity - 1);
    expect(balance).to.equal(1);
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
            quantity: 11,
            catalystId: EpicCatalyst,
          },
          {
            gemIds: [4, 3],
            quantity: 50,
            catalystId: RareCatalyst,
          },
          {
            gemIds: [4, 3, 1, 1],
            quantity: 1,
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
        quantity: 200 + i,
        catalystId: CommonCatalyst,
      });
      gemsQuantities[gemIds[0]]++;
      catalystsQuantities[0]++;
    }
    for (let i = 0; i < 11; i++) {
      const gemIds = [(i + 1) % 5, (i + 3) % 5];
      assets.push({
        gemIds,
        quantity: 60 + i,
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
        quantity: 10 + i,
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
    console.log(receipt.gasUsed.toNumber());
  });

  // TODO quantity = 1
  // TODO addGems post extraction
  // TODO set new catalyst post extraction
});
