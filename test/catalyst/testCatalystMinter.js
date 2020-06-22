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
  zeroAddress,
} = require("local-utils");
const {BigNumber} = require("ethers");
const {assertValidAttributes} = require("./_testHelper.js");

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

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(EpicCatalyst);

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

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(LegendaryCatalyst);

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

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(LegendaryCatalyst);

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
    const quantity = 30;
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

    const catalystData = await catalystRegistry.getCatalyst(tokenId);
    expect(catalystData[0]).to.equal(true);
    expect(catalystData[1]).to.equal(EpicCatalyst);

    const gemsAddedEvent = (await findEvents(catalystRegistry, "GemsAdded", receipt.blockHash))[0];
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
    console.log("Gas used: ", receipt.gasUsed.toNumber());
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
      const quantity = 30;
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
      const quantity = 30;
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
      const quantity = 30;
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
      const quantity = 30;
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
      const quantity = 30;

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
      const quantity = 30;

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
      const quantity = 30;

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
      const quantity = 30;

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

    it("the correct sandFee is collected when a catalyst is extracted and changed", async function () {
      const {sand, user, catalystMinterContract, creator, creatorWithoutSand} = await setupCatalystUsers();

      // set fee collector as creatorWithoutSand
      const newFeeCollectorReceipt = await waitFor(catalystMinterContract.setFeeCollector(creatorWithoutSand.address));
      assert.equal(newFeeCollectorReceipt.events[0].event, "FeeCollector");
      assert.equal(newFeeCollectorReceipt.events[0].args[0], creatorWithoutSand.address);

      // creator mint asset and give to user
      const originalGemIds = [PowerGem, SpeedGem];
      const quantity = 30;
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
      const newBalance = await sand.balanceOf(creatorWithoutSand.address);
      assert.ok(newBalance.eq(BigNumber.from(value)));
      assert.ok(value.eq(BigNumber.from(totalExpectedFee)));

      // user updates the catalyst in the asset
      const catalystChangeSandFee = 0; // TODO
      const catalystChangeReceipt = await waitFor(
        user.CatalystMinter.extractAndChangeCatalyst(user.address, tokenId, LegendaryCatalyst, [], user.address) // empty gem array
      );

      // check the fee collector has received the correctfee for the catalyst update
      const changeEventsMatching = await findEvents(sand, "Transfer", catalystChangeReceipt.blockHash);
      const changeEvent = changeEventsMatching[0];
      assert.equal(changeEvent.args[0], user.address);
      assert.equal(changeEvent.args[1], creatorWithoutSand.address);
      console.log(changeEvent.args[2]);
      // TODO assert.equal(changeEvent.args[2], catalystChangeSandFee);
    });

    it("the correct sandFee is collected when gems are added", async function () {
      // addGems(
      //   address from,
      //   uint256 assetId,
      //   uint256[] calldata gemIds,
      //   address to
      // )
    });

    // TODO quantity = 1
    // TODO addGems post extraction
    // TODO set new catalyst post extraction
  });
});
