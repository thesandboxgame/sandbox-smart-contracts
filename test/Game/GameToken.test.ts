import {ethers, getNamedAccounts} from 'hardhat';
import {expect} from '../chai-setup';
import {BigNumber, utils, Contract} from 'ethers';
import {Receipt} from 'hardhat-deploy/types';
import {
  waitFor,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
} from '../utils';
import {setupTest, User} from './fixtures';
import {supplyAssets} from './assets';

let id: BigNumber;

const dummyHash =
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
const dummyHash2 =
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE';
const dummyHash3 =
  '0xAAAAAAAFFFFFFFFFFFFFFFFFFFFFFFEEEEEEEEEEEEEEEEEEEEEEEEEEEAAAAAAA';
const packId = 0;
const packId2 = 1;
const packId3 = 2;

describe('GameToken', function () {
  before(async function () {
    const {assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts();
    const {GameOwner} = await setupTest();
    const assetReceipt = await supplyAssets(
      GameOwner.address,
      packId,
      GameOwner.address,
      1,
      dummyHash
    );
    const assetContract = await ethers.getContract('Asset');

    const transferEvent = await expectEventWithArgsFromReceipt(
      assetContract,
      assetReceipt,
      'Transfer'
    );
    id = transferEvent.args[2];
  });

  describe('GameToken: Minting GAMEs', function () {
    describe('GameToken: Mint Without Assets', function () {
      describe('GameToken: With Minter', function () {
        let gameToken: Contract;
        let gameTokenAsAdmin: Contract;
        let users: User[];

        before(async function () {
          ({gameToken, gameTokenAsAdmin, users} = await setupTest());
        });

        it('minter can create GAMEs when _minter is set', async function () {
          await gameTokenAsAdmin.setMinter(users[3].address);
          const Minter = users[3];
          const minterReceipt = Minter.Game.createGame(
            users[3].address,
            users[4].address,
            [],
            [],
            []
          );
          const transferEvent = await expectEventWithArgs(
            gameToken,
            minterReceipt,
            'Transfer'
          );
          const minterGameId = transferEvent.args[2];
          const gameOwner = transferEvent.args[1];

          expect(await gameToken.ownerOf(minterGameId)).to.be.equal(
            users[4].address
          );
          expect(gameOwner).to.be.equal(users[4].address);
        });

        it('reverts if non-minter trys to mint Game when _minter set', async function () {
          await expect(
            gameToken.createGame(users[2].address, users[2].address, [], [], [])
          ).to.be.revertedWith('INVALID_MINTER');
        });
      });

      describe('GameToken: No Minter', function () {
        let gameToken: Contract;
        let GameOwner: User;
        let gameId: BigNumber;
        let GameEditor1: User;
        let GameEditor2: User;

        it('anyone can mint Games with no Assets', async function () {
          ({
            gameToken,
            GameOwner,
            GameEditor1,
            GameEditor2,
          } = await setupTest());
          const receipt = await waitFor(
            GameOwner.Game.createGame(
              GameOwner.address,
              GameOwner.address,
              [],
              [],
              []
            )
          );
          const transferEvent = await expectEventWithArgs(
            gameToken,
            receipt,
            'Transfer'
          );
          const assetsAddedEvent = await expectEventWithArgs(
            gameToken,
            receipt,
            'AssetsAdded'
          );
          gameId = transferEvent.args[2];
          const eventGameOwner = transferEvent.args[1];
          const assets = assetsAddedEvent.args[1];
          const contractGameOwner = await gameToken.ownerOf(gameId);
          const [gameAssets, quantities] = await gameToken.getGameAssets(
            gameId
          );

          expect(gameAssets[0]).to.be.equal(['0x00']);
          expect(quantities[0]).to.be.equal(['0x00']);
          expect(assets).to.eql([]);
          expect(eventGameOwner).to.be.equal(GameOwner.address);
          expect(contractGameOwner).to.be.equal(GameOwner.address);
          expect(contractGameOwner).to.be.equal(eventGameOwner);
        });

        it('fails to get GAME data when no assets', async function () {
          const [gameAssets, quantities] = await gameToken.getGameAssets(
            gameId
          );
          expect(gameAssets[0]).to.be.equal('0x00');
          expect(quantities[0]).to.be.equal('0x00');
        });

        it('anyone can mint Games with Editors', async function () {
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
          const transferEvent = await expectEventWithArgs(
            gameToken,
            receipt,
            'Transfer'
          );

          gameId = transferEvent.args[2];
          const isEditor1 = await gameToken.isGameEditor(
            gameId,
            GameEditor1.address
          );
          const isEditor2 = await gameToken.isGameEditor(
            gameId,
            GameEditor2.address
          );

          expect(isEditor1).to.be.true;
          expect(isEditor2).to.be.true;
        });

        it('gameId contains creator address', async function () {
          const idAsHex = utils.hexValue(gameId);
          const slicedId = idAsHex.slice(0, 42);
          const secondSlice = idAsHex.slice(65);
          expect(utils.getAddress(slicedId)).to.be.equal(GameOwner.address);
          expect(secondSlice).to.be.equal(String(1));
        });
      });
    });
    describe('GameToken: Mint With Assets', function () {
      let assetId: BigNumber;
      let assetId2: BigNumber;
      let gameId: BigNumber;
      let assets: BigNumber[];
      let values: BigNumber[];
      let gameToken: Contract;
      let GameOwner: User;
      it('anyone can mint Games with single Asset', async function () {
        ({gameToken, GameOwner} = await setupTest());
        const assetReceipt = await supplyAssets(
          GameOwner.address,
          packId,
          GameOwner.address,
          1,
          dummyHash
        );
        const assetContract = await ethers.getContract('Asset');
        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'Transfer'
        );
        const assetId: BigNumber = assetTransferEvent.args[2];
        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          id
        );
        const assetAsAssetOwner = await assetContract.connect(
          ethers.provider.getSigner(GameOwner.address)
        );
        await waitFor(
          assetAsAssetOwner.setApprovalForAllFor(
            GameOwner.address,
            gameToken.address,
            true
          )
        );
        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId],
            [1],
            []
          )
        );
        const balanceAfter = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId
        );

        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );
        gameId = transferEvent.args[2];
        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + 1);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
      });

      it('anyone can mint Games with many Assets', async function () {
        const {gameToken, GameOwner} = await setupTest();
        const assetContract = await ethers.getContract('Asset');
        let assetReceipt: Receipt;
        assetReceipt = await supplyAssets(
          GameOwner.address,
          packId,
          GameOwner.address,
          3,
          dummyHash
        );
        const assetReceipt1 = assetReceipt;
        assetReceipt = await supplyAssets(
          GameOwner.address,
          packId2,
          GameOwner.address,
          2,
          dummyHash2
        );
        const assetReceipt2 = assetReceipt;
        9;

        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt1,
          'TransferSingle'
        );
        const assetTransferEvent2 = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt2,
          'TransferSingle'
        );

        assetId = assetTransferEvent.args[3];
        assetId2 = assetTransferEvent2.args[3];

        const userBalanceOf1 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const userBalanceOf2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        expect(userBalanceOf1).to.be.equal(3);
        expect(userBalanceOf2).to.be.equal(2);

        const quantity = assetTransferEvent.args[4];
        const quantity2 = assetTransferEvent2.args[4];

        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId
        );
        const balanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);

        const assetAsAssetOwner = await assetContract.connect(
          ethers.provider.getSigner(GameOwner.address)
        );
        await waitFor(
          assetAsAssetOwner.setApprovalForAllFor(
            GameOwner.address,
            gameToken.address,
            true
          )
        );

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId, assetId2],
            [quantity, quantity2],
            []
          )
        );

        const balanceAfter = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId
        );
        const balanceAfter2 = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId2
        );

        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );
        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'AssetsAdded'
        );
        gameId = transferEvent.args[2];
        id = assetsAddedEvent.args[0];
        assets = assetsAddedEvent.args[1];
        values = assetsAddedEvent.args[2];

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

      it('can get the number of assets', async function () {
        const number = await gameToken.getNumberOfAssets(gameId);
        expect(number).to.be.equal(2);
      });

      it('can get all assets at once from a game', async function () {
        const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
        expect(gameAssets[0]).to.be.equal(assetId);
        expect(gameAssets[1]).to.be.equal(assetId2);
        expect(quantities[0]).to.be.equal(3);
        expect(quantities[1]).to.be.equal(2);
      });

      it('should fail if length of assetIds and values dont match', async function () {
        const assetContract = await ethers.getContract('Asset');
        const assetReceipt = await supplyAssets(
          GameOwner.address,
          7,
          GameOwner.address,
          3,
          dummyHash
        );
        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'TransferSingle'
        );

        const assetId = assetTransferEvent.args[3];
        await expect(
          waitFor(
            GameOwner.Game.createGame(
              GameOwner.address,
              GameOwner.address,
              [assetId],
              [11, 42],
              []
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

      before(async function () {
        ({
          gameToken,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTest());
        assetContract = await ethers.getContract('Asset');
        const assetReceipt = await supplyAssets(
          GameOwner.address,
          packId,
          GameOwner.address,
          1,
          dummyHash
        );
        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'Transfer'
        );

        assetId = assetTransferEvent.args[2];
        const assetAsAssetOwner = await assetContract.connect(
          ethers.provider.getSigner(GameOwner.address)
        );
        await waitFor(
          assetAsAssetOwner.setApprovalForAllFor(
            GameOwner.address,
            gameToken.address,
            true
          )
        );
        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            []
          )
        );
        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );

        gameId = transferEvent.args[2];
      });

      it('should allow the owner to add game editors', async function () {
        await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
        await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, true);
        const isEditor1 = await gameToken.isGameEditor(
          gameId,
          GameEditor1.address
        );
        const isEditor2 = await gameToken.isGameEditor(
          gameId,
          GameEditor2.address
        );

        expect(isEditor1).to.be.true;
        expect(isEditor2).to.be.true;
      });
      it('should allow the owner to remove game editors', async function () {
        await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, false);
        await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, false);
        const isEditor1 = await gameToken.isGameEditor(
          gameId,
          GameEditor1.address
        );
        const isEditor2 = await gameToken.isGameEditor(
          gameId,
          GameEditor2.address
        );
        expect(isEditor1).to.be.false;
        expect(isEditor2).to.be.false;
      });

      it('should revert if non-owner trys to set Game Editors', async function () {
        const editor = users[1];
        await expect(
          gameToken.setGameEditor(42, editor.address, false)
        ).to.be.revertedWith('EDITOR_ACCESS_DENIED');
      });

      it('Owner can add single Asset', async function () {
        const assetContract = await ethers.getContract('Asset');
        const assetReceipt = await supplyAssets(
          GameOwner.address,
          11,
          GameOwner.address,
          1,
          dummyHash
        );
        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'Transfer'
        );
        singleAssetId = assetTransferEvent.args[2];
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);
        const numberBefore = await gameToken.getNumberOfAssets(gameId);
        expect(numberBefore).to.be.equal(0);

        const receipt = await waitFor(
          GameOwner.Game.addSingleAsset(
            GameOwner.address,
            gameId,
            singleAssetId
          )
        );
        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);
        const numberAfter = await gameToken.getNumberOfAssets(gameId);
        expect(numberAfter).to.be.equal(1);
        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'AssetsAdded'
        );
        const id = assetsAddedEvent.args[0];
        const assets = assetsAddedEvent.args[1];
        const values = assetsAddedEvent.args[2];
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

      it('Owner can add multiple Assets', async function () {
        const assetContract = await ethers.getContract('Asset');
        const assetReceipt = await supplyAssets(
          GameOwner.address,
          packId,
          GameOwner.address,
          7,
          dummyHash
        );
        const assetReceipt2 = await supplyAssets(
          GameOwner.address,
          packId2,
          GameOwner.address,
          42,
          dummyHash2
        );

        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'TransferSingle'
        );
        const assetTransferEvent2 = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt2,
          'TransferSingle'
        );

        assetId = assetTransferEvent.args[3];
        assetId2 = assetTransferEvent2.args[3];

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

        const assetsAddedReceipt = await GameOwner.Game.addMultipleAssets(
          GameOwner.address,
          gameId,
          [assetId, assetId2],
          [7, 42]
        );

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

        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          assetsAddedReceipt,
          'AssetsAdded'
        );
        const id = assetsAddedEvent.args[0];
        const assets = assetsAddedEvent.args[1];
        const values = assetsAddedEvent.args[2];

        const [gameAssets, quantities] = await GameOwner.Game.getGameAssets(
          gameId
        );
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

      it('Owner can remove single Asset', async function () {
        const numberBefore = await gameToken.getNumberOfAssets(gameId);
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const assetRemovalReceipt = await GameOwner.Game.removeSingleAsset(
          gameId,
          singleAssetId,
          GameOwner.address
        );

        const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const assets = assetsRemovedEvent.args[1];
        const values = assetsRemovedEvent.args[2];
        const to = assetsRemovedEvent.args[3];
        const numberAfter = await gameToken.getNumberOfAssets(gameId);
        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        expect(numberBefore).to.be.equal(3);
        expect(numberAfter).to.be.equal(2);
        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore - 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore + 1);
        expect(gameAssets.length).to.be.equal(2);
        expect(gameAssets).to.not.deep.include(singleAssetId);
        expect(id).to.be.equal(gameId);
        expect(assets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
        expect(to).to.be.equal(GameOwner.address);
      });

      it('fails when removing more assets than the game contains', async function () {
        await expect(
          GameOwner.Game.removeMultipleAssets(
            gameId,
            [assetId, assetId2, assetId2],
            [7, 31, 2],
            GameOwner.address
          )
        ).to.be.revertedWith('INVALID_INPUT_LENGTHS');
      });

      it('Owner can remove multiple Assets', async function () {
        const numberBefore = await gameToken.getNumberOfAssets(gameId);
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

        const assetRemovalReceipt = await GameOwner.Game.removeMultipleAssets(
          gameId,
          [assetId, assetId2],
          [7, 31],
          GameOwner.address
        );

        const [gameAssets, quantities] = await gameToken.getGameAssets(gameId);
        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const assets = assetsRemovedEvent.args[1];
        const values = assetsRemovedEvent.args[2];
        const to = assetsRemovedEvent.args[3];
        const numberAfter = await gameToken.getNumberOfAssets(gameId);
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

        expect(numberBefore).to.be.equal(2);
        expect(numberAfter).to.be.equal(1);
        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore - 7);
        expect(contractBalance2After).to.be.equal(contractBalance2Before - 31);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore + 7);
        expect(ownerBalance2After).to.be.equal(ownerBalance2Before + 31);
        expect(gameAssets).to.not.deep.include(assetId);
        expect(id).to.be.equal(gameId);
        expect(assets[0]).to.be.equal(assetId);
        expect(assets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(31);
        expect(quantities[0]).to.be.equal(11);
        expect(to).to.be.equal(GameOwner.address);
      });

      it('Editor can add & remove Assets', async function () {
        await waitFor(
          GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true)
        );
        const numberBefore = await gameToken.getNumberOfAssets(gameId);
        const assetContract = await ethers.getContract('Asset');
        const assetReceipt = await supplyAssets(
          GameEditor1.address,
          packId3,
          GameEditor1.address,
          1,
          dummyHash3
        );
        const assetAsAssetOwner = await assetContract.connect(
          ethers.provider.getSigner(GameEditor1.address)
        );
        await waitFor(
          assetAsAssetOwner.setApprovalForAllFor(
            GameEditor1.address,
            gameToken.address,
            true
          )
        );
        const assetTransferEvent = await expectEventWithArgsFromReceipt(
          assetContract,
          assetReceipt,
          'TransferSingle'
        );
        const editorAssetId = assetTransferEvent.args[3];
        const balance = await assetContract['balanceOf(address,uint256)'](
          GameEditor1.address,
          editorAssetId
        );

        await waitFor(
          GameEditor1.Game.addSingleAsset(
            GameEditor1.address,
            gameId,
            editorAssetId
          )
        );

        const numberAfter = await gameToken.getNumberOfAssets(gameId);

        await waitFor(
          GameEditor1.Game.removeSingleAsset(
            gameId,
            editorAssetId,
            GameEditor1.address
          )
        );

        const finalNumber = await gameToken.getNumberOfAssets(gameId);

        expect(balance).to.be.equal(1);
        expect(numberBefore).to.be.equal(1);
        expect(numberAfter).to.be.equal(2);
        expect(finalNumber).to.be.equal(1);
      });
    });
  });
  describe('GameToken: Transferring GAMEs', function () {
    let gameId: BigNumber;
    let assetId: BigNumber;
    let assetContract: Contract;
    let gameToken: Contract;
    let users: User[];
    let GameOwner: User;

    before(async function () {
      ({gameToken, users, GameOwner} = await setupTest());
      const assetReceipt = await supplyAssets(
        GameOwner.address,
        packId,
        GameOwner.address,
        1,
        dummyHash
      );
      assetContract = await ethers.getContract('Asset');
      const assetTransferEvent = await expectEventWithArgsFromReceipt(
        assetContract,
        assetReceipt,
        'Transfer'
      );
      assetId = assetTransferEvent.args[2];
      const assetAsAssetOwner = await assetContract.connect(
        ethers.provider.getSigner(GameOwner.address)
      );
      await waitFor(
        assetAsAssetOwner.setApprovalForAllFor(
          GameOwner.address,
          gameToken.address,
          true
        )
      );
      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [assetId],
          [1],
          []
        )
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'Transfer'
      );
      gameId = transferEvent.args[2];
    });

    it('current owner can transfer ownership of a GAME', async function () {
      console.log(`Game Token: ${gameToken.address}`);
      console.log(`Game Owner: ${GameOwner.address}`);
      const originalOwner = await gameToken.ownerOf(gameId);
      const recipient = users[7].address;
      console.log(`recipient: ${recipient}`);
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

    it('should fail if non-owner trys to transfer a GAME', async function () {
      const originalOwner = await gameToken.ownerOf(gameId);
      await expect(
        gameToken['safeTransferFrom(address,address,uint256)'](
          originalOwner,
          users[10].address,
          gameId
        )
      ).to.be.revertedWith('not approved to transfer');
    });
  });

  describe('GameToken: MetaData', function () {
    let gameToken: Contract;
    let gameId: BigNumber;
    let GameOwner: User;
    let GameEditor1: User;

    before(async function () {
      ({gameToken, GameOwner, GameEditor1} = await setupTest());
      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [],
          [],
          []
        )
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'Transfer'
      );
      gameId = transferEvent.args[2];
      await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
    });

    it('can get the ERC721 token contract name', async function () {
      const name = await gameToken.name();
      expect(name).to.be.equal("Sandbox's GAMEs");
    });

    it('can get the ERC721 token contract symbol', async function () {
      const symbol = await gameToken.symbol();
      expect(symbol).to.be.equal('GAME');
    });

    it('GAME owner can set the tokenURI', async function () {
      await GameOwner.Game.setTokenURI(gameId, 'Hello World');
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal('Hello World');
    });

    it('GAME editors can set the tokenURI', async function () {
      await GameEditor1.Game.setTokenURI(gameId, 'Hello Sandbox');
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal('Hello Sandbox');
    });

    it('should revert if ownerOf == address(0)', async function () {
      const {gameToken} = await setupTest();
      await expect(gameToken.tokenURI(11)).to.be.revertedWith(
        'Id does not exist'
      );
    });

    it('should revert if not ownerOf or gameEditor', async function () {
      const {gameToken} = await setupTest();
      await expect(gameToken.setTokenURI(11, 'New URI')).to.be.revertedWith(
        'URI_ACCESS_DENIED'
      );
    });
  });
});
