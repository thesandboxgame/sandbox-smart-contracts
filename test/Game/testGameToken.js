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
const packId = 0;
const packId2 = 1;
const rarity = 3;

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

      // @review should be [] or [0], not undefined
      it("fails to get GAME data when no assets", async function () {
        const index = 0;
        await expectRevert(gameToken.getGameAsset(gameId, index), "EnumerableSet: index out of bounds");
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
      let assetId;
      let assetId2;
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

        assetId = assetTransferEvents[0].args[3];
        assetId2 = assetTransferEvents2[0].args[3];

        const userBalanceOf1 = await assetContract["balanceOf(address,uint256)"](userWithSAND.address, assetId);
        const userBalanceOf2 = await assetContract["balanceOf(address,uint256)"](userWithSAND.address, assetId2);
        assert(userBalanceOf1 == 3, "Not 3");
        assert(userBalanceOf2 == 2, "Not 2");

        const quantity = assetTransferEvents[0].args[4];
        const quantity2 = assetTransferEvents2[0].args[4];

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

      it("can get the number of assets", async function () {
        const number = await gameToken.getNumberOfAssets(gameId);
        expect(number).to.be.equal(2);
      });

      it("can get an asset id and its value from a GAME", async function () {
        const {asset, value} = await gameToken.getGameAsset(gameId, 0);
        expect(asset).to.be.equal(assetId);
        expect(value).to.be.equal(3);
      });

      it("can get many assets & values from a GAME", async function () {
        const number = await gameToken.getNumberOfAssets(gameId);
        let assets = [];
        let values = [];
        for (i = 0; i < number; i++) {
          const {asset, value} = await gameToken.getGameAsset(gameId, i);
          assets.push(asset);
          values.push(value);
        }

        expect(assets).to.be.eql([assetId, assetId2]);
        expect(values[0]).to.be.equal(3);
        expect(values[1]).to.be.equal(2);
      });

      it("can get all assets at once from a game", async function () {
        const assets = await gameToken.getGameAssets(gameId);
        console.log(`assets: ${assets}`);
        assert.notEqual(assets, undefined, "assets is still undefined");
      });

      it("should fail if length of assetIds and values dont match", async function () {
        const assetContract = await ethers.getContract("Asset");
        const {assetReceipt} = await supplyAssets(userWithSAND.address, 7, userWithSAND.address, 3, dummyHash);
        const assetTransferEvents = await findEvents(assetContract, "TransferSingle", assetReceipt.blockHash);

        const assetId = assetTransferEvents[0].args[3];
        await expectRevert(
          waitFor(GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [assetId], [11, 42], [])),
          "INVALID_INPUT_LENGTHS"
        );
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
    let assetContract;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1, GameEditor2, userWithSAND, users} = await setupTest());
      assetContract = await ethers.getContract("Asset");
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
      const ownerOfGame = await gameToken.ownerOf(gameId);
      assert(ownerOfGame == GameOwner.address, "Owner Mismatch");

      const assetContract = await ethers.getContract("Asset");
      const {assetReceipt} = await supplyAssets(userWithSAND.address, 11, userWithSAND.address, 1, dummyHash);
      const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
      assetId = assetTransferEvents[0].args[2];
      const numberBefore = await gameToken.getNumberOfAssets(gameId);
      assert.equal(numberBefore, 0);

      const receipt = await waitFor(GameOwner.Game.addSingleAsset(GameOwner.address, gameId, assetId));
      const numberAfter = await gameToken.getNumberOfAssets(gameId);
      assert.equal(numberAfter, 1);
      const assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", receipt.blockHash);
      const id = assetsAddedEvents[0].args[0];
      const assets = assetsAddedEvents[0].args[1];
      const values = assetsAddedEvents[0].args[2];
      const gameDataAssetId = await gameToken.getGameAsset(gameId, 0);
      expect(gameDataAssetId[0]).to.be.equal(assetId);
      expect(gameDataAssetId[1]).to.be.equal(values[0]);
      expect(id).to.be.equal(gameId);
      expect(assets[0]).to.be.equal(assetId);
      expect(values[0]).to.be.equal(1);
    });

    it("Owner can remove single Asset", async function () {
      const numberBefore = await gameToken.getNumberOfAssets(gameId);
      const assetBalanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);

      expect(numberBefore).to.be.equal(1);
      expect(assetBalanceBefore).to.be.equal(1);

      const assetInGame = await gameToken.getGameAsset(gameId, 0);
      const assetRemovalReceipt = await GameOwner.Game.removeSingleAsset(gameId, assetInGame[0], GameOwner.address);
      const assetsRemovedEvents = await findEvents(gameToken, "AssetsRemoved", assetRemovalReceipt.blockHash);
      const id = assetsRemovedEvents[0].args[0];
      const assets = assetsRemovedEvents[0].args[1];
      const values = assetsRemovedEvents[0].args[2];
      const to = assetsRemovedEvents[0].args[3];
      const numberAfter = await gameToken.getNumberOfAssets(gameId);
      const assetBalanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);

      expect(assetBalanceAfter).to.be.equal(assetBalanceBefore - 1);
      expect(numberAfter).to.be.equal(0);
      expect(id).to.be.equal(gameId);
      expect(assets[0]).to.be.equal(assetInGame[0]);
      expect(values[0]).to.be.equal(1);
      expect(to).to.be.equal(GameOwner.address);
    });

    it.skip("Owner can add multiple Assets", async function () {
      await GameOwner.Game.addMultipleAssets();
    });

    it.skip("Owner can remove multiple Assets", async function () {});

    it.skip("Editor can add & remove Assets", async function () {});
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
      const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
      assetId = assetTransferEvents[0].args[2];
      const assetAsAssetOwner = await assetContract.connect(assetContract.provider.getSigner(GameOwner.address));
      await waitFor(assetAsAssetOwner.setApprovalForAllFor(GameOwner.address, gameToken.address, true));
      const receipt = await waitFor(
        GameOwner.Game.createGame(GameOwner.address, GameOwner.address, [assetId], [1], [])
      );
      const transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);
      gameId = transferEvents[0].args[2];
    });

    it("current owner can transfer ownership of a GAME", async function () {
      const originalOwner = await gameToken.ownerOf(gameId);
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
      transferEvents = await findEvents(gameToken, "Transfer", receipt.blockHash);
      gameId = transferEvents[0].args[2];
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
