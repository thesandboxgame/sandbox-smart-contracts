const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {expectRevert, waitFor, emptyBytes} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");
const {execute} = deployments;

let assetAdmin;
let assetBouncerAdmin;
let others;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const packId = 0;
const supply = 11;
const rarity = 3;

async function supplyAssets(creator) {
  await execute("Asset", {from: assetBouncerAdmin, skipUnknownSigner: true}, "setBouncer", assetAdmin, true);
  // mint some assets to a user who can then create a GAME token
  const receipt = await waitFor(
    execute(
      "Asset",
      {from: assetAdmin, skipUnknownSigner: true},
      "mint",
      creator.address,
      packId,
      dummyHash,
      supply,
      rarity,
      creator.address,
      emptyBytes
    )
  );
  console.log(`Blockhash: ${receipt.blockHash}`);
  return receipt;
}

describe("GameToken", function () {
  before(async function () {
    ({assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts());
    const {userWithSAND} = await setupTest();
    const {receipt} = await supplyAssets(userWithSAND);
    const asset = await ethers.getContract("Asset", assetAdmin);
    const transferEvents = await findEvents(asset, "Transfer", receipt.blockHash);
    console.log(`transferEvents: ${transferEvents.length}`);
    const tokenId = transferEvents[0].args[2];
    console.log(`Token ID: ${tokenId}`);
  });
  describe("GameToken: MetaData", function () {
    it("can get the ERC721 token contract name", async function () {
      const {gameToken} = await setupTest();
      const name = await gameToken.name();
      expect(name).to.be.equal("Sandbox's GAMEs");
    });

    it("can get the ERC721 token contract symbol", async function () {
      const {gameToken} = await setupTest();
      const symbol = await gameToken.symbol();
      expect(symbol).to.be.equal("GAME");
    });

    it("should revert if ownerOf == address(0)", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.tokenURI(11), "Id does not exist");
    });

    it("should revert if not ownerOf or gameEditor", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.setTokenURI(11, "New URI"), "URI_ACCESS_DENIED");
    });

    it.skip("can get the tokenURI", async function () {
      const {gameToken} = await setupTest();
      const URI = await gameToken.tokenURI(1);
      expect(URI).to.be.equal("Hello World");
    });

    it.skip("GAME owner can set the tokenURI", async function () {
      const {gameToken} = await setupTest();
      const URI = await gameToken.tokenURI(1);
      expect(URI).to.be.equal("Hello World");
    });

    it.skip("GAME editors can set the tokenURI", async function () {
      const {gameToken} = await setupTest();
      const URI = await gameToken.tokenURI(1);
      expect(URI).to.be.equal("Hello World");
    });
  });

  it.skip("should allow the owner to add game editors", async function () {
    const {gameToken} = await setupTest();
    await gameToken.setGameEditor(id, editor1, true);
    await gameToken.setGameEditor(id, editor2, true);
    const isEditor1 = await gameToken.isGameEditor(id, editor1);
    const isEditor2 = await gameToken.isGameEditor(id, editor2);
    assert.ok(isEditor1);
    assert.ok(isEditor2);
  });
  it.skip("should allow the owner to remove game editors", async function () {
    const {gameToken} = await setupTest();
    await gameToken.setGameEditor();
    await gameToken.setGameEditor();
    const isEditor1 = await gameToken.isGameEditor();
    const isEditor2 = await gameToken.isGameEditor();
    assert.notOk(isEditor1);
    assert.notOk(isEditor2);
  });

  it("should revert if non-owner trys to set Game Editors", async function () {
    const {gameToken} = await setupTest();
    const editor = others[3];
    await expectRevert(gameToken.setGameEditor(42, editor, false), "EDITOR_ACCESS_DENIED");
  });

  describe("GameToken: Minting GAMEs", function () {
    it("creator without Assets cannot mint Game", async function () {});
    it("if _minter is address(0) anyone can mint Game", async function () {});
    it("if _minter is set only _minter can mint Game", async function () {});
  });
  describe("GameToken: Modifying GAMEs", function () {
    it("Owner can add single Asset", async function () {});
    it("Editor can add single Asset", async function () {});
    it("Owner can add multiple Assets", async function () {});
    it("Editor can add multiple Assets", async function () {});
  });
});
