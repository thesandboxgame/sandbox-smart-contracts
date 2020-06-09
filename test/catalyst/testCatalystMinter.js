const {assert} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {expectRevert, emptyBytes, waitFor, findEvents, checERC20Balances, toWei, mine} = require("local-utils");
const {assertValidAttributes} = require("./_testHelper.js");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

describe("Catalyst:Minting", function () {
  it("creator mint Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await waitFor(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        catalysts.Epic.address,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator without gems cannot mint Asset", async function () {
    const {creatorWithoutGems: creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        catalysts.Epic.address,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator without catalyst cannot mint Asset", async function () {
    const {creatorWithoutCatalyst: creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        catalysts.Epic.address,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator without sand cannot mint Asset", async function () {
    const {creatorWithoutSand: creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await expectRevert(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        catalysts.Epic.address,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator mint Epic Asset", async function () {
    const {creator, catalysts, asset, sand, gems, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [0, 0, 0];
    const quantity = 11;
    const totalExpectedFee = toWei(11 * 10);

    const tokenId = await checERC20Balances(
      creator.address,
      {Sand: [sand, "-" + totalExpectedFee], PowerGem: [gems.Power, -3], EpicCatalyst: [catalysts.Epic, -1]}, // TOOO SAND fee
      () => creator.mintAsset({catalyst: catalysts.Epic.address, gemIds, quantity})
    );
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [51, 75]});

    assert.equal(balance, 11);
    assert.equal(rarity, 2);
  });

  it("creator mint Legendary Asset", async function () {
    const {creator, catalysts, asset, sand, gems, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [0, 1, 4];
    const quantity = 3;
    const totalExpectedFee = toWei(3 * 200);

    const tokenId = await checERC20Balances(
      creator.address,
      {
        Sand: [sand, "-" + totalExpectedFee],
        PowerGem: [gems.Power, -1],
        DefenseGem: [gems.Defense, -1],
        LuckGem: [gems.Luck, -1],
        LegendaryCatalyst: [catalysts.Legendary, -1],
      },
      () => creator.mintAsset({catalyst: catalysts.Legendary.address, gemIds, quantity})
    );
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.equal(balance, quantity);
    assert.equal(rarity, 3);
  });

  it("creator mint Legendary Asset And extract", async function () {
    const {creator, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const gemIds = [0, 1, 4];
    const quantity = 3;

    const originalTokenId = await creator.mintAsset({catalyst: catalysts.Legendary.address, gemIds, quantity});
    const receipt = await waitFor(creator.Asset.extractERC721(originalTokenId, creator.address));
    const events = await findEvents(asset, "Transfer", receipt.blockHash);
    const tokenId = events[0].args[2];

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds, range: [76, 100]});

    assert.equal(balance, 1);
    assert.equal(rarity, 3);
  });

  it("creator mint Rare Asset And Upgrade to Legendary", async function () {
    const {creator, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [0, 1];
    const quantity = 60;
    const originalTokenId = await creator.mintAsset({
      catalyst: catalysts.Rare.address,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [1, 2, 3];
    const tokenId = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: catalysts.Legendary.address,
      gemIds,
    });

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [76, 100]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 1); // rarity does not change
  });

  it("creator mint Epic Asset And Downgrade to Rare", async function () {
    const {creator, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [0, 1, 1];
    const quantity = 30;
    const originalTokenId = await creator.mintAsset({
      catalyst: catalysts.Epic.address,
      gemIds: originalGemIds,
      quantity,
    });

    const gemIds = [4, 4];
    const tokenId = await creator.extractAndChangeCatalyst(originalTokenId, {
      catalyst: catalysts.Rare.address,
      gemIds,
    });

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, gemIds, range: [26, 50]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 2); // rarity does not change
  });

  it("extracted asset share same catalyst", async function () {
    const {creator, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [3, 2, 3];
    const quantity = 30;
    const originalTokenId = await creator.mintAsset({
      catalyst: catalysts.Epic.address,
      gemIds: originalGemIds,
      quantity,
    });

    const tokenId = await creator.extractAsset(originalTokenId);
    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds: originalGemIds, range: [51, 75]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 2); // rarity does not change
  });

  it("creator mint Epic Asset And new onwer add gems", async function () {
    const {creator, user, catalysts, asset, catalystRegistry} = await setupCatalystUsers();
    const originalGemIds = [0, 2];
    const quantity = 30;
    const originalTokenId = await creator.mintAsset({
      catalyst: catalysts.Epic.address,
      gemIds: originalGemIds,
      quantity,
      to: user.address,
    });

    const newGemIds = [4];
    const tokenId = await user.extractAndAddGems(originalTokenId, {newGemIds});
    const originalBalance = await asset["balanceOf(address,uint256)"](user.address, originalTokenId);
    const balance = await asset["balanceOf(address,uint256)"](user.address, tokenId);

    const gemIds = originalGemIds.concat(newGemIds);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value

    await assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds, range: [51, 75]});
    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    assert.equal(rarity, 2); // rarity does not change
  });

  it("creator mint multiple Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    await waitFor(
      creator.CatalystMinter.mintMultiple(
        creator.address,
        packId,
        dummyHash,
        [
          {
            gemIds: [1, 2, 3],
            quantity: 11,
            catalystToken: catalysts.Epic.address,
          },
          {
            gemIds: [4, 3],
            quantity: 50,
            catalystToken: catalysts.Rare.address,
          },
          {
            gemIds: [4, 3, 1, 1],
            quantity: 1,
            catalystToken: catalysts.Legendary.address,
          },
        ],
        creator.address,
        emptyBytes
      )
    );
  });

  it("creator mint many Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const assets = [];
    for (let i = 0; i < 16; i++) {
      assets.push({
        gemIds: [i % 5],
        quantity: 200 + i,
        catalystToken: catalysts.Common.address,
      });
    }
    for (let i = 0; i < 11; i++) {
      assets.push({
        gemIds: [(i + 1) % 5, (i + 3) % 5],
        quantity: 60 + i,
        catalystToken: catalysts.Rare.address,
      });
    }
    for (let i = 0; i < 5; i++) {
      assets.push({
        gemIds: [(i + 1) % 5, (i + 3) % 5, (i + 2) % 5],
        quantity: 10 + i,
        catalystToken: catalysts.Epic.address,
      });
    }
    await waitFor(
      creator.CatalystMinter.mintMultiple(creator.address, packId, dummyHash, assets, creator.address, emptyBytes)
    );
  });

  // TODO quantity = 1
  // TODO addGems post extraction
  // TODO set new catalyst post extraction
});
