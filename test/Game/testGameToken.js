const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {BigNumber} = require("ethers");
const {expectRevert, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest, supplyAssets} = require("./fixtures");

let id;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const dummyHash2 = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE";
const packId = 0;
const packId2 = 1;

describe("GameToken", function () {
  before(async function () {
    ({assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts());
    const {GameOwner} = await setupTest();
    const {assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 1, dummyHash);
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
        const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
        expect(gameAssets[0]).to.be.equal("0x00");
        expect(quantities[0]).to.be.equal("0x00");
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

      it("gameId contains creator address", async function () {
        console.log(`id: ${gameId}`);
        const slicedId = gameId.toString().slice(0, 48);
        const secondSlice = gameId.toString().slice(63);
        expect(slicedId).to.be.equal(BigNumber.from(GameOwner.address));
        expect(secondSlice).to.be.equal(String(1));
      });
    });

    describe("GameToken: Mint With Assets", function () {
      let assetId;
      let assetId2;
      it("anyone can mint Games with single Asset", async function () {
        ({gameToken, GameOwner} = await setupTest());
        const {assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 1, dummyHash);
        const assetContract = await ethers.getContract("Asset");
        const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
        const assetId = assetTransferEvents[0].args[2];
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
        ({gameToken, GameOwner} = await setupTest());
        const assetContract = await ethers.getContract("Asset");
        let assetReceipt;
        ({assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 3, dummyHash));
        const assetReceipt1 = assetReceipt;
        ({assetReceipt} = await supplyAssets(GameOwner.address, packId2, GameOwner.address, 2, dummyHash2));
        const assetReceipt2 = assetReceipt;
        9;

        const assetTransferEvents = await findEvents(assetContract, "TransferSingle", assetReceipt1.blockHash);
        const assetTransferEvents2 = await findEvents(assetContract, "TransferSingle", assetReceipt2.blockHash);

        assetId = assetTransferEvents[0].args[3];
        assetId2 = assetTransferEvents2[0].args[3];

        const userBalanceOf1 = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId);
        const userBalanceOf2 = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId2);
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

      // @review redundent...
      it.skip("can get an asset id and its value from a GAME", async function () {
        const {asset, value} = await gameToken.getGameAsset(gameId, 0);
        expect(asset).to.be.equal(assetId);
        expect(value).to.be.equal(3);
      });

      it("can get all assets at once from a game", async function () {
        const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
        expect(gameAssets[0]).to.be.equal(assetId);
        expect(gameAssets[1]).to.be.equal(assetId2);
        expect(quantities[0]).to.be.equal(3);
        expect(quantities[1]).to.be.equal(2);
      });

      it("should fail if length of assetIds and values dont match", async function () {
        const assetContract = await ethers.getContract("Asset");
        const {assetReceipt} = await supplyAssets(GameOwner.address, 7, GameOwner.address, 3, dummyHash);
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
    let singleAssetId;
    let assetId;
    let assetContract;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1, GameEditor2, users} = await setupTest());
      assetContract = await ethers.getContract("Asset");
      const {assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 1, dummyHash);
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
      const assetContract = await ethers.getContract("Asset");
      const {assetReceipt} = await supplyAssets(GameOwner.address, 11, GameOwner.address, 1, dummyHash);
      const assetTransferEvents = await findEvents(assetContract, "Transfer", assetReceipt.blockHash);
      singleAssetId = assetTransferEvents[0].args[2];
      const contractBalanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, singleAssetId);
      const ownerBalanceBefore = await assetContract["balanceOf(address,uint256)"](GameOwner.address, singleAssetId);
      const numberBefore = await gameToken.getNumberOfAssets(gameId);
      assert.equal(numberBefore, 0);

      const receipt = await waitFor(GameOwner.Game.addSingleAsset(GameOwner.address, gameId, singleAssetId));
      const contractBalanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, singleAssetId);
      const ownerBalanceAfter = await assetContract["balanceOf(address,uint256)"](GameOwner.address, singleAssetId);
      const numberAfter = await gameToken.getNumberOfAssets(gameId);
      assert.equal(numberAfter, 1);
      const assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", receipt.blockHash);
      const id = assetsAddedEvents[0].args[0];
      const assets = assetsAddedEvents[0].args[1];
      const values = assetsAddedEvents[0].args[2];
      const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
      const totalAssets = await GameOwner.Game.getNumberOfAssets(gameId);

      expect(totalAssets).to.be.equal(1);
      expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 1);
      expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 1);
      expect(gameAssets[0]).to.be.equal(singleAssetId);
      expect(quantities[0]).to.be.equal(values[0]);
      expect(id).to.be.equal(gameId);
      expect(assets[0]).to.be.equal(singleAssetId);
      expect(values[0]).to.be.equal(1);
    });

    it("Owner can add multiple Assets", async function () {
      const assetContract = await ethers.getContract("Asset");
      const {assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 7, dummyHash);
      const {assetReceipt: assetReceipt2} = await supplyAssets(
        GameOwner.address,
        packId2,
        GameOwner.address,
        42,
        dummyHash2
      );

      const assetTransferEvents = await findEvents(assetContract, "TransferSingle", assetReceipt.blockHash);
      const assetTransferEvents2 = await findEvents(assetContract, "TransferSingle", assetReceipt2.blockHash);

      assetId = assetTransferEvents[0].args[3];
      assetId2 = assetTransferEvents2[0].args[3];

      const contractBalanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);
      const ownerBalanceBefore = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId);
      const contractBalanceBefore2 = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId2);
      const ownerBalanceBefore2 = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId2);

      const assetsAddedReceipt = await GameOwner.Game.addMultipleAssets(
        GameOwner.address,
        gameId,
        [assetId, assetId2],
        [7, 42]
      );

      const contractBalanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId);
      const ownerBalanceAfter = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId);
      const contractBalanceAfter2 = await assetContract["balanceOf(address,uint256)"](gameToken.address, assetId2);
      const ownerBalanceAfter2 = await assetContract["balanceOf(address,uint256)"](GameOwner.address, assetId2);

      const assetsAddedEvents = await findEvents(gameToken, "AssetsAdded", assetsAddedReceipt.blockHash);
      const id = assetsAddedEvents[0].args[0];
      const assets = assetsAddedEvents[0].args[1];
      const values = assetsAddedEvents[0].args[2];

      const [gameAssets, quantities] = await GameOwner.Game.getGameAssets(gameId);
      const totalAssets = await GameOwner.Game.getNumberOfAssets(gameId);

      expect(totalAssets).to.be.equal(3);
      expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 7);
      expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 7);
      expect(ownerBalanceAfter2).to.be.equal(ownerBalanceBefore2 - 42);
      expect(contractBalanceAfter2).to.be.equal(contractBalanceBefore2 + 42);
      expect(gameAssets).to.deep.include(assetId);
      expect(gameAssets).to.deep.include(assetId2);
      expect(quantities[1]).to.be.equal(7);
      expect(quantities[2]).to.be.equal(42);
      expect(id).to.be.equal(gameId);
      expect(assets[0]).to.be.equal(assetId);
      expect(assets[1]).to.be.equal(assetId2);
      expect(values[0]).to.be.equal(7);
      expect(values[1]).to.be.equal(42);
    });

    it("Owner can remove single Asset", async function () {
      const numberBefore = await gameToken.getNumberOfAssets(gameId);
      const assetBalanceBefore = await assetContract["balanceOf(address,uint256)"](gameToken.address, singleAssetId);

      expect(numberBefore).to.be.equal(3);
      expect(assetBalanceBefore).to.be.equal(1);

      const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
      const assetRemovalReceipt = await GameOwner.Game.removeSingleAsset(gameId, gameAssets[0], GameOwner.address);
      const assetsRemovedEvents = await findEvents(gameToken, "AssetsRemoved", assetRemovalReceipt.blockHash);
      const id = assetsRemovedEvents[0].args[0];
      const assets = assetsRemovedEvents[0].args[1];
      const values = assetsRemovedEvents[0].args[2];
      const to = assetsRemovedEvents[0].args[3];
      const numberAfter = await gameToken.getNumberOfAssets(gameId);
      const assetBalanceAfter = await assetContract["balanceOf(address,uint256)"](gameToken.address, singleAssetId);
      const totalAssets = await GameOwner.Game.getNumberOfAssets(gameId);

      expect(totalAssets).to.be.equal(2);
      expect(assetBalanceAfter).to.be.equal(assetBalanceBefore - 1);
      expect(numberAfter).to.be.equal(2);
      expect(id).to.be.equal(gameId);
      expect(assets[0]).to.be.equal(gameAssets[0]);
      expect(values[0]).to.be.equal(1);
      expect(quantities[0]).to.be.equal(1);
      expect(to).to.be.equal(GameOwner.address);
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

    before(async function () {
      ({gameToken, users, GameOwner} = await setupTest());
      const {assetReceipt} = await supplyAssets(GameOwner.address, packId, GameOwner.address, 1, dummyHash);
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
      const gameTokenAsGameOwner = await gameToken.connect(gameToken.provider.getSigner(GameOwner.address));
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
