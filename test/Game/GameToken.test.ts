import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract, BytesLike} from 'ethers';
import Prando from 'prando';
import {Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
import {waitFor, expectEventWithArgs, findEvents} from '../utils';
import {setupTest, setupTestWithAdminGameMinter, User} from './fixtures';
import {supplyAssets, supplyAssets721} from './assets';
import {toUtf8Bytes} from 'ethers/lib/utils';
import {sendMetaTx} from '../sendMetaTx';

let id: BigNumber;
const rng = new Prando('GameToken');

type UpdateGame1155 = {
  assetIdsToRemove: BigNumber[];
  assetAmountsToRemove: number[];
  assetIdsToAdd: BigNumber[];
  assetAmountsToAdd: number[];
};

type UpdateGame721 = {
  assetIdsToRemove: BigNumber[];
  assetIdsToAdd: BigNumber[];
};

type UpdateGame = {
  gameData1155: UpdateGame1155;
  gameData721: UpdateGame721;
  uri: BytesLike;
};

const update1155: UpdateGame1155 = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [],
};

const update721: UpdateGame721 = {
  assetIdsToRemove: [],
  assetIdsToAdd: [],
};

const update: UpdateGame = {
  gameData1155: update1155,
  gameData721: update721,
  uri: utils.keccak256(ethers.utils.toUtf8Bytes('')),
};

const newUpdateAdd1155 = (
  update: UpdateGame,
  assetIdsToAdd1155: BigNumber[],
  assetAmountsToAdd1155: number[]
) => {
  return {
    ...update,
    gameData1155: {
      ...update.gameData1155,
      assetIdsToAdd: assetIdsToAdd1155,
      assetAmountsToAdd: assetAmountsToAdd1155,
    },
  };
};

const newUpdateAdd721 = (update: UpdateGame, assetIdsToAdd721: BigNumber[]) => {
  return {
    ...update,
    gameData721: {
      ...update.gameData721,
      assetIdsToAdd: assetIdsToAdd721,
    },
  };
};

const newUpdateRemove1155 = (
  update: UpdateGame,
  assetIdsToRemove1155: BigNumber[],
  assetAmountsToRemove1155: number[]
) => {
  return {
    ...update,
    gameData1155: {
      ...update.gameData1155,
      assetIdsToRemove: assetIdsToRemove1155,
      assetAmountsToRemove: assetAmountsToRemove1155,
    },
  };
};

// for prod, use maximum uint64 (2^64-1) as upper limit
async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

async function getNewGame(
  gameToken: Contract,
  from: User,
  to: User,
  assetIds: BigNumber[] | null,
  assetAmounts: number[] | null,
  asset721Ids?: BigNumber[]
) {
  if (assetIds) {
    if (!assetAmounts || assetIds.length != assetAmounts.length) {
      throw new Error('Input Parameter length mismatch in getNewGame');
    }
  }

  const randomId = await getRandom();
  const {gameTokenAdmin} = await getNamedAccounts();
  const gameTokenAsMinter = await gameToken.connect(
    ethers.provider.getSigner(gameTokenAdmin)
  );

  const gameData1155 = {
    ...update.gameData1155,
    assetIdsToAdd: assetIds,
    assetAmountsToAdd: assetAmounts,
  };

  const gameData721 = {
    ...update.gameData721,
    assetIdsToAdd: asset721Ids ? asset721Ids : [],
  };

  const receipt = await waitFor(
    gameTokenAsMinter.createGame(
      from.address,
      to.address,
      {...update, gameData721, gameData1155},
      ethers.constants.AddressZero,
      randomId
    )
  );

  const transferEvent = await expectEventWithArgs(
    gameToken,
    receipt,
    'Transfer'
  );
  const gameId = transferEvent.args[2];

  const gameStateAfter = await gameToken.getERC1155AssetBalances(
    gameId,
    assetIds
  );
  if (assetIds && assetAmounts) {
    for (let i = 0; i < assetIds.length; i++) {
      expect(gameStateAfter[i]).to.be.equal(assetAmounts[i]);
    }
  }

  if (asset721Ids) {
    const gameStateAfter721 = await gameToken.getERC721AssetBalances(
      gameId,
      asset721Ids
    );
    if (asset721Ids) {
      for (let i = 0; i < asset721Ids.length; i++) {
        expect(gameStateAfter721[i]).to.be.equal(1);
      }
    }
  }

  return {gameId, randomId};
}

async function getBalances(
  assetContract: Contract,
  addresses: Address[],
  assets: BigNumber[]
): Promise<number[]> {
  const balances: number[] = [];
  balances[0] = await assetContract['balanceOf(address,uint256)'](
    addresses[0],
    assets[0]
  );
  balances[1] = await assetContract['balanceOf(address,uint256)'](
    addresses[0],
    assets[1]
  );
  balances[2] = await assetContract['balanceOf(address,uint256)'](
    addresses[1],
    assets[0]
  );
  balances[3] = await assetContract['balanceOf(address,uint256)'](
    addresses[1],
    assets[1]
  );
  return balances;
}

async function setUpBefore() {
  const {GameOwner, gameToken} = await setupTest();

  const asset1155Contract = await ethers.getContract('Asset');
  const asset721Contract = await ethers.getContract('AssetERC721');

  const isApprovedForAll1155 = await asset1155Contract.isApprovedForAll(
    GameOwner.address,
    gameToken.address
  );
  expect(isApprovedForAll1155).to.be.true;

  const isApprovedForAll721 = await asset721Contract.isApprovedForAll(
    GameOwner.address,
    gameToken.address
  );
  expect(isApprovedForAll721).to.be.true;
}

describe('GameToken', function () {
  describe('GameToken: Minting GAMEs', function () {
    let users: User[];
    let gameToken: Contract;
    let gameTokenAsMinter: Contract;
    let gameTokenAsAdmin: Contract;
    let GameOwner: User;
    let gameId: BigNumber;

    it('can update the GameMinter address', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTest());
      await expect(gameToken.changeMinter(users[8].address)).to.be.revertedWith(
        'ADMIN_ONLY'
      );

      const {gameTokenAdmin} = await getNamedAccounts();

      const originalMinter = await gameToken.getMinter();
      await gameTokenAsAdmin.changeMinter(gameTokenAdmin);
      const newMinter = await gameToken.getMinter();
      expect(newMinter).to.be.equal(gameTokenAdmin);
      expect(newMinter).to.not.equal(originalMinter);
    });

    it('Minter can create GAMEs when _Minter is set', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTestWithAdminGameMinter());
      const randomId = await getRandom();

      expect(await gameToken.balanceOf(users[4].address)).to.be.equal(0);

      const minterReceipt = await gameTokenAsAdmin.createGame(
        users[3].address,
        users[4].address,
        {...update},
        ethers.constants.AddressZero,
        randomId
      );

      const transferEvent = await expectEventWithArgs(
        gameToken,
        minterReceipt,
        'Transfer'
      );
      const updateEvent = await expectEventWithArgs(
        gameToken,
        minterReceipt,
        'GameTokenUpdated'
      );
      gameId = updateEvent.args[1];
      const gameIdFromTransfer = transferEvent.args[2];
      const ownerFromEvent = transferEvent.args[1];
      const ownerFromStorage = await gameToken.ownerOf(gameId);
      expect(await gameToken.balanceOf(users[4].address)).to.be.equal(1);
      expect(gameId).to.be.equal(gameIdFromTransfer);
      expect(ownerFromStorage).to.be.equal(users[4].address);
      expect(ownerFromEvent).to.be.equal(ownerFromStorage);
    });

    it('should revert if trying to reuse a baseId', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTestWithAdminGameMinter());
      const randomId = await getRandom();
      await gameTokenAsMinter.createGame(
        users[3].address,
        users[4].address,
        {...update},
        ethers.constants.AddressZero,
        randomId
      );
      await expect(
        gameTokenAsMinter.createGame(
          users[3].address,
          users[4].address,
          {...update},
          ethers.constants.AddressZero,
          randomId
        )
      ).to.be.revertedWith('STORAGE_ID_REUSE_FORBIDDEN');
    });

    it('gameId contains creator, randomId, chainIndex & version data', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const gameId = (
        await getNewGame(gameToken, GameOwner, GameOwner, assets, [1])
      ).gameId;

      const idAsHex = utils.hexValue(gameId);
      const creatorSlice = idAsHex.slice(0, 42);
      const randomIdSlice = idAsHex.slice(43, 58);
      const chainIndexSlice = idAsHex.slice(58, 62);
      const versionSlice = idAsHex.slice(62);
      expect(utils.getAddress(creatorSlice)).to.be.equal(GameOwner.address);
      expect(randomIdSlice).to.not.equal('000000000000000');
      expect(chainIndexSlice).to.be.equal('0001');
      expect(versionSlice).to.be.equal('0001');
    });

    it('can get the storageId for a GAME', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const gameId = (
        await getNewGame(gameToken, GameOwner, GameOwner, assets, [1])
      ).gameId;

      const storageIdAsHex = utils.hexValue(
        await gameToken.getStorageId(gameId)
      );
      expect(storageIdAsHex).to.not.equal(ethers.constants.AddressZero);
    });

    it('can get the chainIndex for a GAME', async function () {
      ({
        gameToken,
        users,
        GameOwner,
        gameTokenAsAdmin,
        gameTokenAsMinter,
      } = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );

      const chainIndex = await gameToken.getChainIndex(gameId);
      expect(chainIndex).to.be.equal(1);
    });

    it('reverts if non-minter trys to mint Game when _Minter is set', async function () {
      ({gameToken, users, GameOwner, gameTokenAsAdmin} = await setupTest());
      const randomId = await getRandom();
      await expect(
        gameToken.createGame(
          users[2].address,
          users[2].address,
          {...update},
          ethers.constants.AddressZero,
          randomId
        )
      ).to.be.revertedWith('MINTER_ACCESS_DENIED');
    });

    describe('GameToken: Mint With Assets', function () {
      let assetId: BigNumber;
      let assetId2: BigNumber;
      let gameId: BigNumber;
      let eventAssets: BigNumber[];
      let values: BigNumber[];

      it('fails to create if "to" address is the gameToken contract', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        await expect(
          gameTokenAsAdmin.createGame(
            GameOwner.address,
            gameToken.address,
            {...update},
            ethers.constants.AddressZero,
            42
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('fails to add ERC1155 tokens to the game if Operator != GAME contract', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        const assetContract = await ethers.getContract('Asset');
        const assetAsGameOwner = await assetContract.connect(
          ethers.provider.getSigner(GameOwner.address)
        );
        const assets = await supplyAssets(GameOwner.address, [11]);

        await expect(
          assetAsGameOwner[
            'safeTransferFrom(address,address,uint256,uint256,bytes)'
          ](GameOwner.address, gameToken.address, assets[0], 11, '0x')
        ).to.be.revertedWith('ERC1155_REJECTED');
      });

      it('fails to add ERC1155 token batch to the game if Operator != GAME contract', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        const assetContract = await ethers.getContract('Asset');
        const assetAsGameOwner = await assetContract.connect(
          ethers.provider.getSigner(GameOwner.address)
        );
        const assets = await supplyAssets(GameOwner.address, [11, 42, 7]);

        await expect(
          assetAsGameOwner.safeBatchTransferFrom(
            GameOwner.address,
            gameToken.address,
            assets,
            [11, 42, 7],
            '0x'
          )
        ).to.be.revertedWith('ERC1155_BATCH_REJECTED');
      });

      it('can mint Games with single Asset', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        const assetContract = await ethers.getContract('Asset');
        const assetContract721 = await ethers.getContract('AssetERC721');

        const assets = await supplyAssets(GameOwner.address, [1]);

        const assets721 = await supplyAssets721(GameOwner.address, 1);

        const asset721Id = assets721[0];

        // ---- ERC1155
        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assets[0]
        );

        // ---- ERC721
        const userOwnerOf721Of1 = await assetContract721['ownerOf(uint256)'](
          asset721Id
        );

        expect(userOwnerOf721Of1).to.be.equal(GameOwner.address);

        gameId = (
          await getNewGame(
            gameToken,
            GameOwner,
            GameOwner,
            assets,
            [1],
            assets721
          )
        ).gameId;

        // ---- ERC1155
        const balanceAfter = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assets[0]
        );

        // ---- ERC721
        const ownerOf721Of1 = await assetContract721['ownerOf(uint256)'](
          asset721Id
        );

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + 1);
        expect(ownerOf721Of1).to.be.equal(gameToken.address);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
      });

      it('can mint Games with many Assets', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        const assetContract1155 = await ethers.getContract('Asset');
        const assetContract721 = await ethers.getContract('AssetERC721');

        const assets = await supplyAssets(GameOwner.address, [3, 2]);

        assetId = assets[0];
        assetId2 = assets[1];

        const assets721 = await supplyAssets721(GameOwner.address, 2);

        const asset721Id = assets721[0];
        const asset721Id2 = assets721[1];

        // ---- ERC1155

        const userBalance1155Of1 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const userBalance1155Of2 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        expect(userBalance1155Of1).to.be.equal(3);
        expect(userBalance1155Of2).to.be.equal(2);

        const balanceBefore1155 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const balanceBefore1155_2 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);

        // ---- ERC721

        const userOwnerOf721Of1 = await assetContract721['ownerOf(uint256)'](
          asset721Id
        );
        const userOwnerOf721Of2 = await assetContract721['ownerOf(uint256)'](
          asset721Id2
        );

        expect(userOwnerOf721Of1).to.be.equal(GameOwner.address);
        expect(userOwnerOf721Of2).to.be.equal(GameOwner.address);

        // ----

        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsAdmin.createGame(
            GameOwner.address,
            GameOwner.address,
            newUpdateAdd1155(
              newUpdateAdd721(update, [asset721Id, asset721Id2]),
              [assetId, assetId2],
              [3, 2]
            ),
            ethers.constants.AddressZero,
            randomId
          )
        );

        // ---- ERC1155

        const balanceAfter1155 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const balanceAfter1155_2 = await assetContract1155[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);

        // ---- ERC721

        const ownerOf721Of1 = await assetContract721['ownerOf(uint256)'](
          asset721Id
        );
        const ownerOf721Of2 = await assetContract721['ownerOf(uint256)'](
          asset721Id2
        );

        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );
        const updateEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'GameTokenUpdated'
        );
        gameId = transferEvent.args[2];
        id = updateEvent.args[1];
        eventAssets = updateEvent.args[2].gameData1155.assetIdsToAdd;
        values = updateEvent.args[2].gameData1155.assetAmountsToAdd;
        const eventAssets721 = updateEvent.args[2].gameData721.assetIdsToAdd;

        const gameStateAfter = await gameToken.getERC1155AssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(3);
        expect(gameStateAfter[1]).to.be.equal(2);

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter1155).to.be.equal(balanceBefore1155 + 3);
        expect(balanceAfter1155_2).to.be.equal(balanceBefore1155_2 + 2);
        expect(ownerOf721Of1).to.be.equal(gameToken.address);
        expect(ownerOf721Of2).to.be.equal(gameToken.address);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
        expect(id).to.be.equal(gameId);
        expect(eventAssets).to.be.eql([assetId, assetId2]);
        expect(values).to.be.eql([BigNumber.from(3), BigNumber.from(2)]);
        expect(eventAssets721).to.be.eql([asset721Id, asset721Id2]);
      });

      it('should fail if length of assetIds and values dont match', async function () {
        ({
          gameToken,
          users,
          GameOwner,
          gameTokenAsAdmin,
        } = await setupTestWithAdminGameMinter());
        const assets = await supplyAssets(GameOwner.address, [3]);

        const assetId = assets[0];
        const randomId = await getRandom();
        await expect(
          waitFor(
            gameTokenAsAdmin.createGame(
              GameOwner.address,
              GameOwner.address,
              newUpdateAdd1155(update, [assetId], [11, 42]),
              ethers.constants.AddressZero,
              randomId
            )
          )
        ).to.be.revertedWith('INVALID_INPUT_LENGTHS');
      });
    });

    describe('GameToken: Modifying GAMEs', function () {
      let gameToken: Contract;
      let GameOwner: User;
      let GameEditor1: User;
      let GameEditor2: User;
      let users: User[];
      let gameId: BigNumber;
      let singleAssetId: BigNumber;
      let assetId: BigNumber;
      let assetId2: BigNumber;
      let assetContract: Contract;
      let gameTokenAsMinter: Contract;

      const mintAssetAndCreateGame = async (
        GameOwner: User,
        user: User,
        gameTokenAsAdmin: Contract,
        assetAmounts?: number[],
        addAssetOnGame?: boolean
      ) => {
        assetContract = await ethers.getContract('Asset');
        const assets = await supplyAssets(
          GameOwner.address,
          assetAmounts ? assetAmounts : [1]
        );
        const hashedUri = utils.keccak256(
          ethers.utils.toUtf8Bytes('Uri is this')
        );
        assetId = assets[0];
        if (assets.length > 1) {
          assetId2 = assets[1];
        }

        const randomId = await getRandom();
        gameTokenAsMinter = gameTokenAsAdmin;
        const assetIdsToAdd1155: BigNumber[] =
          assetAmounts && addAssetOnGame ? assets : [];
        const assetAmountsToAdd1155: number[] =
          assetAmounts && addAssetOnGame ? assetAmounts : [];
        const receipt = await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            newUpdateAdd1155(
              {...update, uri: hashedUri},
              assetIdsToAdd1155,
              assetAmountsToAdd1155
            ),
            user.address,
            randomId
          )
        );
        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );

        gameId = transferEvent.args[2];
        return {receipt, assetId, hashedUri};
      };

      it('should allow the owner to add game editors', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          GameEditor1.address,
          true
        );
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          GameEditor2.address,
          true
        );
        const isEditor1 = await gameToken.isGameEditor(
          GameOwner.address,
          GameEditor1.address
        );
        const isEditor2 = await gameToken.isGameEditor(
          GameOwner.address,
          GameEditor2.address
        );

        expect(isEditor1).to.be.true;
        expect(isEditor2).to.be.true;
      });
      it('should allow the owner to remove game editors', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          GameEditor1.address,
          false
        );
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          GameEditor2.address,
          false
        );
        const isEditor1 = await gameToken.isGameEditor(
          GameOwner.address,
          GameEditor1.address
        );
        const isEditor2 = await gameToken.isGameEditor(
          GameOwner.address,
          GameEditor2.address
        );
        expect(isEditor1).to.be.false;
        expect(isEditor2).to.be.false;
      });

      it('should revert if non-owner trys to set Game Editors', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        const editor = users[1];
        await expect(
          gameToken.setGameEditor(users[1].address, editor.address, false)
        ).to.be.revertedWith('EDITOR_ACCESS_DENIED');
      });

      it('Minter can add single Asset', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        singleAssetId = assetId;
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const uriBefore = await gameToken.tokenURI(gameId);
        const gameStateBefore = await gameToken.getERC1155AssetBalances(
          gameId,
          [singleAssetId]
        );
        const hashedUri = utils.keccak256(toUtf8Bytes('Uri is different now'));

        const receipt = await waitFor(
          gameTokenAsAdmin.updateGame(
            GameOwner.address,
            gameId,
            newUpdateAdd1155({...update, uri: hashedUri}, [singleAssetId], [1])
          )
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'GameTokenUpdated'
        );
        const transferEvents = await findEvents(
          gameToken,
          'Transfer',
          receipt.blockHash
        );
        let newIdFromTransfer;

        if (transferEvents[1].args) {
          newIdFromTransfer = transferEvents[1].args[2];
        }

        gameId = updateEvent.args[1];
        const uriAfter = await gameToken.tokenURI(gameId);
        const gameStateAfter = await gameToken.getERC1155AssetBalances(gameId, [
          singleAssetId,
        ]);

        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const eventAssets = updateEvent.args[2].gameData1155.assetIdsToAdd;
        const values = updateEvent.args[2].gameData1155.assetAmountsToAdd;
        await gameToken.balanceOf(GameOwner.address);

        expect(uriBefore).to.be.equal(
          'ipfs://bafybeifi4cv5sur4aljxzfma65zuemblnsahchn2pnji4h7cso63g3euha/game.json'
        );

        expect(gameStateBefore[0]).to.be.equal(0);
        expect(uriAfter).to.be.equal(
          'ipfs://bafybeidm5kllzr2y3gbos3odrvw4irqla45jbvhiiknn537wlu6tnjhcmq/game.json'
        );
        expect(gameStateAfter[0]).to.be.equal(1);
        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 1);
        expect(newIdFromTransfer).to.be.equal(gameId);
        expect(eventAssets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
      });

      it('should bump the version number in the gameId', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        const idAsHex = utils.hexValue(gameId);
        const creatorSlice = idAsHex.slice(0, 42);

        const randomIdSlice = idAsHex.slice(43, 58);
        const versionSlice = idAsHex.slice(62);
        expect(utils.getAddress(creatorSlice)).to.be.equal(GameOwner.address);
        expect(randomIdSlice).to.not.equal(ethers.constants.AddressZero);
        expect(versionSlice).to.be.equal('0001');
      });

      it('Minter can add multiple Assets', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        const assetContract = await ethers.getContract('Asset');
        const assets = await supplyAssets(GameOwner.address, [7, 42]);

        assetId = assets[0];
        assetId2 = assets[1];

        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const contractBalanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const ownerBalanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        const gameStateBefore = await gameToken.getERC1155AssetBalances(
          gameId,
          [assetId, assetId2]
        );
        expect(gameStateBefore[0]).to.be.equal(0);
        expect(gameStateBefore[1]).to.be.equal(0);

        const assetsAddedReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          newUpdateAdd1155({...update}, [assetId, assetId2], [7, 42])
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetsAddedReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameToken.getERC1155AssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(7);
        expect(gameStateAfter[1]).to.be.equal(42);

        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const contractBalanceAfter2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const ownerBalanceAfter2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        const eventAssets = updateEvent.args[2].gameData1155.assetIdsToAdd;
        const values = updateEvent.args[2].gameData1155.assetAmountsToAdd;
        await gameToken.balanceOf(GameOwner.address);

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 7);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 7);
        expect(ownerBalanceAfter2).to.be.equal(ownerBalanceBefore2 - 42);
        expect(contractBalanceAfter2).to.be.equal(contractBalanceBefore2 + 42);

        expect(eventAssets[0]).to.be.equal(assetId);
        expect(eventAssets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(42);
      });

      it('Minter can remove single Asset', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(
          GameOwner,
          users[10],
          gameTokenAsAdmin,
          [1],
          true
        );

        singleAssetId = assetId;
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const gameStateBefore = await gameToken.getERC1155AssetBalances(
          gameId,
          [singleAssetId]
        );
        expect(gameStateBefore[0]).to.be.equal(1);

        const assetRemovalReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          newUpdateRemove1155({...update}, [singleAssetId], [1])
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameToken.getERC1155AssetBalances(gameId, [
          singleAssetId,
        ]);
        expect(gameStateAfter[0]).to.be.equal(0);

        const eventAssets = updateEvent.args[2].gameData1155.assetIdsToRemove;
        const values = updateEvent.args[2].gameData1155.assetAmountsToRemove;
        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore - 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore + 1);
        expect(eventAssets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
      });

      it('fails when removing more assets than the game contains', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        await expect(
          gameTokenAsMinter.updateGame(
            GameOwner.address,
            gameId,
            newUpdateRemove1155(
              {...update},
              [
                assetId,
                assetId.add(BigNumber.from(1)),
                assetId.add(BigNumber.from(1)),
              ],
              [25, 31, 2]
            )
          )
        ).to.be.revertedWith('INVALID_ASSET_REMOVAL');
      });

      it('Minter can remove multiple Assets', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(
          GameOwner,
          users[10],
          gameTokenAsAdmin,
          [7, 42],
          true
        );

        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const contractBalance2Before = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const ownerBalance2Before = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        const gameTokenAsGameOwner = await gameToken.connect(
          ethers.provider.getSigner(GameOwner.address)
        );

        const gameStateBefore = await gameTokenAsGameOwner.getERC1155AssetBalances(
          gameId,
          [assetId, assetId2]
        );
        expect(gameStateBefore[0]).to.be.equal(7);
        expect(gameStateBefore[1]).to.be.equal(42);

        const assetRemovalReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          newUpdateRemove1155({...update}, [assetId, assetId2], [7, 31])
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameTokenAsGameOwner.getERC1155AssetBalances(
          gameId,
          [assetId, assetId2]
        );
        expect(gameStateAfter[0]).to.be.equal(0);
        expect(gameStateAfter[1]).to.be.equal(11);

        const eventAssets = updateEvent.args[2].gameData1155.assetIdsToRemove;
        const values = updateEvent.args[2].gameData1155.assetAmountsToRemove;

        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const contractBalance2After = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const ownerBalance2After = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore - 7);
        expect(contractBalance2After).to.be.equal(contractBalance2Before - 31);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore + 7);
        expect(ownerBalance2After).to.be.equal(ownerBalance2Before + 31);
        expect(eventAssets[0]).to.be.equal(assetId);
        expect(eventAssets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(31);
      });

      it('Game token should acurately track token balances for owners', async function () {
        ({
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTestWithAdminGameMinter());

        await mintAssetAndCreateGame(GameOwner, users[10], gameTokenAsAdmin);

        const gameTokenBalanceWith1Games: number = await gameToken.balanceOf(
          GameOwner.address
        );
        expect(gameTokenBalanceWith1Games).to.be.equal(1);

        const randomId = await getRandom();
        await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            {...update},
            ethers.constants.AddressZero,
            randomId
          )
        );

        const gameTokenBalanceWith2Games: number = await gameToken.balanceOf(
          GameOwner.address
        );
        expect(gameTokenBalanceWith2Games).to.be.equal(2);
      });
    });
  });

  describe('GameToken: Transferring GAMEs', function () {
    let gameToken: Contract;
    let users: User[];
    let GameOwner: User;
    let gameTokenAsAdmin: Contract;

    it('current owner can transfer ownership of a GAME', async function () {
      ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );
      const originalOwner = await gameToken.ownerOf(gameId);
      const recipient = users[7].address;
      const gameTokenAsGameOwner = await gameToken.connect(
        ethers.provider.getSigner(GameOwner.address)
      );
      await waitFor(
        gameTokenAsGameOwner['safeTransferFrom(address,address,uint256)'](
          originalOwner,
          recipient,
          gameId
        )
      );
      const newOwner = await gameToken.ownerOf(gameId);
      expect(newOwner).to.be.equal(recipient);
    });

    it('can transfer creatorship of a GAME', async function () {
      ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );
      const others = await getUnnamedAccounts();

      await GameOwner.Game.transferCreatorship(
        gameId,
        GameOwner.address,
        others[3]
      );

      const creatorAfter = await gameToken.creatorOf(gameId);
      expect(creatorAfter).to.equal(others[3]);
    });

    it('transfer creatorship should revert for a non existing game', async function () {
      ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

      const others = await getUnnamedAccounts();

      await expect(
        GameOwner.Game.transferCreatorship(3028, GameOwner.address, others[3])
      ).to.be.revertedWith('NONEXISTENT_TOKEN');
    });

    it('can transfer creatorship of a GAME back to original creator', async function () {
      ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );

      const others = await getUnnamedAccounts();
      const creatorBefore = await gameToken.creatorOf(gameId);

      const gameTokenAsCreator = await gameToken.connect(
        await ethers.provider.getSigner(creatorBefore)
      );
      await gameTokenAsCreator.transferCreatorship(
        gameId,
        creatorBefore,
        others[1]
      );

      const gameTokenAsOther = await gameToken.connect(
        await ethers.provider.getSigner(others[1])
      );

      await gameTokenAsOther.transferCreatorship(
        gameId,
        others[1],
        creatorBefore
      );
      const creatorAfter = await gameToken.creatorOf(gameId);
      expect(creatorAfter).to.equal(creatorBefore);
    });

    it('should fail if non-owner trys to transfer a GAME', async function () {
      ({
        gameToken,
        gameTokenAsAdmin,
        users,
        GameOwner,
      } = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );

      const originalOwner = await gameTokenAsAdmin.ownerOf(gameId);
      await expect(
        gameTokenAsAdmin['safeTransferFrom(address,address,uint256)'](
          originalOwner,
          users[10].address,
          gameId
        )
      ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
    });

    it('transfer creatorship should revert for a burned game', async function () {
      ({
        gameToken,
        gameTokenAsAdmin,
        users,
        GameOwner,
      } = await setupTestWithAdminGameMinter());

      const assets = await supplyAssets(GameOwner.address, [1]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        [assets[0]],
        [1]
      );

      const others = await getUnnamedAccounts();
      await GameOwner.Game.burn(gameId);
      await expect(
        GameOwner.Game.transferCreatorship(gameId, GameOwner.address, others[3])
      ).to.be.revertedWith('NONEXISTENT_TOKEN');
    });
  });

  describe('GameToken: MetaData', function () {
    let gameToken: Contract;
    let gameTokenAsAdmin: Contract;
    let gameTokenAsMinter: Contract;
    let gameId: BigNumber;
    let GameOwner: User;
    let GameEditor1: User;

    before(async function () {
      await setUpBefore();
      ({
        gameToken,
        GameOwner,
        GameEditor1,
        gameTokenAsAdmin,
      } = await setupTest());
      const randomId = await getRandom();
      const {gameTokenAdmin} = await getNamedAccounts();
      await gameTokenAsAdmin.changeMinter(gameTokenAdmin);
      gameTokenAsMinter = await gameToken.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );

      const receipt = await waitFor(
        gameTokenAsMinter.createGame(
          GameOwner.address,
          GameOwner.address,
          {...update, uri: utils.keccak256(toUtf8Bytes('Hello Sandbox'))},
          ethers.constants.AddressZero,
          randomId
        )
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'Transfer'
      );
      gameId = transferEvent.args[2];

      await GameOwner.Game.setGameEditor(
        GameOwner.address,
        GameEditor1.address,
        true
      );
    });

    it('can get the ERC721 token contract name', async function () {
      const name = await gameToken.name();
      expect(name).to.be.equal('The Sandbox: GAME token');
    });

    it('can get the ERC721 token contract symbol', async function () {
      const symbol = await gameToken.symbol();
      expect(symbol).to.be.equal('GAME');
    });

    it('can get the tokenURI', async function () {
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal(
        'ipfs://bafybeih3z54v2d44nlci7gcha5edbu7johlt34mz2b3usdtpfwtvn3tsfa/game.json'
      );
    });

    it('Minter can set the tokenURI', async function () {
      const receipt = await gameTokenAsMinter.updateGame(
        GameOwner.address,
        gameId,
        {...update, uri: utils.keccak256(toUtf8Bytes('This is new.'))}
      );
      const updateEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'GameTokenUpdated'
      );
      gameId = updateEvent.args[1];
      expect(updateEvent.args[2].uri).to.be.equal(
        utils.keccak256(toUtf8Bytes('This is new.'))
      );

      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal(
        'ipfs://bafybeibjjuirh6mb3gq36smqasbpz5vxf2ftxs2ezydxiauwkezw5abaqy/game.json'
      );
    });

    it('should revert if ownerOf == address(0)', async function () {
      const {gameToken} = await setupTest();
      await expect(gameToken.tokenURI(11)).to.be.revertedWith(
        'BURNED_OR_NEVER_MINTED'
      );
    });

    it('should revert if not Minter', async function () {
      const {gameToken} = await setupTest();
      await expect(
        gameToken.updateGame(GameOwner.address, 11, {
          ...update,
          uri: utils.keccak256(toUtf8Bytes('New URI')),
        })
      ).to.be.revertedWith('MINTER_ACCESS_DENIED');
    });

    it('should be able to retrieve the creator address from the gameId', async function () {
      const creator = await gameToken.creatorOf(gameId);
      expect(creator).to.be.equal(GameOwner.address);
    });
  });

  describe('GameToken: Destroying Games', function () {
    let gameToken: Contract;
    let GameOwner: User;
    let users: User[];
    let gameId: BigNumber;
    let assets: BigNumber[];
    let assets721: BigNumber[];

    const setUpAndMint = async () => {
      ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

      assets = await supplyAssets(GameOwner.address, [7, 11]);

      const {gameId} = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        assets,
        [7, 11]
      );
      return {gameId, GameOwner, gameToken};
    };

    it('fails if "from" != game owner', async function () {
      const {gameId, GameOwner, gameToken} = await setUpAndMint();

      await expect(
        GameOwner.Game.burnFrom(gameToken.address, gameId)
      ).to.be.revertedWith('NOT_OWNER');
    });

    it('fails if sender != game owner and not metatx', async function () {
      const {gameId, gameToken} = await setUpAndMint();

      const gameAsOther = await gameToken.connect(
        ethers.provider.getSigner(users[6].address)
      );
      await expect(
        gameAsOther.burnFrom(gameToken.address, gameId)
      ).to.be.revertedWith('UNAUTHORIZED_BURN');
    });

    describe('GameToken: burnAndRecover', function () {
      it('fails if "to" == address(0)', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        await expect(
          GameOwner.Game.burnAndRecover(
            GameOwner.address,
            ethers.constants.AddressZero,
            gameId,
            [],
            []
          )
        ).to.be.revertedWith('DESTINATION_ZERO_ADDRESS');
      });

      it('fails to destroy if "to" == Game Token contract', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        await expect(
          GameOwner.Game.burnAndRecover(
            GameOwner.address,
            gameToken.address,
            gameId,
            [],
            []
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('fails if "from" != game owner', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        await expect(
          GameOwner.Game.burnAndRecover(
            gameToken.address,
            GameOwner.address,
            gameId,
            [],
            []
          )
        ).to.be.revertedWith('NOT_OWNER');
      });

      it('fails if sender != game owner and not metatx', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        const gameAsOther = await gameToken.connect(
          ethers.provider.getSigner(users[6].address)
        );
        await expect(
          gameAsOther.burnAndRecover(
            gameToken.address,
            GameOwner.address,
            gameId,
            [],
            []
          )
        ).to.be.revertedWith('UNAUTHORIZED_BURN');
      });

      it('can destroy GAME and recover assets in 1 tx if not too many assets', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        const assetContract = await ethers.getContract('Asset');

        const balancesBefore = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceBefore = balancesBefore[0];
        const ownerBalanceBefore2 = balancesBefore[1];
        const contractBalanceBefore = balancesBefore[2];
        const contractBalanceBefore2 = balancesBefore[3];

        expect(ownerBalanceBefore).to.be.equal(0);
        expect(ownerBalanceBefore2).to.be.equal(0);
        expect(contractBalanceBefore).to.be.equal(7);
        expect(contractBalanceBefore2).to.be.equal(11);

        await GameOwner.Game.burnAndRecover(
          GameOwner.address,
          GameOwner.address,
          gameId,
          assets,
          []
        );

        const balancesAfter = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceAfter = balancesAfter[0];
        const ownerBalanceAfter2 = balancesAfter[1];
        const contractBalanceAfter = balancesAfter[2];
        const contractBalanceAfter2 = balancesAfter[3];

        expect(ownerBalanceAfter).to.be.equal(7);
        expect(ownerBalanceAfter2).to.be.equal(11);
        expect(contractBalanceAfter).to.be.equal(0);
        expect(contractBalanceAfter2).to.be.equal(0);
      });

      it('creatorOf() should should still return original creator', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        const gameCreator = await gameToken.creatorOf(gameId);
        expect(gameCreator).to.be.equal(GameOwner.address);
      });

      it('game should no longer exist', async function () {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());

        assets = await supplyAssets(GameOwner.address, [7, 11]);

        const {gameId} = await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
        );

        await GameOwner.Game.burnAndRecover(
          GameOwner.address,
          GameOwner.address,
          gameId,
          assets,
          []
        );

        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'NONEXISTANT_TOKEN'
        );
      });
    });

    describe('GameToken: Destroy... then Recover', function () {
      const setUpAndMint = async () => {
        ({gameToken, users, GameOwner} = await setupTestWithAdminGameMinter());
        assets = await supplyAssets(GameOwner.address, [7, 11]);
        assets721 = await supplyAssets721(GameOwner.address, 2);

        gameId = (
          await getNewGame(
            gameToken,
            GameOwner,
            GameOwner,
            assets,
            [7, 11],
            assets721
          )
        ).gameId;
      };

      it('fails to recover if the GAME token has not been burnt', async function () {
        await setUpAndMint();
        await expect(
          GameOwner.Game.recoverAssets(
            GameOwner.address,
            GameOwner.address,
            gameId,
            [assets[0]],
            []
          )
        ).to.be.revertedWith('ONLY_FROM_BURNED_TOKEN');
      });

      it('can destroy without transfer of assets', async function () {
        await setUpAndMint();
        const assetContract = await ethers.getContract('Asset');
        const balancesBefore = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceBefore = balancesBefore[0];
        const ownerBalanceBefore2 = balancesBefore[1];
        const contractBalanceBefore = balancesBefore[2];
        const contractBalanceBefore2 = balancesBefore[3];

        expect(ownerBalanceBefore).to.be.equal(0);
        expect(ownerBalanceBefore2).to.be.equal(0);
        expect(contractBalanceBefore).to.be.equal(7);
        expect(contractBalanceBefore2).to.be.equal(11);

        await GameOwner.Game.burn(gameId);

        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'NONEXISTANT_TOKEN'
        );

        const balancesAfter = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceAfter = balancesAfter[0];
        const ownerBalanceAfter2 = balancesAfter[1];
        const contractBalanceAfter = balancesAfter[2];
        const contractBalanceAfter2 = balancesAfter[3];

        expect(ownerBalanceAfter).to.be.equal(0);
        expect(ownerBalanceAfter2).to.be.equal(0);
        expect(contractBalanceAfter).to.be.equal(7);
        expect(contractBalanceAfter2).to.be.equal(11);
      });

      it('fails to recover if "to" address is the gameToken contract', async function () {
        await setUpAndMint();
        await expect(
          GameOwner.Game.recoverAssets(
            GameOwner.address,
            gameToken.address,
            gameId,
            [assets[0]],
            []
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('fails to recover assets if caller is not from or validMetaTx', async function () {
        await setUpAndMint();
        const gameAsOther = await gameToken.connect(
          ethers.provider.getSigner(users[6].address)
        );

        await GameOwner.Game.burn(gameId);

        await expect(
          gameAsOther.recoverAssets(
            GameOwner.address,
            GameOwner.address,
            gameId,
            [assets[0]],
            []
          )
        ).to.be.revertedWith('INVALID_RECOVERY');
      });

      it('can recover remaining assets from burnt GAME in batches', async function () {
        await setUpAndMint();
        const assetContract = await ethers.getContract('Asset');
        const assetContract721 = await ethers.getContract('AssetERC721');

        await GameOwner.Game.burn(gameId);

        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'NONEXISTANT_TOKEN'
        );

        await GameOwner.Game.recoverAssets(
          GameOwner.address,
          GameOwner.address,
          gameId,
          [assets[0]],
          [assets721[0]]
        );

        // ---- ERC1155

        const balancesAfter = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceAfter = balancesAfter[0];
        const ownerBalanceAfter2 = balancesAfter[1];
        const contractBalanceAfter = balancesAfter[2];
        const contractBalanceAfter2 = balancesAfter[3];

        expect(ownerBalanceAfter).to.be.equal(7);
        expect(ownerBalanceAfter2).to.be.equal(0);
        expect(contractBalanceAfter).to.be.equal(0);
        expect(contractBalanceAfter2).to.be.equal(11);

        // ---- ERC721

        const ownerBefore721Of1 = await assetContract721['ownerOf(uint256)'](
          assets721[0]
        );
        const ownerBefore721Of2 = await assetContract721['ownerOf(uint256)'](
          assets721[1]
        );

        expect(ownerBefore721Of1).to.be.equal(GameOwner.address);
        expect(ownerBefore721Of2).to.be.equal(gameToken.address);

        await GameOwner.Game.recoverAssets(
          GameOwner.address,
          GameOwner.address,
          gameId,
          [assets[1]],
          [assets721[1]]
        );

        // ---- ERC1155

        const balancesFinal = await getBalances(
          assetContract,
          [GameOwner.address, gameToken.address],
          assets
        );

        const ownerBalanceFinal = balancesFinal[0];
        const ownerBalanceFinal2 = balancesFinal[1];
        const contractBalanceFinal = balancesFinal[2];
        const contractBalanceFinal2 = balancesFinal[3];

        expect(ownerBalanceFinal).to.be.equal(7);
        expect(ownerBalanceFinal2).to.be.equal(11);
        expect(contractBalanceFinal).to.be.equal(0);
        expect(contractBalanceFinal2).to.be.equal(0);

        // ---- ERC721

        const ownerAfter721Of1 = await assetContract721['ownerOf(uint256)'](
          assets721[0]
        );
        const ownerAfter721Of2 = await assetContract721['ownerOf(uint256)'](
          assets721[1]
        );

        expect(ownerAfter721Of1).to.be.equal(GameOwner.address);
        expect(ownerAfter721Of2).to.be.equal(GameOwner.address);
      });
    });
  });

  describe('GameToken: Token Immutability', function () {
    let gameToken: Contract;
    let gameTokenAsMinter: Contract;
    let gameTokenAsAdmin: Contract;
    let GameOwner: User;
    let users: User[];
    let gameId: BigNumber;
    let randomId: number;
    let updatedGameId: BigNumber;
    let assets: BigNumber[];
    let gameAssetsWithOldId: BigNumber[];

    before(async function () {
      await setUpBefore();
      ({gameToken, gameTokenAsAdmin, users, GameOwner} = await setupTest());
      const {gameTokenAdmin} = await getNamedAccounts();
      await gameTokenAsAdmin.changeMinter(gameTokenAdmin);
      assets = await supplyAssets(GameOwner.address, [7, 11]);
      const newGame = await getNewGame(
        gameToken,
        GameOwner,
        GameOwner,
        assets,
        [7, 11]
      );

      gameId = newGame.gameId;
      randomId = newGame.randomId;

      gameTokenAsMinter = await gameToken.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );
    });

    it('should store the creator address, subID & version in the gameId', async function () {
      const idAsHex = utils.hexValue(gameId);
      const creator = idAsHex.slice(0, 42);
      const SUBID_MULTIPLIER = BigNumber.from(2).pow(BigNumber.from(256 - 224));
      const subId = gameId.div(SUBID_MULTIPLIER).mask(64).toHexString();
      const version = idAsHex.slice(62);

      expect(utils.getAddress(creator)).to.be.equal(users[0].address);
      expect(subId).to.be.equal(BigNumber.from(randomId).toHexString());
      expect(version).to.be.equal('0001');
    });

    it('should consider future versions of gameIds as invalid', async function () {
      const futureIdVersion = gameId.add(42);
      await expect(gameToken.ownerOf(futureIdVersion)).to.be.revertedWith(
        'NONEXISTANT_TOKEN'
      );
    });

    it('should update version when changes are made', async function () {
      let idAsHex = utils.hexValue(gameId);
      const versionBefore = idAsHex.slice(62);
      expect(versionBefore).to.be.equal('0001');

      gameAssetsWithOldId = await gameToken.getERC1155AssetBalances(
        gameId,
        assets
      );
      const receipt = await gameTokenAsMinter.updateGame(
        GameOwner.address,
        gameId,
        {...update, uri: utils.keccak256(toUtf8Bytes('Changing URI'))}
      );
      const updateEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'GameTokenUpdated'
      );
      updatedGameId = updateEvent.args[1];
      idAsHex = utils.hexValue(updatedGameId);
      const versionAfter = idAsHex.slice(62);
      expect(versionAfter).to.be.equal('0002');
    });

    it('should use baseId (creator address + subId) to map to game Assets  ', async function () {
      const gameAssetsWithUpdatedId = await gameToken.getERC1155AssetBalances(
        updatedGameId,
        assets
      );
      expect(gameAssetsWithOldId).to.deep.equal(gameAssetsWithUpdatedId);
    });
  });

  describe('GameToken: MetaTransactions', function () {
    let trustedForwarder: Contract;
    let gameId: BigNumber;
    let users: User[];
    let sandContract: Contract;
    let sandAsAdmin: Contract;
    let gameToken: Contract;
    let assetContract: Contract;
    let assetContract721: Contract;
    let GameOwner: User;
    let assets: BigNumber[];
    let assets721: BigNumber[];

    const setUpAndMint = async () => {
      ({
        gameToken,
        users,
        GameOwner,
        trustedForwarder,
      } = await setupTestWithAdminGameMinter());
      const {sandAdmin} = await getNamedAccounts();

      sandContract = await ethers.getContract('Sand');
      assetContract = await ethers.getContract('Asset');
      assetContract721 = await ethers.getContract('AssetERC721');

      sandAsAdmin = await sandContract.connect(
        ethers.provider.getSigner(sandAdmin)
      );
      await sandAsAdmin.setSuperOperator(gameToken.address, true);

      assets = await supplyAssets(GameOwner.address, [5, 7]);
      assets721 = await supplyAssets721(GameOwner.address, 12);
      gameId = (
        await getNewGame(
          gameToken,
          GameOwner,
          GameOwner,
          assets,
          [5, 7],
          assets721
        )
      ).gameId;
    };

    it('can get isTrustedForwarder', async function () {
      await setUpAndMint();
      const isTrustedForwarder = await gameToken.isTrustedForwarder(
        trustedForwarder.address
      );
      expect(isTrustedForwarder).to.be.true;
    });

    it('can call setGameEditor via metaTx', async function () {
      await setUpAndMint();
      const {to, data} = await gameToken.populateTransaction.setGameEditor(
        GameOwner.address,
        users[1].address,
        true
      );

      await sendMetaTx(to, trustedForwarder, data, GameOwner.address);

      expect(
        await gameToken.isGameEditor(GameOwner.address, users[1].address)
      ).to.be.equal(true);
    });

    it('can call burnFrom via metaTx', async function () {
      await setUpAndMint();

      const {to, data} = await gameToken.populateTransaction.burnFrom(
        GameOwner.address,
        gameId
      );

      await sendMetaTx(to, trustedForwarder, data, GameOwner.address);

      expect(await gameToken.creatorOf(gameId)).to.be.equal(GameOwner.address);
      await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
        'NONEXISTANT_TOKEN'
      );
    });

    it('can call recoverAssets via metaTx', async function () {
      await setUpAndMint();

      // ---- ERC1155

      const balancesBefore = await getBalances(
        assetContract,
        [GameOwner.address, gameToken.address],
        assets
      );
      const ownerBalanceBefore = balancesBefore[0];
      const ownerBalanceBefore2 = balancesBefore[1];
      const contractBalanceBefore = balancesBefore[2];
      const contractBalanceBefore2 = balancesBefore[3];

      expect(ownerBalanceBefore).to.be.equal(0);
      expect(ownerBalanceBefore2).to.be.equal(0);
      expect(contractBalanceBefore).to.be.equal(5);
      expect(contractBalanceBefore2).to.be.equal(7);

      // ---- ERC721

      const ownerBefore721Of1 = await assetContract721['ownerOf(uint256)'](
        assets721[0]
      );
      const ownerBefore721Of2 = await assetContract721['ownerOf(uint256)'](
        assets721[1]
      );

      expect(ownerBefore721Of1).to.be.equal(gameToken.address);
      expect(ownerBefore721Of2).to.be.equal(gameToken.address);

      const burn = await gameToken.populateTransaction.burnFrom(
        GameOwner.address,
        gameId
      );

      await sendMetaTx(burn.to, trustedForwarder, burn.data, GameOwner.address);

      const {to, data} = await GameOwner.Game.populateTransaction.recoverAssets(
        GameOwner.address,
        GameOwner.address,
        gameId,
        assets,
        assets721
      );

      await sendMetaTx(
        to,
        trustedForwarder,
        data,
        GameOwner.address,
        '10000000'
      );

      // ---- ERC1155

      const balancesAfter = await getBalances(
        assetContract,
        [GameOwner.address, gameToken.address],
        assets
      );

      const ownerBalanceAfter = balancesAfter[0];
      const ownerBalanceAfter2 = balancesAfter[1];
      const contractBalanceAfter = balancesAfter[2];
      const contractBalanceAfter2 = balancesAfter[3];

      expect(ownerBalanceAfter).to.be.equal(5);
      expect(ownerBalanceAfter2).to.be.equal(7);
      expect(contractBalanceAfter).to.be.equal(0);
      expect(contractBalanceAfter2).to.be.equal(0);

      // ---- ERC721

      const ownerAfter721Of1 = await assetContract721['ownerOf(uint256)'](
        assets721[0]
      );
      const ownerAfter721Of2 = await assetContract721['ownerOf(uint256)'](
        assets721[1]
      );

      expect(ownerAfter721Of1).to.be.equal(GameOwner.address);
      expect(ownerAfter721Of2).to.be.equal(GameOwner.address);
    });

    it('can call transferCreatorship via metaTx', async function () {
      await setUpAndMint();

      const {
        to,
        data,
      } = await gameToken.populateTransaction.transferCreatorship(
        gameId,
        GameOwner.address,
        users[2].address
      );

      await sendMetaTx(to, trustedForwarder, data, GameOwner.address);
      const currentCreator = await gameToken.creatorOf(gameId);
      expect(currentCreator).to.be.equal(users[2].address);
    });
  });
});
