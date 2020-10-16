const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {expectRevert, emptyBytes, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");
const {execute} = deployments;

let assetAdmin;
let assetBouncerAdmin;
let userWithAssets;
let id;
let gameId;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const packId = 0;
const supply = 4;
const rarity = 3;

async function supplyAssets(creator) {
  await execute("Asset", {from: assetBouncerAdmin, skipUnknownSigner: true}, "setBouncer", assetAdmin, true);
  // mint some assets to a user who can then create a GAME token with assets:
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
    id = transferEvents[0].args[3];
    const balanceOf = await assetContract["balanceOf(address,uint256)"](userWithAssets.address, id);
    console.log(`balance? : ${balanceOf}`);
  });

  describe("GameToken: Minting GAMEs - Without Assets", function () {
    let newGameEvents;
    // @review finish test. Add testing for proper transfer of asset ownership, linking of game token and asset id's, all event args, etc...
    it("by default anyone can mint Games", async function () {
      const {gameToken, GameOwner} = await setupTest();
      console.log(`gameOwner address: ${GameOwner.address}`);
      const receipt = await waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [], []));
      newGameEvents = await findEvents(gameToken, "NewGame", receipt.blockHash);
      console.log(`newGameEvents: ${newGameEvents.length}`);
      gameId = newGameEvents[0].args[0];
      console.log(`event gameId: ${gameId}`);

      const owner = await gameToken.ownerOf(gameId);
      console.log(`owner: ${owner}`);
    });

    it("minter can create GAMEs when _minter is set", async function () {
      const {gameToken, gameTokenAsAdmin, users} = await setupTest();
      await gameTokenAsAdmin.setMinter(users[3].address);
      const Minter = users[3];
      const minterReceipt = Minter.Game.createGame(users[3].address, users[4].address, [], []);
      newGameEvents = await findEvents(gameToken, "NewGame", minterReceipt.blockHash);
      const minterGameId = newGameEvents[0].args[0];
      console.log(`minter game Id: ${minterGameId}`);
    });

    it("reverts if non-minter trys to mint Game when _minter set", async function () {
      const {gameTokenAsAdmin, gameToken, users} = await setupTest();
      await gameTokenAsAdmin.setMinter(users[7].address);
      const minterAddress = await gameToken.getMinter();
      assert.equal(minterAddress, users[7].address);
      await expectRevert(gameToken.createGame(users[2].address, users[2].address, [], []), "INVALID_MINTER");
    });
  });
  describe("GameToken: Modifying GAMEs", function () {
    let gameToken;
    let GameOwner;
    let GameEditor1;
    let GameEditor2;
    let users;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1, GameEditor2, users} = await setupTest());
    });

    it("should allow the owner to add game editors", async function () {
      // const {gameToken, GameOwner, GameEditor1, GameEditor2} = await setupTest();
      const receipt = await waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [], []));
      newGameEvents = await findEvents(gameToken, "NewGame", receipt.blockHash);
      gameId = newGameEvents[0].args[0];
      const owner = await gameToken.ownerOf(gameId);
      console.log(`owner: ${owner}`);
      expect(owner).to.be.equal(GameOwner.address);
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
      await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, true);
      const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
      const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
      assert.ok(isEditor1);
      assert.ok(isEditor2);
    });
    it("should allow the owner to remove game editors", async function () {
      // const {gameToken, GameOwner, GameEditor1, GameEditor2} = await setupTest();
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, false);
      await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, false);
      const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
      const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
      assert.notOk(isEditor1);
      assert.notOk(isEditor2);
    });

    it("should revert if non-owner trys to set Game Editors", async function () {
      // const {gameToken} = await setupTest();
      const editor = users[1];
      await expectRevert(gameToken.setGameEditor(42, editor.address, false), "EDITOR_ACCESS_DENIED");
    });
    it("Owner can add single Asset", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.addSingleAsset();
    });

    it("Owner can add multiple Assets", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.addMultipleAssets();
    });

    it("Owner can remove single Asset", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.removeSingleAsset();
    });

    it("Owner can remove multiple Assets", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.removeMultipleAssets();
    });

    it("Editor can add single Asset", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.addSingleAsset();
    });

    it("Editor can add multiple Assets", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.addMultipleAssets();
    });

    it("Editor can remove single Asset", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.removeSingleAsset();
    });

    it("Editor can remove multiple Assets", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.removeSingleAsset();
    });
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

    it("GAME owner can set the tokenURI", async function () {
      const {gameToken, GameOwner} = await setupTest();
      await GameOwner.Game.setTokenURI("Hello World");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello World");
    });

    it("GAME editors can set the tokenURI", async function () {
      const {gameToken, GameEditor1} = await setupTest();
      await GameEditor1.Game.setTokenURI("Hello Sandbox");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello Sandbox");
    });

    it("should revert if ownerOf == address(0)", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.tokenURI(11), "Id does not exist");
    });

    it("should revert if not ownerOf or gameEditor", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.setTokenURI(11, "New URI"), "URI_ACCESS_DENIED");
    });
  });
});
