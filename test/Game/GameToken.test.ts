import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract} from 'ethers';
import Prando from 'prando';
import {_TypedDataEncoder} from 'ethers/lib/utils';
import {Receipt, Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
import {data712} from './data712';
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
const METATX_SANDBOX = 1;
const METATX_2771 = 2;
const rng = new Prando('GameToken');
// const MAX_UINT96 = BigNumber.from('39614081257132170000000000000');

// for prod use 39614081257132170000000000000(MAX_UINT96) as upper limit
async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

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
          await gameTokenAsAdmin.setGameManager(users[3].address);
          const GameManager = users[3];
          const randomId = await getRandom();
          const managerReceipt = GameManager.Game.createGame(
            users[3].address,
            users[4].address,
            [],
            [],
            [],
            '',
            randomId
          );
          const transferEvent = await expectEventWithArgs(
            gameToken,
            managerReceipt,
            'Transfer'
          );
          const managerGameId = transferEvent.args[2];
          const gameOwner = transferEvent.args[1];

          expect(await gameToken.ownerOf(managerGameId)).to.be.equal(
            users[4].address
          );
          expect(gameOwner).to.be.equal(users[4].address);
        });

        it('reverts if non-manager trys to mint Game when _gameManager is set', async function () {
          const randomId = await getRandom();
          await expect(
            gameToken.createGame(
              users[2].address,
              users[2].address,
              [],
              [],
              [],
              '',
              randomId
            )
          ).to.be.revertedWith('INVALID_GAME_MANAGER');
        });
      });

      describe('GameToken: No Game Manager', function () {
        let gameToken: Contract;
        let GameOwner: User;
        let gameId: BigNumber;
        let GameEditor1: User;
        let GameEditor2: User;

        it('anyone can mint Games with no Assets', async function () {
          const randomId = await getRandom();
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
              '',
              randomId
            )
          );
          const transferEvent = await expectEventWithArgs(
            gameToken,
            receipt,
            'Transfer'
          );

          gameId = transferEvent.args[2];
          const eventGameOwner = transferEvent.args[1];
          const contractGameOwner = await gameToken.ownerOf(gameId);

          expect(eventGameOwner).to.be.equal(GameOwner.address);
          expect(contractGameOwner).to.be.equal(GameOwner.address);
          expect(contractGameOwner).to.be.equal(eventGameOwner);
        });

        it('anyone can mint Games with Editors', async function () {
          ({gameToken, GameOwner} = await setupTest());
          const randomId = await getRandom();
          const receipt = await waitFor(
            GameOwner.Game.createGame(
              GameOwner.address,
              GameOwner.address,
              [],
              [],
              [GameEditor1.address, GameEditor2.address],
              '',
              randomId
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
          const secondSlice = idAsHex.slice(58);
          expect(utils.getAddress(slicedId)).to.be.equal(GameOwner.address);
          expect(secondSlice).to.be.equal('24a3d57c');
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
        const randomId = await getRandom();

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId],
            [1],
            [],
            '',
            randomId
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
        const randomId = await getRandom();

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId, assetId2],
            [quantity, quantity2],
            [],
            '',
            randomId
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
        const randomId = await getRandom();
        await expect(
          waitFor(
            GameOwner.Game.createGame(
              GameOwner.address,
              GameOwner.address,
              [assetId],
              [11, 42],
              [],
              '',
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
        const randomId = await getRandom();

        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            [],
            'Uri is this',
            randomId
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

        const uriBefore = await gameToken.tokenURI(gameId);
        expect(uriBefore).to.be.equal('Uri is this');

        const receipt = await waitFor(
          GameOwner.Game.addAssets(
            GameOwner.address,
            gameId,
            [singleAssetId],
            [1],
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

        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'AssetsAdded'
        );
        const id = assetsAddedEvent.args[0];
        const assets = assetsAddedEvent.args[1];
        const values = assetsAddedEvent.args[2];

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 1);
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

        const assetsAddedReceipt = await GameOwner.Game.addAssets(
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

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 7);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 7);
        expect(ownerBalanceAfter2).to.be.equal(ownerBalanceBefore2 - 42);
        expect(contractBalanceAfter2).to.be.equal(contractBalanceBefore2 + 42);

        expect(id).to.be.equal(gameId);
        expect(assets[0]).to.be.equal(assetId);
        expect(assets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(42);
      });

      it('Owner can remove single Asset', async function () {
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const assetRemovalReceipt = await GameOwner.Game.removeAssets(
          gameId,
          [singleAssetId],
          [1],
          GameOwner.address,
          ''
        );

        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const assets = assetsRemovedEvent.args[1];
        const values = assetsRemovedEvent.args[2];
        const to = assetsRemovedEvent.args[3];
        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore - 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore + 1);
        expect(id).to.be.equal(gameId);
        expect(assets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
        expect(to).to.be.equal(GameOwner.address);
      });

      it('fails when removing more assets than the game contains', async function () {
        await expect(
          GameOwner.Game.removeAssets(
            gameId,
            [assetId, assetId2, assetId2],
            [25, 31, 2],
            GameOwner.address,
            ''
          )
        ).to.be.revertedWith('INVALID_ASSET_REMOVAL');
      });

      it('Owner can remove multiple Assets', async function () {
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

        const assetRemovalReceipt = await GameOwner.Game.removeAssets(
          gameId,
          [assetId, assetId2],
          [7, 31],
          GameOwner.address,
          ''
        );

        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const assets = assetsRemovedEvent.args[1];
        const values = assetsRemovedEvent.args[2];
        const to = assetsRemovedEvent.args[3];

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
        expect(id).to.be.equal(gameId);
        expect(assets[0]).to.be.equal(assetId);
        expect(assets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(31);
        expect(to).to.be.equal(GameOwner.address);
      });

      it('Editor can add & remove Assets', async function () {
        await waitFor(
          GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true)
        );

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
        const balance1 = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          editorAssetId
        );
        expect(balance1).to.be.equal(0);

        await waitFor(
          GameEditor1.Game.addAssets(
            GameEditor1.address,
            gameId,
            [editorAssetId],
            [1],
            ''
          )
        );

        const balance2 = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          editorAssetId
        );
        expect(balance2).to.be.equal(1);
        await waitFor(
          GameEditor1.Game.removeAssets(
            gameId,
            [editorAssetId],
            [1],
            GameEditor1.address,
            ''
          )
        );
        const balance3 = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          editorAssetId
        );
        expect(balance3).to.be.equal(0);
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
      const randomId = await getRandom();

      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [assetId],
          [1],
          [],
          '',
          randomId
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
      const randomId = await getRandom();
      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [],
          [],
          [],
          'Hello Sandbox',
          randomId
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
        'BURNED_OR_NEVER_MINTED'
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

  describe('GameToken: Destroying Games', function () {
    let gameToken: Contract;
    let gameTokenAsAdmin: Contract;
    let GameOwner: User;
    let others: Address[];

    let assetId: BigNumber;
    let assetId2: BigNumber;
    let gameId: BigNumber;

    const quantity = 7;
    const quantity2 = 11;

    before(async function () {
      ({gameToken, gameTokenAsAdmin, GameOwner} = await setupTest());
      others = await getUnnamedAccounts();

      const assetContract = await ethers.getContract('Asset');
      let assetReceipt: Receipt;
      assetReceipt = await supplyAssets(
        GameOwner.address,
        packId,
        GameOwner.address,
        quantity,
        dummyHash
      );
      const assetReceipt1 = assetReceipt;
      assetReceipt = await supplyAssets(
        GameOwner.address,
        packId2,
        GameOwner.address,
        quantity2,
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
      const randomId = await getRandom();

      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [assetId, assetId2],
          [quantity, quantity2],
          [],
          '',
          randomId
        )
      );

      const transferEvent = await expectEventWithArgsFromReceipt(
        gameToken,
        receipt,
        'Transfer'
      );

      gameId = transferEvent.args[2];
    });

    it('fails if "to" == address(0)', async function () {
      await expect(
        GameOwner.Game.destroyGame(
          GameOwner.address,
          ethers.constants.AddressZero,
          gameId,
          [],
          []
        )
      ).to.be.revertedWith('DESTINATION_ZERO_ADDRESS');
    });

    it('fails if "to" == Game Token contract', async function () {
      await expect(
        gameToken.destroyGame(
          GameOwner.address,
          gameToken.address,
          gameId,
          [],
          []
        )
      ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
    });
    it('fails if "from" != game owner', async function () {
      await expect(
        GameOwner.Game.destroyGame(others[2], others[1], gameId, [], [])
      ).to.be.revertedWith('DESTROY_ACCESS_DENIED');
    });
    it('fails if called by non-Manager when gameManager is set', async function () {
      await gameTokenAsAdmin.setGameManager(others[9]);
      await expect(
        gameToken.destroyGame(others[0], others[0], gameId, [], [])
      ).to.be.revertedWith('INVALID_GAME_MANAGER');
    });

    describe('GameToken: After Burning...', function () {
      before(async function () {
        const assetContract = await ethers.getContract('Asset');
        await gameTokenAsAdmin.setGameManager(ethers.constants.AddressZero);

        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const ownerBalanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const contractBalanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);

        expect(ownerBalanceBefore).to.be.equal(0);
        expect(ownerBalanceBefore2).to.be.equal(0);
        expect(contractBalanceBefore).to.be.equal(7);
        expect(contractBalanceBefore2).to.be.equal(11);

        await GameOwner.Game.destroyGame(
          GameOwner.address,
          GameOwner.address,
          gameId,
          [assetId, assetId2],
          [7, 11]
        );

        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const ownerBalanceAfter2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);
        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId);
        const contractBalanceAfter2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);

        expect(ownerBalanceAfter).to.be.equal(7);
        expect(ownerBalanceAfter2).to.be.equal(11);
        expect(contractBalanceAfter).to.be.equal(0);
        expect(contractBalanceAfter2).to.be.equal(0);
      });

      it('creatorOf() should should still return original creator', async function () {
        const gameCreator = await gameToken.creatorOf(gameId);
        expect(gameCreator).to.be.equal(GameOwner.address);
      });

      it('game should no longer exist', async function () {
        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'token does not exist'
        );
      });
    });
  });

  describe('GameToken: MetaTransactions', function () {
    it('can set the MetaTransactionProcessor type', async function () {
      const {gameToken, gameTokenAsAdmin} = await setupTest();
      // const NativeMetaTransactionProcessor = await ethers.getContract(
      //   'NativeMetaTransactionProcessor'
      // );
      const others = await getUnnamedAccounts();
      await expect(gameTokenAsAdmin.setMetaTransactionProcessor(others[8], 1))
        .to.emit(gameTokenAsAdmin, 'MetaTransactionProcessor')
        .withArgs(others[8], METATX_SANDBOX);

      const type = await gameToken.getMetaTransactionProcessorType(others[8]);
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

    it.skip('can process metaTransactions if processorType == METATX_SANDBOX', async function () {
      const isSkipped = true;
    });

    it.skip('can process metaTransactions if processorType == METATX_2771', async function () {
      const {gameToken, GameOwner} = await setupTest();
      const others = await getUnnamedAccounts();
      const signers = await ethers.getSigners();

      // @review trying to use rinkeby address !!!
      const trustedForwarderFactory = await ethers.getContractFactory(
        'Forwarder',
        signers[0]
      );
      const trustedForwarder: Contract = await trustedForwarderFactory.deploy();
      await trustedForwarder.deployed();
      const randomId = await getRandom();

      const receipt = await waitFor(
        GameOwner.Game.createGame(
          GameOwner.address,
          GameOwner.address,
          [],
          [],
          [],
          '',
          randomId
        )
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'Transfer'
      );
      const gameId = transferEvent.args[2];

      // @review - needed ?
      await waitFor(
        GameOwner.Game.approveFor(
          GameOwner.address,
          trustedForwarder.address,
          gameId
        )
      );

      const txObj = await GameOwner.Game.populateTransaction[
        'safeTransferFrom(address,address,uint256)'
      ](GameOwner.address, others[3], gameId);

      let data = txObj.data;
      // @review
      data += GameOwner.address.replace('0x', '');

      const transfer = {
        to: txObj.to,
        data: data,
        value: 0,
        from: GameOwner.address,
        nonce: 0,
        gas: 1e6,
      };

      const transferData712 = data712(gameToken, transfer);

      const flatSig = await ethers.provider.send('eth_signTypedData', [
        GameOwner.address,
        transferData712,
      ]);
      console.log(`sig: ${flatSig}`);

      const domainRegReceipt = await trustedForwarder.registerDomainSeparator(
        'The Sandbox',
        '1'
      );

      const domainRegistrationEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        domainRegReceipt,
        'DomainRegistered'
      );

      const registeredDomainHash = domainRegistrationEvent.args[0];

      const requestRegReceipt = await trustedForwarder.registerRequestType(
        'The Sandbox',
        '1'
      );

      const requestRegistrationEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        requestRegReceipt,
        'RequestTypeRegistered'
      );

      const registeredRequestHash = requestRegistrationEvent.args[0];

      expect(await trustedForwarder.domains(registeredDomainHash)).to.be.equal(
        true
      );
      expect(
        await trustedForwarder.typeHashes(registeredRequestHash)
      ).to.be.equal(true);

      const forwardingObject = await trustedForwarder.execute(
        transfer,
        registeredDomainHash,
        registeredRequestHash,
        '0x',
        flatSig
      );

      console.log(`forwardingObject:   ${forwardingObject}`);

      const newOwner = await gameToken.ownerOf(gameId);
      console.log(`newOwner:   ${newOwner}`);
      console.log(`3:   ${others[3]}`);
      console.log(`GameOwner.address:   ${GameOwner.address}`);
      expect(newOwner).to.be.equal(others[3]);
      expect(await gameToken.creatorOf(gameId)).to.be.equal(GameOwner.address);
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
        const randomId = await getRandom();
        const receipt = await waitFor(
          GameOwner.Game.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            [],
            '',
            randomId
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
