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
    const tokenId = await creator.updateAsset(originalTokenId, {
      catalyst: catalysts.Legendary.address,
      gemIds,
      quantity,
    });

    const originalBalance = await asset["balanceOf(address,uint256)"](creator.address, originalTokenId);

    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);
    await mine(); // future block need to be mined to get the value
    await assertValidAttributes({catalystRegistry, tokenId, tokenId, gemIds, range: [76, 100]});

    assert.equal(originalBalance, quantity - 1);
    assert.equal(balance, 1);
    console.log({rarity, rarityBN: rarity.toNumber()});
    assert.equal(rarity, 3);
  });

  // TODO upgrade catalyst
  // add gems and test values from previous asset are still same in extracted one // + test post extraction too
});
