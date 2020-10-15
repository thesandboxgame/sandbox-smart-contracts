const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {expectRevert, emptyBytes, checERC1155Balances} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");
const {execute} = deployments;

let assetAdmin;
let assetBouncerAdmin;
let others;
let userWithAssets;
let id;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const packId = 0;
const supply = 4;
const rarity = 3;

async function supplyAssets(creator) {
  await execute("Asset", {from: assetBouncerAdmin, skipUnknownSigner: true}, "setBouncer", assetAdmin, true);
  // mint some assets to a user who can then create a GAME token
  const receipt = await execute(
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
  );
  console.log(`Blockhash: ${receipt.blockHash}`);
  return {receipt};
}

describe("GameToken", function () {
  before(async function () {
    ({assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts());
    const {userWithSAND} = await setupTest();
    const {receipt} = await supplyAssets(userWithSAND);
    userWithAssets = userWithSAND;
    const assetContract = await ethers.getContract("Asset");
    const transferEvents = await findEvents(assetContract, "TransferSingle", receipt.blockHash);
    console.log(`transferEvents: ${transferEvents.length}`);
    id = transferEvents[0].args[3];

    console.log(`Token ID: ${id}`);
    const isCollection = await assetContract.isCollection(id);
    console.log(`Collection? : ${isCollection}`);
    assert.ok(isCollection);

    const balanceOf = await assetContract.balanceOf(userWithAssets.address, id);
    console.log(`balance? : ${balanceOf}`);

    expect(ownerOf).to.be.equal(userWithAssets.address);
  });
  describe("GameToken: MetaData", function () {
    let gameTokenAsOwner;
    let gameTokenAsAdmin;
    let editor;
    let editor1;
    let editor2;
    let gameId;

    before(async function () {
      const {gameToken, users} = await setupTest();
      // gameId =
      editor = users[5];
      editor1 = users[6];
      editor2 = users[6];
      gameTokenAsOwner = gameToken.connect(gameToken.provider.getSigner(userWithAssets.address));
      gameTokenAsEditor = gameToken.connect(gameToken.provider.getSigner(editor.address));
    });
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

    it("GAME owner can set the tokenURI", async function () {
      const {gameToken} = await setupTest();
      await gameTokenAsOwner.setTokenURI("Hello World");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello World");
    });

    it("GAME editors can set the tokenURI", async function () {
      const {gameToken} = await setupTest();
      await gameTokenAsEditor.setTokenURI("Hello Sandbox");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello Sandbox");
    });
  });

  it("should allow the owner to add game editors", async function () {
    const {gameToken} = await setupTest();
    await gameTokenAsOwner.setGameEditor(gameId, editor1, true);
    await gameTokenAsOwner.setGameEditor(gameId, editor2, true);
    const isEditor1 = await gameToken.isGameEditor(gameId, editor1);
    const isEditor2 = await gameToken.isGameEditor(gameId, editor2);
    assert.ok(isEditor1);
    assert.ok(isEditor2);
  });
  it("should allow the owner to remove game editors", async function () {
    const {gameToken} = await setupTest();
    await gameTokenAsOwner.setGameEditor(gameId, editor1, false);
    await gameTokenAsOwner.setGameEditor(gameId, editor2, false);
    const isEditor1 = await gameToken.isGameEditor(editor1);
    const isEditor2 = await gameToken.isGameEditor(editor2);
    assert.notOk(isEditor1);
    assert.notOk(isEditor2);
  });

  it("should revert if non-owner trys to set Game Editors", async function () {
    const {gameToken} = await setupTest();
    const editor = others[3];
    await expectRevert(gameToken.setGameEditor(42, editor, false), "EDITOR_ACCESS_DENIED");
  });

  describe("GameToken: Minting GAMEs", function () {
    it("creator without Assets cannot mint Game", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.createGame(others[2], others[2], [], []), "INSUFFICIENT_ASSETS_SPECIFIED");
    });

    // @review finish test.
    it("by default anyone can mint Games", async function () {
      const {gameToken} = await setupTest();
      const gameAsAssetOwner = gameToken.connect(gameToken.provider.getSigner(userWithAssets.address));
      await gameAsAssetOwner.createGame(others[2], others[2], [id], []);
    });

    it("reverts if non-minter trys to mint Game when _minter set", async function () {
      const {gameTokenAsAdmin, gameToken} = await setupTest();
      await gameTokenAsAdmin.setMinter(others[7]);
      const minterAddress = await gameToken.getMinter();
      assert.equal(minterAddress, others[7]);
      await expectRevert(gameToken.createGame(others[2], others[2], [], []), "INVALID_MINTER");
    });
  });
  describe("GameToken: Modifying GAMEs", function () {
    it("Owner can add single Asset", async function () {});
    it("Editor can add single Asset", async function () {});
    it("Owner can add multiple Assets", async function () {});
    it("Editor can add multiple Assets", async function () {});
    it("Owner can remove single Asset", async function () {});
    it("Editor can remove single Asset", async function () {});
    it("Owner can remove multiple Assets", async function () {});
    it("Editor can remove multiple Assets", async function () {});
  });
});
