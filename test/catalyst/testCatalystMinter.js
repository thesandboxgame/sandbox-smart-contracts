const {assert} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {expectRevert, emptyBytes, waitFor, findEvents, checERC20Balances, toWei} = require("local-utils");

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
    const {creator, catalysts, asset, sand, gems} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    const totalExpectedFee = toWei(11 * 10);

    const receipt = await checERC20Balances(
      creator.address,
      {Sand: [sand, "-" + totalExpectedFee], PowerGem: [gems.Power, -3], EpicCatalyst: [catalysts.Epic, -1]}, // TOOO SAND fee
      () =>
        waitFor(
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
        )
    );
    const events = await findEvents(asset, "TransferSingle", receipt.blockHash);
    const tokenId = events[0].args.id;
    const balance = await asset["balanceOf(address,uint256)"](creator.address, tokenId);
    const rarity = await asset.rarity(tokenId);

    assert.equal(balance, 11);
    assert.equal(rarity, 2);
  });
});
