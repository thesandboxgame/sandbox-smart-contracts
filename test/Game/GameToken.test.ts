import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract} from 'ethers';
import Prando from 'prando';
import {Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
// import {data712} from './data712';
import {
  waitFor,
  expectEventWithArgs,
  expectReceiptEventWithArgs,
  expectEventWithArgsFromReceipt,
  findEvents,
} from '../utils';
import {setupTest, User} from './fixtures';
import {supplyAssets} from './assets';

let id: BigNumber;

const METATX_SANDBOX = 1;
const METATX_2771 = 2;
const rng = new Prando('GameToken');

// for prod, use maximum uint64 (2^64-1) as upper limit
async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

async function getNewGame(
  gameToken: Contract,
  gameTokenAsAdmin: Contract,
  from: User,
  to: User,
  assetIds: BigNumber[] | null,
  assetAmounts: number[] | null
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

  const receipt = await waitFor(
    gameTokenAsMinter.createGame(
      from.address,
      to.address,
      assetIds,
      assetAmounts,
      ethers.constants.AddressZero,
      '',
      randomId
    )
  );

  const transferEvent = await expectEventWithArgsFromReceipt(
    gameToken,
    receipt,
    'Transfer'
  );
  const gameId = transferEvent.args[2];

  const gameStateAfter = await gameToken.getAssetBalances(gameId, assetIds);
  if (assetIds && assetAmounts) {
    for (let i = 0; i < assetIds.length; i++) {
      expect(gameStateAfter[i]).to.be.equal(assetAmounts[i]);
    }
  }

  return gameId;
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

describe('GameToken', function () {
  before(async function () {
    const {GameOwner, gameToken} = await setupTest();
    const {assets} = await supplyAssets(GameOwner.address, GameOwner.address, [
      1,
    ]);
    const assetContract = await ethers.getContract('Asset');
    id = assets[0];

    const isSuperOperator = await assetContract.isSuperOperator(
      gameToken.address
    );
    expect(isSuperOperator).to.be.true;
  });

  describe('GameToken: Minting GAMEs', function () {
    let users: User[];
    let gameToken: Contract;
    let gameTokenAsMinter: Contract;
    let GameOwner: User;
    let gameId: BigNumber;

    before(async function () {
      ({gameToken, users, GameOwner} = await setupTest());
      const {gameTokenAdmin} = await getNamedAccounts();
      gameTokenAsMinter = await gameToken.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );
      expect(await gameToken.getMinter()).to.be.equal(gameTokenAdmin);
    });

    it('Minter can create GAMEs when _Minter is set', async function () {
      const randomId = await getRandom();

      const minterReceipt = gameTokenAsMinter.createGame(
        users[3].address,
        users[4].address,
        [],
        [],
        ethers.constants.AddressZero,
        '',
        randomId
      );
      const transferEvent = await expectEventWithArgs(
        gameToken,
        minterReceipt,
        'Transfer'
      );
      gameId = transferEvent.args[2];
      const gameOwner = transferEvent.args[1];

      expect(await gameToken.ownerOf(gameId)).to.be.equal(users[4].address);
      expect(gameOwner).to.be.equal(users[4].address);
    });

    it('gameId contains creator address', async function () {
      const idAsHex = utils.hexValue(gameId);
      const creatorSlice = idAsHex.slice(0, 42);
      const randomIdSlice = idAsHex.slice(43, 58);
      const versionSlice = idAsHex.slice(58);
      expect(utils.getAddress(creatorSlice)).to.be.equal(users[3].address);
      expect(randomIdSlice).to.be.equal('000000016721787');
      expect(versionSlice).to.be.equal('00000001');
    });

    it('reverts if non-minter trys to mint Game when _Minter is set', async function () {
      const randomId = await getRandom();
      await expect(
        gameToken.createGame(
          users[2].address,
          users[2].address,
          [],
          [],
          ethers.constants.AddressZero,
          '',
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
        await expect(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            gameToken.address,
            [],
            [],
            ethers.constants.AddressZero,
            '',
            42
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('can mint Games with single Asset', async function () {
        const assetContract = await ethers.getContract('Asset');

        const {assets, quantities} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [1]
        );

        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assets[0]
        );

        gameId = await getNewGame(
          gameToken,
          gameTokenAsMinter,
          GameOwner,
          GameOwner,
          assets,
          quantities
        );

        const balanceAfter = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assets[0]
        );

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + 1);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
      });

      it('can mint Games with many Assets', async function () {
        const {gameToken, GameOwner} = await setupTest();
        const assetContract = await ethers.getContract('Asset');

        const {assets, quantities} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [3, 2]
        );

        assetId = assets[0];
        assetId2 = assets[1];

        const userBalanceOf1 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId);
        const userBalanceOf2 = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, assetId2);

        expect(userBalanceOf1).to.be.equal(3);
        expect(userBalanceOf2).to.be.equal(2);

        const quantity = quantities[0];
        const quantity2 = quantities[1];

        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId
        );
        const balanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const randomId = await getRandom();
        expect(quantity).to.be.equal(3);
        expect(quantity2).to.be.equal(2);
        const receipt = await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            [assetId, assetId2],
            [quantity, quantity2],
            ethers.constants.AddressZero,
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
        eventAssets = assetsAddedEvent.args[1];
        values = assetsAddedEvent.args[2];

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(quantity);
        expect(gameStateAfter[1]).to.be.equal(quantity2);

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + quantity);
        expect(balanceAfter2).to.be.equal(balanceBefore2 + quantity2);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
        expect(id).to.be.equal(gameId);
        expect(eventAssets).to.be.eql([assetId, assetId2]);
        expect(values).to.be.eql([BigNumber.from(3), BigNumber.from(2)]);
      });

      it('should fail if length of assetIds and values dont match', async function () {
        const {assets} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [3]
        );

        const assetId = assets[0];
        const randomId = await getRandom();
        await expect(
          waitFor(
            gameTokenAsMinter.createGame(
              GameOwner.address,
              GameOwner.address,
              [assetId],
              [11, 42],
              ethers.constants.AddressZero,
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
      let gameTokenAsMinter: Contract;

      before(async function () {
        ({
          gameToken,
          GameOwner,
          GameEditor1,
          GameEditor2,
          users,
        } = await setupTest());

        const {gameTokenAdmin} = await getNamedAccounts();
        gameTokenAsMinter = await gameToken.connect(
          ethers.provider.getSigner(gameTokenAdmin)
        );

        assetContract = await ethers.getContract('Asset');
        const {assets} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [1]
        );

        assetId = assets[0];
        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            users[10].address,
            'Uri is this',
            randomId
          )
        );
        const transferEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'Transfer'
        );

        const editorEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'GameEditorSet'
        );

        gameId = transferEvent.args[2];
        expect(editorEvent.args[0]).to.be.equal(gameId);
        expect(editorEvent.args[1]).to.be.equal(users[10].address);
        expect(editorEvent.args[2]).to.be.equal(true);
      });

      it('should allow the owner to add game editors', async function () {
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          gameId,
          GameEditor1.address,
          true
        );
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          gameId,
          GameEditor2.address,
          true
        );
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
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          gameId,
          GameEditor1.address,
          false
        );
        await GameOwner.Game.setGameEditor(
          GameOwner.address,
          gameId,
          GameEditor2.address,
          false
        );
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
          gameToken.setGameEditor(users[1].address, 42, editor.address, false)
        ).to.be.revertedWith('EDITOR_ACCESS_DENIED');
      });

      it('Minter can add single Asset', async function () {
        const assetContract = await ethers.getContract('Asset');
        const {assets} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [1]
        );

        singleAssetId = assets[0];
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const uriBefore = await gameToken.tokenURI(gameId);

        const gameStateBefore = await gameToken.getAssetBalances(gameId, [
          singleAssetId,
        ]);

        const receipt = await waitFor(
          gameTokenAsMinter.addAssets(
            GameOwner.address,
            gameId,
            [singleAssetId],
            [1],
            'Uri is different now',
            false
          )
        );
        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'AssetsAdded'
        );
        const transferEvents = await findEvents(
          gameToken,
          'Transfer',
          receipt.blockHash
        );
        let newIdFromTransfer;

        if (transferEvents[0].args) {
          newIdFromTransfer = transferEvents[0].args[2];
        }

        const newGameIdFromAdd = assetsAddedEvent.args[3];
        const uriAfter = await gameToken.tokenURI(newGameIdFromAdd);

        const gameStateAfter = await gameToken.getAssetBalances(
          newGameIdFromAdd,
          [singleAssetId]
        );

        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const eventAssets = assetsAddedEvent.args[1];
        const values = assetsAddedEvent.args[2];

        expect(uriBefore).to.be.equal('Uri is this');
        expect(gameStateBefore[0]).to.be.equal(0);
        expect(uriAfter).to.be.equal('Uri is different now');
        expect(gameStateAfter[0]).to.be.equal(1);
        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 1);
        expect(newIdFromTransfer).to.be.equal(newGameIdFromAdd);
        expect(eventAssets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
      });

      it('Minter can add multiple Assets', async function () {
        const assetContract = await ethers.getContract('Asset');

        const {assets, quantities} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [7, 42]
        );

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

        const gameStateBefore = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateBefore[0]).to.be.equal(0);
        expect(gameStateBefore[1]).to.be.equal(0);

        const assetsAddedReceipt = await gameTokenAsMinter.addAssets(
          GameOwner.address,
          gameId,
          [assetId, assetId2],
          [quantities[0], quantities[1]],
          '',
          false
        );

        const assetsAddedEvent = await expectEventWithArgs(
          gameToken,
          assetsAddedReceipt,
          'AssetsAdded'
        );
        gameId = assetsAddedEvent.args[3];

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(quantities[0]);
        expect(gameStateAfter[1]).to.be.equal(quantities[1]);

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

        const id = assetsAddedEvent.args[0];
        const eventAssets = assetsAddedEvent.args[1];
        const values = assetsAddedEvent.args[2];

        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 7);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 7);
        expect(ownerBalanceAfter2).to.be.equal(ownerBalanceBefore2 - 42);
        expect(contractBalanceAfter2).to.be.equal(contractBalanceBefore2 + 42);

        expect(id).to.be.equal(gameId);
        expect(eventAssets[0]).to.be.equal(assetId);
        expect(eventAssets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(quantities[0]);
        expect(values[1]).to.be.equal(quantities[1]);
      });

      it('Minter can remove single Asset', async function () {
        const contractBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceBefore = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const gameStateBefore = await gameToken.getAssetBalances(gameId, [
          singleAssetId,
        ]);
        expect(gameStateBefore[0]).to.be.equal(1);

        const assetRemovalReceipt = await gameTokenAsMinter.removeAssets(
          gameId,
          [singleAssetId],
          [1],
          GameOwner.address,
          ''
        );

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          singleAssetId,
        ]);
        expect(gameStateAfter[0]).to.be.equal(0);

        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const eventAssets = assetsRemovedEvent.args[1];
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
        expect(eventAssets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
        expect(to).to.be.equal(GameOwner.address);
      });

      it('fails when removing more assets than the game contains', async function () {
        await expect(
          gameTokenAsMinter.removeAssets(
            gameId,
            [assetId, assetId2, assetId2],
            [25, 31, 2],
            GameOwner.address,
            ''
          )
        ).to.be.revertedWith('INVALID_ASSET_REMOVAL');
      });

      it('Minter can remove multiple Assets', async function () {
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

        const gameStateBefore = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateBefore[0]).to.be.equal(7);
        expect(gameStateBefore[1]).to.be.equal(42);

        const assetRemovalReceipt = await gameTokenAsMinter.removeAssets(
          gameId,
          [assetId, assetId2],
          [7, 31],
          GameOwner.address,
          ''
        );

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(0);
        expect(gameStateAfter[1]).to.be.equal(11);

        const assetsRemovedEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'AssetsRemoved'
        );
        const id = assetsRemovedEvent.args[0];
        const eventAssets = assetsRemovedEvent.args[1];
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
        expect(eventAssets[0]).to.be.equal(assetId);
        expect(eventAssets[1]).to.be.equal(assetId2);
        expect(values[0]).to.be.equal(7);
        expect(values[1]).to.be.equal(31);
        expect(to).to.be.equal(GameOwner.address);
      });
    });
  });
  describe('GameToken: Transferring GAMEs', function () {
    let gameId: BigNumber;
    let assetId: BigNumber;
    let gameToken: Contract;
    let users: User[];
    let GameOwner: User;
    let gameTokenAsAdmin: Contract;

    before(async function () {
      ({gameToken, users, GameOwner, gameTokenAsAdmin} = await setupTest());
      const {assets, quantities} = await supplyAssets(
        GameOwner.address,
        GameOwner.address,
        [1]
      );
      assetId = assets[0];
      const randomId = await getRandom();
      const receipt = await waitFor(
        gameTokenAsAdmin.createGame(
          GameOwner.address,
          GameOwner.address,
          [assetId],
          [quantities[0]],
          ethers.constants.AddressZero,
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

      const gameStateAfter = await gameToken.getAssetBalances(gameId, [
        assetId,
      ]);
      expect(gameStateAfter[0]).to.be.equal(1);
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
      ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
    });
  });

  describe('GameToken: MetaData', function () {
    let gameToken: Contract;
    let gameTokenAsAdmin: Contract;
    let gameId: BigNumber;
    let GameOwner: User;
    let GameEditor1: User;

    before(async function () {
      ({
        gameToken,
        GameOwner,
        GameEditor1,
        gameTokenAsAdmin,
      } = await setupTest());
      const randomId = await getRandom();

      const receipt = await waitFor(
        gameTokenAsAdmin.createGame(
          GameOwner.address,
          GameOwner.address,
          [],
          [],
          ethers.constants.AddressZero,
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

      await GameOwner.Game.setGameEditor(
        GameOwner.address,
        gameId,
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
      expect(URI).to.be.equal('Hello Sandbox');
    });

    it('Minter can set the tokenURI', async function () {
      const receipt = await gameTokenAsAdmin.setTokenURI(
        gameId,
        'Hello Sandbox'
      );
      const uriEvent = await expectEventWithArgs(
        gameToken,
        receipt,
        'TokenURIChanged'
      );
      expect(uriEvent.args[0]).to.be.equal(gameId);
      expect(uriEvent.args[1]).to.be.equal('Hello Sandbox');

      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal('Hello Sandbox');
    });

    it('should revert if ownerOf == address(0)', async function () {
      const {gameToken} = await setupTest();
      await expect(gameToken.tokenURI(11)).to.be.revertedWith(
        'BURNED_OR_NEVER_MINTED'
      );
    });

    it('should revert if not Minter', async function () {
      const {gameToken} = await setupTest();
      await expect(gameToken.setTokenURI(11, 'New URI')).to.be.revertedWith(
        'MINTER_ACCESS_DENIED'
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
    let users: User[];
    let gameId: BigNumber;
    let assets: BigNumber[];
    let quantities: number[];

    before(async function () {
      ({gameToken, gameTokenAsAdmin, users, GameOwner} = await setupTest());

      ({assets, quantities} = await supplyAssets(
        GameOwner.address,
        GameOwner.address,
        [7, 11]
      ));

      gameId = await getNewGame(
        gameToken,
        gameTokenAsAdmin,
        GameOwner,
        GameOwner,
        assets,
        quantities
      );
    });

    it('fails if "to" == address(0)', async function () {
      await expect(
        GameOwner.Game.destroyGame(
          GameOwner.address,
          ethers.constants.AddressZero,
          gameId
        )
      ).to.be.revertedWith('DESTINATION_ZERO_ADDRESS');
    });

    it('fails to destroy if "to" == Game Token contract', async function () {
      await expect(
        GameOwner.Game.destroyGame(GameOwner.address, gameToken.address, gameId)
      ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
    });

    it('fails if "from" != game owner', async function () {
      await expect(
        GameOwner.Game.destroyGame(gameToken.address, GameOwner.address, gameId)
      ).to.be.revertedWith('DESTROY_INVALID_FROM');
    });

    it('fails if sender != game owner and not metatx', async function () {
      const gameAsOther = await gameToken.connect(
        ethers.provider.getSigner(users[6].address)
      );
      await expect(
        gameAsOther.destroyGame(gameToken.address, GameOwner.address, gameId)
      ).to.be.revertedWith('DESTROY_ACCESS_DENIED');
    });

    describe('GameToken: destroyAndRecover', function () {
      it('fails if "to" == address(0)', async function () {
        await expect(
          GameOwner.Game.destroyAndRecover(
            GameOwner.address,
            ethers.constants.AddressZero,
            gameId,
            []
          )
        ).to.be.revertedWith('DESTINATION_ZERO_ADDRESS');
      });

      it('fails to destroy if "to" == Game Token contract', async function () {
        await expect(
          GameOwner.Game.destroyAndRecover(
            GameOwner.address,
            gameToken.address,
            gameId,
            []
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('fails if "from" != game owner', async function () {
        await expect(
          GameOwner.Game.destroyAndRecover(
            gameToken.address,
            GameOwner.address,
            gameId,
            []
          )
        ).to.be.revertedWith('DESTROY_INVALID_FROM');
      });

      it('fails if sender != game owner and not metatx', async function () {
        const gameAsOther = await gameToken.connect(
          ethers.provider.getSigner(users[6].address)
        );
        await expect(
          gameAsOther.destroyAndRecover(
            gameToken.address,
            GameOwner.address,
            gameId,
            []
          )
        ).to.be.revertedWith('DESTROY_ACCESS_DENIED');
      });

      it('can destroy GAME and recover assets in 1 tx if not too many assets', async function () {
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
        expect(contractBalanceBefore).to.be.equal(quantities[0]);
        expect(contractBalanceBefore2).to.be.equal(quantities[1]);

        await GameOwner.Game.destroyAndRecover(
          GameOwner.address,
          GameOwner.address,
          gameId,
          assets
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
        const gameCreator = await gameToken.creatorOf(gameId);
        expect(gameCreator).to.be.equal(GameOwner.address);
      });

      it('game should no longer exist', async function () {
        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'NONEXISTANT_TOKEN'
        );
      });
    });

    describe('GameToken: Destroy... then Recover', function () {
      before(async function () {
        ({assets, quantities} = await supplyAssets(
          GameOwner.address,
          GameOwner.address,
          [7, 11]
        ));

        gameId = await getNewGame(
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameOwner,
          assets,
          quantities
        );
      });

      it('can destroy without transfer of assets', async function () {
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
        expect(contractBalanceBefore).to.be.equal(quantities[0]);
        expect(contractBalanceBefore2).to.be.equal(quantities[1]);

        await GameOwner.Game.destroyGame(
          GameOwner.address,
          GameOwner.address,
          gameId
        );

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
        expect(contractBalanceAfter).to.be.equal(quantities[0]);
        expect(contractBalanceAfter2).to.be.equal(quantities[1]);
      });

      it('fails to recover if "to" address is the gameToken contract', async function () {
        await expect(
          GameOwner.Game.recoverAssets(
            GameOwner.address,
            gameToken.address,
            gameId,
            [assets[0]]
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('fails to recover assets if caller is not from or validMetaTx', async function () {
        const gameAsOther = await gameToken.connect(
          ethers.provider.getSigner(users[6].address)
        );
        await expect(
          gameAsOther.recoverAssets(
            GameOwner.address,
            GameOwner.address,
            gameId,
            [assets[0]]
          )
        ).to.be.revertedWith('INVALID_RECOVERY_CALLER');
      });

      it('can recover remaining assets from burnt GAME in batches', async function () {
        const assetContract = await ethers.getContract('Asset');
        await expect(gameToken.ownerOf(gameId)).to.be.revertedWith(
          'NONEXISTANT_TOKEN'
        );

        await GameOwner.Game.recoverAssets(
          GameOwner.address,
          GameOwner.address,
          gameId,
          [assets[0]]
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

        expect(ownerBalanceAfter).to.be.equal(quantities[0]);
        expect(ownerBalanceAfter2).to.be.equal(0);
        expect(contractBalanceAfter).to.be.equal(0);
        expect(contractBalanceAfter2).to.be.equal(quantities[1]);

        await GameOwner.Game.recoverAssets(
          GameOwner.address,
          GameOwner.address,
          gameId,
          [assets[1]]
        );
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
      });
    });
  });

  describe('GameToken: Token Immutability', function () {
    //@note 3-part ID:
    it('should store the creator address, randomID & version in the gameId', async function () {});

    it('should update the version every time assets are added or removed', async function () {});

    //@note modifying the token should retain mappings to assets
    it('should map to game Assets using ONLY the creator address + randomId portion of the gameId', async function () {});

    //@note modifying the token should retain mappings to metadata
    it('should map to game MetaData using ONLY the creator address + randomId portion of the gameId', async function () {});

    // @note this is to prevent frontrunning a GAME-token purchase tx
    it('calling "destroyAndRecover" or "destroyGame" should increment the gameId version', async function () {});
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

    // it.skip('can process metaTransactions if processorType == METATX_SANDBOX', async function () {});

    // it.skip('can process metaTransactions if processorType == METATX_2771', async function () {
    //   const {gameToken, gameTokenAsAdmin, GameOwner} = await setupTest();
    //   const others = await getUnnamedAccounts();
    //   const signers = await ethers.getSigners();

    //   const trustedForwarderFactory = await ethers.getContractFactory(
    //     'Forwarder',
    //     signers[0]
    //   );
    //   const trustedForwarder: Contract = await trustedForwarderFactory.deploy();
    //   await trustedForwarder.deployed();
    //   const randomId = await getRandom();
    //   const receipt = await waitFor(
    //     gameTokenAsAdmin.createGame(
    //       GameOwner.address,
    //       GameOwner.address,
    //       [],
    //       [],
    //       ethers.constants.AddressZero,
    //       '',
    //       randomId
    //     )
    //   );
    //   const transferEvent = await expectEventWithArgs(
    //     gameToken,
    //     receipt,
    //     'Transfer'
    //   );
    //   const gameId = transferEvent.args[2];

    //   const txObj = await GameOwner.Game.populateTransaction[
    //     'safeTransferFrom(address,address,uint256)'
    //   ](GameOwner.address, others[3], gameId);

    //   let data = txObj.data;
    //   data += GameOwner.address.replace('0x', '');

    //   const transfer = {
    //     to: txObj.to,
    //     data: data,
    //     value: 0,
    //     from: GameOwner.address,
    //     nonce: 0,
    //     gas: 1e6,
    //   };

    //   const transferData712 = data712(gameToken, transfer);

    //   const flatSig = await ethers.provider.send('eth_signTypedData', [
    //     GameOwner.address,
    //     transferData712,
    //   ]);
    //   console.log(`sig: ${flatSig}`);

    //   const domainRegReceipt = await trustedForwarder.registerDomainSeparator(
    //     'The Sandbox',
    //     '1'
    //   );

    //   const domainRegistrationEvent = await expectEventWithArgsFromReceipt(
    //     trustedForwarder,
    //     domainRegReceipt,
    //     'DomainRegistered'
    //   );

    //   const registeredDomainHash = domainRegistrationEvent.args[0];

    //   const requestRegReceipt = await trustedForwarder.registerRequestType(
    //     'The Sandbox',
    //     '1'
    //   );

    //   const requestRegistrationEvent = await expectEventWithArgsFromReceipt(
    //     trustedForwarder,
    //     requestRegReceipt,
    //     'RequestTypeRegistered'
    //   );

    //   const registeredRequestHash = requestRegistrationEvent.args[0];

    //   expect(await trustedForwarder.domains(registeredDomainHash)).to.be.equal(
    //     true
    //   );
    //   expect(
    //     await trustedForwarder.typeHashes(registeredRequestHash)
    //   ).to.be.equal(true);

    //   const forwardingObject = await trustedForwarder.execute(
    //     transfer,
    //     registeredDomainHash,
    //     registeredRequestHash,
    //     '0x',
    //     flatSig
    //   );

    //   console.log(`forwardingObject:   ${forwardingObject}`);

    //   const newOwner = await gameToken.ownerOf(gameId);
    //   console.log(`newOwner:   ${newOwner}`);
    //   console.log(`3:   ${others[3]}`);
    //   console.log(`GameOwner.address:   ${GameOwner.address}`);
    //   expect(newOwner).to.be.equal(others[3]);
    //   expect(await gameToken.creatorOf(gameId)).to.be.equal(GameOwner.address);
    // });

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

      it('should fail if processorType == METATX_2771 && from != _forceMsgSender()', async function () {
        // Before:
        ({gameToken, GameOwner, gameTokenAsAdmin} = await setupTest());
        others = await getUnnamedAccounts();
        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsAdmin.createGame(
            GameOwner.address,
            GameOwner.address,
            [],
            [],
            ethers.constants.AddressZero,
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

        // Then:
        await gameTokenAsAdmin.setMetaTransactionProcessor(
          others[7],
          METATX_2771
        );
        const type = await gameToken.getMetaTransactionProcessorType(others[7]);
        expect(type).to.be.equal(METATX_2771);
        await expect(
          gameAsUser7.transferFrom(GameOwner.address, others[7], gameId)
        ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
      });
    });
  });
});
