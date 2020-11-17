import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract, Wallet} from 'ethers';
import {splitSignature, _TypedDataEncoder} from 'ethers/lib/utils';
import {signTypedData_v4, TypedDataUtils} from 'eth-sig-util';
import {Receipt, Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
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
    const {GameOwner, gameToken} = await setupTest();
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
    const isSuperOperator = await assetContract.isSuperOperator(
      gameToken.address
    );
    expect(isSuperOperator).to.be.true;
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
            [],
            ''
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
            gameToken.createGame(
              users[2].address,
              users[2].address,
              [],
              [],
              [],
              ''
            )
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
              [],
              ''
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
              [GameEditor1.address, GameEditor2.address],
              ''
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

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId],
            [1],
            [],
            ''
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

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId, assetId2],
            [quantity, quantity2],
            [],
            ''
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

        const transferEvent = await expectEventWithArgsFromReceipt(
          gameToken,
          receipt,
          'Transfer'
        );
        const assetsAddedEvent = await expectEventWithArgsFromReceipt(
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
              [],
              ''
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

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            [],
            'Uri is this'
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

        const uriBefore = await gameToken.tokenURI(gameId);
        expect(uriBefore).to.be.equal('Uri is this');

        const receipt = await waitFor(
          GameOwner.Game.addSingleAsset(
            GameOwner.address,
            gameId,
            singleAssetId,
            'Uri is different now'
          )
        );

        const uriAfter = await gameToken.tokenURI(gameId);
        expect(uriAfter).to.be.equal('Uri is different now');

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
          [7, 42],
          ''
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
          GameOwner.address,
          ''
        );

        const [gameAssets] = await gameToken.getGameAssets(gameId);
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
            GameOwner.address,
            ''
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
          GameOwner.address,
          ''
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
            editorAssetId,
            ''
          )
        );

        const numberAfter = await gameToken.getNumberOfAssets(gameId);

        await waitFor(
          GameEditor1.Game.removeSingleAsset(
            gameId,
            editorAssetId,
            GameEditor1.address,
            ''
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

      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [assetId],
          [1],
          [],
          ''
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

    // @review is creatorship meant to remain independent of ownership?
    it('can transfer creatorship of a GAME', async function () {
      const others = await getUnnamedAccounts();
      const creatorBefore = await gameToken.creatorOf(gameId);

      await GameOwner.Game.transferCreatorship(
        GameOwner.address,
        GameOwner.address,
        others[3]
      );

      const creatorAfter = await gameToken.creatorOf(gameId);
      expect(creatorAfter).to.not.equal(creatorBefore);
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
          [],
          'Hello Sandbox'
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
      // await GameOwner.Game.setTokenURI(gameId, 'Hello Sandbox');
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal('Hello Sandbox');
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

    it('should be able to retrieve the creator address from the gameId', async function () {
      const creator = await gameToken.creatorOf(gameId);
      expect(creator).to.be.equal(GameOwner.address);
    });
  });

  describe('GameToken: MetaTransactions', function () {
    /////////////////////// GSN Forwarder ///////////////////////////
    let trustedForwarder: Contract;
    let typeHash: string;
    let typeData: any;
    let wallet: Wallet;

    const EIP712DomainType = [
      {name: 'name', type: 'string'},
      {name: 'version', type: 'string'},
      {name: 'chainId', type: 'uint256'},
      {name: 'verifyingContract', type: 'address'},
    ];

    const ForwardRequestType = [
      {name: 'from', type: 'address'},
      {name: 'to', type: 'address'},
      {name: 'value', type: 'uint256'},
      {name: 'gas', type: 'uint256'},
      {name: 'nonce', type: 'uint256'},
      {name: 'data', type: 'bytes'},
    ];
    before(async function () {
      trustedForwarder = await ethers.getContractAt(
        'Forwarder',
        '0x956868751Cc565507B3B58E53a6f9f41B56bed74'
      );
      // deployed rinkey address for forwarder:
      // 0x956868751Cc565507B3B58E53a6f9f41B56bed74

      const GENERIC_PARAMS =
        'address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data';

      const typeName = `ForwardRequest(${GENERIC_PARAMS})`;
      typeHash = utils.keccak256(utils.toUtf8Bytes(typeName));
      await trustedForwarder.registerRequestType('TestCall', '0x');
      typeData = {
        domain: {
          name: 'Test Domain',
          version: '1',
          chainId: 1234,
          verifyingContract: trustedForwarder.address,
        },
        primaryType: 'ForwardRequest',
        types: {
          EIP712Domain: EIP712DomainType,
          ForwardRequest: ForwardRequestType,
        },
        message: {},
      };
      const calcType = TypedDataUtils.encodeType(
        'ForwardRequest',
        typeData.types
      );
      expect(calcType).to.be.equal(typeName);

      const domainSeparator = TypedDataUtils.hashStruct(
        'EIP712Domain',
        typeData.domain,
        typeData.types
      );
    });

    /////////////////////// GSN Forwarder ///////////////////////////

    const METATX_SANDBOX = 1;
    const METATX_2771 = 2;

    it('can set the MetaTransactionProcessor type', async function () {
      const {gameToken, gameTokenAsAdmin} = await setupTest();
      const NativeMetaTransactionProcessor = await ethers.getContract(
        'NativeMetaTransactionProcessor'
      );
      await expect(
        gameTokenAsAdmin.setMetaTransactionProcessor(
          NativeMetaTransactionProcessor.address,
          1
        )
      )
        .to.emit(gameTokenAsAdmin, 'MetaTransactionProcessor')
        .withArgs(NativeMetaTransactionProcessor.address, METATX_SANDBOX);

      const type = await gameToken.getMetaTransactionProcessorType(
        NativeMetaTransactionProcessor.address
      );
      expect(type).to.be.equal(METATX_SANDBOX);
    });

    it('can check if contract is a Trusted Forwarder', async function () {
      const {gameToken, gameTokenAsAdmin} = await setupTest();
      const others = await getUnnamedAccounts();

      let isTrustedForwarder = await gameToken.isTrustedForwarder(others[0]);
      expect(isTrustedForwarder).to.be.false;

      await expect(
        gameTokenAsAdmin.setMetaTransactionProcessor(others[0], METATX_2771)
      )
        .to.emit(gameTokenAsAdmin, 'MetaTransactionProcessor')
        .withArgs(others[0], METATX_2771);

      isTrustedForwarder = await gameToken.isTrustedForwarder(others[0]);
      expect(isTrustedForwarder).to.be.true;
    });
    // should succeed:
    // if processorType == METATX_SANDBOX
    it.skip('can process metaTransactions if processorType == METATX_SANDBOX', async function () {
      const isSkipped = true;
    });
    it.skip('can process metaTransactions if processorType == METATX_2771', async function () {
      const {gameToken, GameOwner} = await setupTest();
      const others = await getUnnamedAccounts();
      const amount = 1;
      wallet = Wallet.createRandom();

      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [],
          [],
          [],
          ''
        )
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'Transfer'
      );
      const gameId = transferEvent.args[2];
      const gameAsWallet = await gameToken.connect(
        ethers.provider.getSigner(wallet.address)
      );
      await waitFor(
        gameAsWallet.approveFor(
          wallet.address,
          trustedForwarder.address,
          gameId
        )
      );

      await GameOwner.Game.safeTransferFrom(
        GameOwner.address,
        wallet.address,
        gameId
      );
      const txObj = await gameToken.populateTransaction.safeTransferFrom(
        wallet.address,
        others[3],
        amount
      );
      const to = txObj.to;
      let data = txObj.data;

      data += wallet.address.replace('0x', '');

      const req1 = {
        to: to,
        data: data,
        value: '0',
        from: wallet.address,
        nonce: 0,
        gas: 1e6,
      };

      const privateKey = wallet.privateKey;
      const privateKeyAsBuffer = Buffer.from(privateKey.substr(2), 'hex');
      const sig = signTypedData_v4(privateKeyAsBuffer, {
        data: {...typeData, message: req1},
      });
      const domainSeparator = TypedDataUtils.hashStruct(
        'EIP712Domain',
        typeData.domain,
        typeData.types
      );

      await expect(
        trustedForwarder.execute(req1, domainSeparator, typeHash, '0x', sig)
      )
        .to.emit(gameToken, 'Transfer')
        .withArgs(to, wallet.address, gameId);
    });

    /**
     * @note ==========================`
     * -Extracting the metaTx tests-
     * params to pass to the metaTx suite:
     * - contract to test (GameToken)
     * - function to test (createGame)
     * - native metaTx processor address ?
     * - trustedForwarder address ?
     * @note ==========================
     */

    describe('GameToken: Invalid metaTransactions', function () {
      let gameAsUser7: Contract;
      let others: Address[];
      let gameId: BigNumber;
      let gameToken: Contract;
      let GameOwner: User;
      let gameTokenAsAdmin: Contract;

      before(async function () {
        ({gameToken, GameOwner, gameTokenAsAdmin} = await setupTest());
        others = await getUnnamedAccounts();
        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            [],
            ''
          )
        );
        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );
        gameId = transferEvent.args[2];
        gameAsUser7 = gameToken.connect(ethers.provider.getSigner(others[7]));
        const approvedAddress = await gameToken.getApproved(gameId);
        const isApprovedForAll = await gameToken.isApprovedForAll(
          GameOwner.address,
          others[7]
        );
        // Force metaTx conditions: (msg.sender != from && msg.sender != any type of operator(operator, superOperator, operatorForAll)
        expect(approvedAddress).to.not.equal(others[7]);
        expect(isApprovedForAll).to.be.false;
      });

      it('should fail if processorType == METATX_2771 && from != _forceMsgSender()', async function () {
        await gameTokenAsAdmin.setMetaTransactionProcessor(
          others[7],
          METATX_2771
        );
        const type = await gameToken.getMetaTransactionProcessorType(others[7]);
        expect(type).to.be.equal(METATX_2771);
        await expect(
          gameAsUser7.transferFrom(GameOwner.address, others[7], gameId)
        ).to.be.revertedWith('not approved to transfer');
      });
    });
  });
});
