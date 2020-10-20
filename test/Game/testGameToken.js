const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {BigNumber} = require("ethers");
const {expectRevert, emptyBytes, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");
const {execute} = deployments;

let assetAdmin;
let assetBouncerAdmin;
let id;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const dummyHash2 = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const dummyHash3 = "0xEEFFFFFFFFFFFFFFFFFFFFFFFFFFFFEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEFF";
const packId = 0;
const packId2 = 1;
const packId3 = 3;

const rarity = 3;
// const raritiesPack = "0x";

async function supplyAssets(creator, packId, owner, supply, hash) {
  await execute("Asset", {from: assetBouncerAdmin, skipUnknownSigner: true}, "setBouncer", assetAdmin, true);
  // mint some assets to a user who can then create a GAME token with assets:
  const assetReceipt = await execute(
    "Asset",
    {from: assetAdmin, skipUnknownSigner: true},
    "mint",
    creator,
    packId,
    hash,
    supply,
    rarity,
    creator,
    emptyBytes
  );
  return {assetReceipt};
}

describe("GameToken", function () {
  before(async function () {
    ({assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts());
    const {userWithSAND} = await setupTest();
    const {assetReceipt} = await supplyAssets(userWithSAND.address, packId, userWithSAND.address, 1, dummyHash);
    userWithAssets = userWithSAND;
    const assetContract = await ethers.getContract("Asset");
    const transferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
    id = transferEvents[0].args[2];
  });

  describe("GameToken: Minting GAMEs", function () {
    describe("GameToken: Mint Without Assets", function () {
      describe("GameToken: With Minter", function () {
        let gameToken;
        let gameTokenAsAdmin;
        let users;
        let minterGameId;

        before(async function () {
          ({gameToken, gameTokenAsAdmin, users} = await setupTest());
        });

        // @review finish writing test
        it("minter can create GAMEs when _minter is set", async function () {
          await gameTokenAsAdmin.setMinter(users[3].address);
          const Minter = users[3];
          const minterReceipt = Minter.Game.createGame(users[3].address, users[4].address, [], [], []);
          transferEvents = await findEvents(gameToken, "Transfer", minterReceipt.blockHash);
          minterGameId = transferEvents[0].args[2];
        });

        it("reverts if non-minter trys to mint Game when _minter set", async function () {
          await expectRevert(gameToken.createGame(users[2].address, users[2].address, [], [], []), "INVALID_MINTER");
        });
      });

      describe("GameToken: No Minter", function () {});

      let gameToken;
      let GameOwner;
      let gameId;
      let GameEditor1;
      let GameEditor2;
      let userWithSAND;

      // @review finish test. Add testing for proper transfer of asset ownership, linking of game token and asset id's, all event args, etc...
      it("anyone can mint Games with no Assets", async function () {
        ({gameToken, GameOwner, GameEditor1, GameEditor2} = await setupTest());
        const receipt = await waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [], [], []));
        transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);
        assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", receipt.blockHash);
        gameId = transferEvents[0].args[2];
        const eventGameOwner = transferEvents[0].args[1];
        const assets = assetsAddedEvents[0].args[1];
        const contractGameOwner = await gameToken.ownerOf(gameId);

        expect(assets).to.eql([]);
        expect(eventGameOwner).to.be.equal(GameOwner.address);
        expect(contractGameOwner).to.be.equal(GameOwner.address);
        expect(contractGameOwner).to.be.equal(eventGameOwner);
      });

      // @review should probably be [] or [0], not undefined
      it("can get GAME data when no assets", async function () {
        const {assets, quantities} = await gameToken.getGameAssets(gameId);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(quantities).to.be.equal(undefined);
        expect(assets).to.be.equal(undefined);
        expect(ownerOf).to.be.equal(GameOwner.address);
      });

      it("anyone can mint Games with Editors", async function () {
        ({gameToken, GameOwner} = await setupTest());
        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            [GameEditor1.address, GameEditor2.address]
          )
        );
        transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);

        gameId = transferEvents[0].args[2];
        const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
        const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
        assert.ok(isEditor1);
        assert.ok(isEditor2);
      });
    });

    describe("GameToken: Mint With Assets", function () {
      it("anyone can mint Games with single Asset", async function () {
        ({gameToken, GameOwner, userWithSAND} = await setupTest());
        const {assetReceipt} = await supplyAssets(userWithSAND.address, packId, userWithSAND.address, 1, dummyHash);
        const assetContract = await ethers.getContract("Asset");
        const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
        const assetId = assetTransferEvents[0].args[2];
        expect(GameOwner.address).to.be.equal(userWithSAND.address);
        const balanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, id);
        const assetAsAssetOwner = await assetContract.connect(assetContract.provider.getSigner(GameOwner.address));
        await waitFor(assetAsAssetOwner.setApprovalForAllFor(GameOwner.address, gameToken.address, true));
        const receipt = await waitFor(
          GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [assetId], [1], [])
        );
        const balanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);

        const transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);
        gameId = transferEvents[0].args[2];
        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + 1);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
      });

      // @review finish !
      it("anyone can mint Games with many Assets", async function () {
        ({gameToken, GameOwner, userWithSAND} = await setupTest());
        const assetContract = await ethers.getContract("Asset");
        let assetReceipt;
        ({assetReceipt} = await supplyAssets(userWithSAND.address, packId, userWithSAND.address, 3, dummyHash));
        const assetReceipt1 = assetReceipt;
        ({assetReceipt} = await supplyAssets(userWithSAND.address, packId2, userWithSAND.address, 2, dummyHash2));
        const assetReceipt2 = assetReceipt;
        9;

        const assetTransferEvents = await findEvents(assetContract, "TransferSingle", assetReceipt1.blockHash);
        const assetTransferEvents2 = await findEvents(assetContract, "TransferSingle", assetReceipt2.blockHash);

        const assetId = assetTransferEvents[0].args[3];
        const assetId2 = assetTransferEvents2[0].args[3];

        const userBalanceOf1 = await assetContract["balanceOf(address,uint256)"](userWithSAND.address, assetId);
        const userBalanceOf2 = await assetContract["balanceOf(address,uint256)"](userWithSAND.address, assetId2);
        assert(userBalanceOf1 == 3, "Not 3");
        assert(userBalanceOf2 == 2, "Not 2");

        const quantity = assetTransferEvents[0].args[4];
        const quantity2 = assetTransferEvents2[0].args[4];
        console.log(`asset id: ${assetId}`);
        console.log(`asset id2: ${assetId2}`);
        console.log(`quantity: ${quantity}`);
        console.log(`quantity2: ${quantity2}`);

        const balanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);
        const balanceBefore2 = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId2);

        const assetAsAssetOwner = await assetContract.connect(assetContract.provider.getSigner(GameOwner.address));
        await waitFor(assetAsAssetOwner.setApprovalForAllFor(GameOwner.address, gameToken.address, true));

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId, assetId2],
            [quantity, quantity2],
            []
          )
        );

        const balanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);
        const balanceAfter2 = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId2);

        const transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);
        const assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", receipt.blockHash);
        gameId = transferEvents[0].args[2];
        id = assetsAddedEvents[0].args[0];
        assets = assetsAddedEvents[0].args[1];
        values = assetsAddedEvents[0].args[2];

        console.log(`id: ${id}`);
        console.log(`assets: ${assets}`);
        console.log(`values: ${values}`);

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + quantity);
        expect(balanceAfter2).to.be.equal(balanceBefore2 + quantity2);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
        expect(id).to.be.equal(gameId);
        expect(assets).to.be.eql([assetId, assetId2]);
        expect(values).to.be.eql([BigNumber.from(3), BigNumber.from(2)]);
      });

      // @review fix !
      it.skip("can get GAME data with assets", async function () {
        let assets = [0];
        let quantities = [0];
        ({assets, quantities} = await gameToken.getGameAssets(gameId));
        // console.log(`num of assets: ${quantities}`);
        // console.log(`assets: ${assets}`);
        // console.log(`length: ${assets.length}`);
        // console.log(`quan length: ${quantities.length}`);
        // expect(assets.length).to.be.equal(1);
        // expect(quantities.length).to.be.equal(assets.length);
      });

      it.skip("should fail if length of assetIds and values dont match", async function () {
        // await expectRevert(, "INVALID_INPUT_LENGTHS")
      });
    });
  });

  describe("GameToken: Modifying GAMEs", function () {
    let gameToken;
    let GameOwner;
    let GameEditor1;
    let GameEditor2;
    let users;
    let gameId;
    let assetId;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1, GameEditor2, users} = await setupTest());
      const assetContract = await ethers.getContract("Asset");
      const {assetReceipt} = await supplyAssets(userWithSAND.address, packId, userWithSAND.address, 1, dummyHash);
      const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);

      assetId = assetTransferEvents[0].args[2];
      const assetAsAssetOwner = await assetContract.connect(assetContract.provider.getSigner(GameOwner.address));
      await waitFor(assetAsAssetOwner.setApprovalForAllFor(GameOwner.address, gameToken.address, true));
      const receipt = await waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [], [], []));
      transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);

      gameId = transferEvents[0].args[2];
    });

    it("should allow the owner to add game editors", async function () {
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
      await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, true);
      const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
      const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
      assert.ok(isEditor1);
      assert.ok(isEditor2);
    });
    it("should allow the owner to remove game editors", async function () {
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, false);
      await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, false);
      const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
      const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
      assert.notOk(isEditor1);
      assert.notOk(isEditor2);
    });

    it("should revert if non-owner trys to set Game Editors", async function () {
      const editor = users[1];
      await expectRevert(gameToken.setGameEditor(42, editor.address, false), "EDITOR_ACCESS_DENIED");
    });

    it("Owner can add single Asset", async function () {
      const {receipt} = await GameOwner.Game.addSingleAsset(gameId, assetId, 1);
      const assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", receipt.blockHash);
      const id = assetsAddedEvents[0].args[0];
      const assets = assetsAddedEvents[0].args[1];
      const values = assetsAddedEvents[0].args[2];

      expect(id).to.be.equal(gameId);
      expect(assets).to.have.same.members([assetId]);
      expect(values).to.have.same.members([1]);
    });

    it.skip("Owner can add multiple Assets", async function () {
      await GameOwner.Game.addMultipleAssets();
    });

    it.skip("Owner can remove single Asset", async function () {
      await GameOwner.Game.removeSingleAsset();
    });

    it.skip("Owner can remove multiple Assets", async function () {
      await GameOwner.Game.removeMultipleAssets();
    });

    it.skip("Editor can add single Asset", async function () {
      await GameEditor1.Game.addSingleAsset();
    });

    it.skip("Editor can add multiple Assets", async function () {
      await GameEditor1.Game.addMultipleAssets();
    });

    it.skip("Editor can remove single Asset", async function () {
      await GameEditor1.Game.removeSingleAsset();
    });

    it.skip("Editor can remove multiple Assets", async function () {
      await GameEditor1.Game.removeSingleAsset();
    });
  });

  describe("GameToken: Transferring GAMEs", function () {
    let gameId;
    let assetId;
    let assetContract;
    let gameToken;
    let users;
    let GameOwner;
    let userWithSAND;

    before(async function () {
      ({gameToken, userWithSAND, users, GameOwner} = await setupTest());
      const {assetReceipt} = await supplyAssets(userWithSAND.address, packId, userWithSAND.address, 1, dummyHash);
      userWithAssets = userWithSAND;
      assetContract = await ethers.getContract("Asset");
      const transferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
      assetId = transferEvents[0].args[2];
      const assetAsAssetOwner = await assetContract.connect(assetContract.provider.getSigner(GameOwner.address));
      await waitFor(assetAsAssetOwner.setApprovalForAllFor(GameOwner.address, gameToken.address, true));
      const receipt = await waitFor(
        GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [assetId], [1], [])
      );
      const newGameEvents = await findEvents(gameToken, "NewGame", receipt.blockHash);
      gameId = newGameEvents[0].args[0];
      console.log(`gameId: ${gameId}`);
      const owner = newGameEvents[0].args[1];
      console.log(`owner here: ${owner}`);
    });

    it("current owner can transfer ownership of a GAME", async function () {
      console.log(`game id here: ${gameId}`);
      const balance = await gameToken.balanceOf(GameOwner.address);
      console.log(`balance here: ${balance}`);
      const originalOwner = await gameToken.ownerOf(gameId);
      console.log(`original Owner: ${originalOwner}`);
      const recipient = users[7].address;
      const gameTokenAsGameOwner = await gameToken.connect(gameToken.provider.getSigner(userWithSAND.address));
      await waitFor(
        gameTokenAsGameOwner["safeTransferFrom(address,address,uint256)"](originalOwner, recipient, gameId)
      );
      const newOwner = await gameToken.ownerOf(gameId);
      expect(newOwner).to.be.equal(recipient);
    });

    it("should fail if non-owner trys to transfer a GAME", async function () {
      const originalOwner = await gameToken.ownerOf(gameId);
      await expectRevert(
        gameToken["safeTransferFrom(address,address,uint256)"](originalOwner, users[10].address, gameId),
        "not approved to transfer"
      );
    });
  });

  describe("GameToken: MetaData", function () {
    let gameToken;
    let gameId;
    let GameOwner;
    let GameEditor1;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1} = await setupTest());
      const receipt = await waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [], [], []));
      newGameEvents = await findEvents(gameToken, "NewGame", receipt.blockHash);
      gameId = newGameEvents[0].args[0];
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
    });

    it("can get the ERC721 token contract name", async function () {
      const name = await gameToken.name();
      expect(name).to.be.equal("Sandbox's GAMEs");
    });

    it("can get the ERC721 token contract symbol", async function () {
      const symbol = await gameToken.symbol();
      expect(symbol).to.be.equal("GAME");
    });

    it("GAME owner can set the tokenURI", async function () {
      await GameOwner.Game.setTokenURI(gameId, "Hello World");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello World");
    });

    it("GAME editors can set the tokenURI", async function () {
      await GameEditor1.Game.setTokenURI(gameId, "Hello Sandbox");
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
