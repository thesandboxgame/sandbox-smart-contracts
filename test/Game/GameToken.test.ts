import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract, BytesLike} from 'ethers';
import Prando from 'prando';
import {Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
import {waitFor, expectEventWithArgs, findEvents} from '../utils';
import {setupTest, User} from './fixtures';
import {supplyAssets} from './assets';
import {toUtf8Bytes} from 'ethers/lib/utils';

let id: BigNumber;

const METATX_SANDBOX = 1;
const METATX_2771 = 2;
const rng = new Prando('GameToken');

type Update = {
  assetIdsToRemove: BigNumber[];
  assetAmountsToRemove: number[];
  assetIdsToAdd: BigNumber[];
  assetAmountsToAdd: number[];
  uri: BytesLike;
};

const update: Update = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [],
  uri: utils.keccak256(ethers.utils.toUtf8Bytes('')),
};

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
      {...update, assetIdsToAdd: assetIds, assetAmountsToAdd: assetAmounts},
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
    const assets = await supplyAssets(GameOwner.address, [1]);
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

      const minterReceipt = await gameTokenAsMinter.createGame(
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
      expect(gameId).to.be.equal(gameIdFromTransfer);
      expect(ownerFromStorage).to.be.equal(users[4].address);
      expect(ownerFromEvent).to.be.equal(ownerFromStorage);
    });

    it('should revert if trying to reuse a baseId', async function () {
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
      ).to.be.revertedWith('BASEID_REUSE_FORBIDDEN');
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
        await expect(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            gameToken.address,
            {...update},
            ethers.constants.AddressZero,
            42
          )
        ).to.be.revertedWith('DESTINATION_GAME_CONTRACT');
      });

      it('can mint Games with single Asset', async function () {
        const assetContract = await ethers.getContract('Asset');

        const assets = await supplyAssets(GameOwner.address, [1]);

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
          [1]
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

        const assets = await supplyAssets(GameOwner.address, [3, 2]);

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

        const balanceBefore = await assetContract['balanceOf(address,uint256)'](
          gameToken.address,
          assetId
        );
        const balanceBefore2 = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, assetId2);
        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            {
              ...update,
              assetIdsToAdd: [assetId, assetId2],
              assetAmountsToAdd: [3, 2],
            },
            ethers.constants.AddressZero,
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
        eventAssets = updateEvent.args[2].assetIdsToAdd;
        values = updateEvent.args[2].assetAmountsToAdd;

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(3);
        expect(gameStateAfter[1]).to.be.equal(2);

        const balanceOf = await gameToken.balanceOf(GameOwner.address);
        const ownerOf = await gameToken.ownerOf(gameId);

        expect(balanceAfter).to.be.equal(balanceBefore + 3);
        expect(balanceAfter2).to.be.equal(balanceBefore2 + 2);
        expect(balanceOf).to.be.equal(1);
        expect(ownerOf).to.be.equal(GameOwner.address);
        expect(id).to.be.equal(gameId);
        expect(eventAssets).to.be.eql([assetId, assetId2]);
        expect(values).to.be.eql([BigNumber.from(3), BigNumber.from(2)]);
      });

      it('should fail if length of assetIds and values dont match', async function () {
        const assets = await supplyAssets(GameOwner.address, [3]);

        const assetId = assets[0];
        const randomId = await getRandom();
        await expect(
          waitFor(
            gameTokenAsMinter.createGame(
              GameOwner.address,
              GameOwner.address,
              {
                ...update,
                assetIdsToAdd: [assetId],
                assetAmountsToAdd: [11, 42],
              },
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
        const assets = await supplyAssets(GameOwner.address, [1]);
        const hashedUri = utils.keccak256(
          ethers.utils.toUtf8Bytes('Uri is this')
        );
        assetId = assets[0];
        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsMinter.createGame(
            GameOwner.address,
            GameOwner.address,
            {...update, uri: hashedUri},
            users[10].address,
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

        const updateEvent = await expectEventWithArgs(
          gameToken,
          receipt,
          'GameTokenUpdated'
        );

        const uriHash = updateEvent.args[2].uri;

        gameId = transferEvent.args[2];
        expect(uriHash).to.be.equal(hashedUri);
        expect(editorEvent.args[0]).to.be.equal(GameOwner.address);
        expect(editorEvent.args[1]).to.be.equal(users[10].address);
        expect(editorEvent.args[2]).to.be.equal(true);
      });

      it('should allow the owner to add game editors', async function () {
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
        const editor = users[1];
        await expect(
          gameToken.setGameEditor(users[1].address, editor.address, false)
        ).to.be.revertedWith('EDITOR_ACCESS_DENIED');
      });

      it('Minter can add single Asset', async function () {
        const assets = await supplyAssets(GameOwner.address, [1]);

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
        const hashedUri = utils.keccak256(toUtf8Bytes('Uri is different now'));
        const receipt = await waitFor(
          gameTokenAsMinter.updateGame(GameOwner.address, gameId, {
            ...update,
            assetIdsToAdd: [singleAssetId],
            assetAmountsToAdd: [1],
            uri: hashedUri,
          })
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
        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          singleAssetId,
        ]);

        const contractBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](gameToken.address, singleAssetId);
        const ownerBalanceAfter = await assetContract[
          'balanceOf(address,uint256)'
        ](GameOwner.address, singleAssetId);

        const eventAssets = updateEvent.args[2].assetIdsToAdd;
        const values = updateEvent.args[2].assetAmountsToAdd;

        expect(uriBefore).to.be.equal(
          'ipfs://bafybeifi4cv5sur4aljxzfma65zuemblnsahchn2pnji4h7cso63g3euha/110194434039389003190498847789203126033799499726478230611235431964839692468224.json'
        );

        expect(gameStateBefore[0]).to.be.equal(0);
        expect(uriAfter).to.be.equal(
          'ipfs://bafybeidm5kllzr2y3gbos3odrvw4irqla45jbvhiiknn537wlu6tnjhcmq/110194434039389003190498847789203126033799499726478230611235431964839692468224.json'
        );
        expect(gameStateAfter[0]).to.be.equal(1);
        expect(contractBalanceAfter).to.be.equal(contractBalanceBefore + 1);
        expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore - 1);
        expect(newIdFromTransfer).to.be.equal(gameId);
        expect(eventAssets[0]).to.be.equal(singleAssetId);
        expect(values[0]).to.be.equal(1);
      });

      it('should bump the version number in the gameId', async function () {
        const idAsHex = utils.hexValue(gameId);
        const creatorSlice = idAsHex.slice(0, 42);
        const randomIdSlice = idAsHex.slice(43, 58);
        const versionSlice = idAsHex.slice(58);
        expect(utils.getAddress(creatorSlice)).to.be.equal(GameOwner.address);
        expect(randomIdSlice).to.be.equal('000000020708760');
        expect(versionSlice).to.be.equal('00000002');
      });
      it('can get the original version of the gameId', async function () {
        const originalId = await gameToken.originalId(gameId);
        const originalAsHex = utils.hexValue(originalId);
        const creatorSlice = originalAsHex.slice(0, 42);
        const randomIdSlice = originalAsHex.slice(43, 58);
        const versionSlice = originalAsHex.slice(58);
        expect(utils.getAddress(creatorSlice)).to.be.equal(GameOwner.address);
        expect(randomIdSlice).to.be.equal('000000020708760');
        expect(versionSlice).to.be.equal('00000001');
      });

      it('Minter can add multiple Assets', async function () {
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

        const gameStateBefore = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateBefore[0]).to.be.equal(0);
        expect(gameStateBefore[1]).to.be.equal(0);

        const assetsAddedReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          {
            ...update,
            assetIdsToAdd: [assetId, assetId2],
            assetAmountsToAdd: [7, 42],
          }
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetsAddedReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
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

        const eventAssets = updateEvent.args[2].assetIdsToAdd;
        const values = updateEvent.args[2].assetAmountsToAdd;

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

        const assetRemovalReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          {
            ...update,
            assetIdsToRemove: [singleAssetId],
            assetAmountsToRemove: [1],
          }
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          singleAssetId,
        ]);
        expect(gameStateAfter[0]).to.be.equal(0);

        const eventAssets = updateEvent.args[2].assetIdsToRemove;
        const values = updateEvent.args[2].assetAmountsToRemove;
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
        await expect(
          gameTokenAsMinter.updateGame(GameOwner.address, gameId, {
            ...update,
            assetIdsToRemove: [singleAssetId, assetId, assetId2],
            assetAmountsToRemove: [25, 31, 2],
          })
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

        const assetRemovalReceipt = await gameTokenAsMinter.updateGame(
          GameOwner.address,
          gameId,
          {
            ...update,
            assetIdsToRemove: [assetId, assetId2],
            assetAmountsToRemove: [7, 31],
          }
        );

        const updateEvent = await expectEventWithArgs(
          gameToken,
          assetRemovalReceipt,
          'GameTokenUpdated'
        );
        gameId = updateEvent.args[1];

        const gameStateAfter = await gameToken.getAssetBalances(gameId, [
          assetId,
          assetId2,
        ]);
        expect(gameStateAfter[0]).to.be.equal(0);
        expect(gameStateAfter[1]).to.be.equal(11);

        const eventAssets = updateEvent.args[2].assetIdsToRemove;
        const values = updateEvent.args[2].assetAmountsToRemove;

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
      const assets = await supplyAssets(GameOwner.address, [1]);
      assetId = assets[0];
      const randomId = await getRandom();
      const receipt = await waitFor(
        gameTokenAsAdmin.createGame(
          GameOwner.address,
          GameOwner.address,
          {...update, assetIdsToAdd: [assetId], assetAmountsToAdd: [1]},
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
        'ipfs://bafybeih3z54v2d44nlci7gcha5edbu7johlt34mz2b3usdtpfwtvn3tsfa/110194434039389003190498847789203126033799499726478230611235542899988067516416.json'
      );
    });

    it('Minter can set the tokenURI', async function () {
      const receipt = await gameTokenAsAdmin.updateGame(
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
        'ipfs://bafybeibjjuirh6mb3gq36smqasbpz5vxf2ftxs2ezydxiauwkezw5abaqy/110194434039389003190498847789203126033799499726478230611235542899988067516416.json'
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
    let gameTokenAsAdmin: Contract;
    let GameOwner: User;
    let users: User[];
    let gameId: BigNumber;
    let assets: BigNumber[];

    before(async function () {
      ({gameToken, gameTokenAsAdmin, users, GameOwner} = await setupTest());

      assets = await supplyAssets(GameOwner.address, [7, 11]);

      gameId = await getNewGame(
        gameToken,
        gameTokenAsAdmin,
        GameOwner,
        GameOwner,
        assets,
        [7, 11]
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
        expect(contractBalanceBefore).to.be.equal(7);
        expect(contractBalanceBefore2).to.be.equal(11);

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
        assets = await supplyAssets(GameOwner.address, [7, 11]);

        gameId = await getNewGame(
          gameToken,
          gameTokenAsAdmin,
          GameOwner,
          GameOwner,
          assets,
          [7, 11]
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
        expect(contractBalanceBefore).to.be.equal(7);
        expect(contractBalanceBefore2).to.be.equal(11);

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
        expect(contractBalanceAfter).to.be.equal(7);
        expect(contractBalanceAfter2).to.be.equal(11);
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
        ).to.be.revertedWith('INVALID_RECOVERY');
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

        expect(ownerBalanceAfter).to.be.equal(7);
        expect(ownerBalanceAfter2).to.be.equal(0);
        expect(contractBalanceAfter).to.be.equal(0);
        expect(contractBalanceAfter2).to.be.equal(11);

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

  // @note Finish these:
  describe('GameToken: Token Immutability', function () {
    let gameToken: Contract;
    let gameTokenAsMinter: Contract;
    let gameTokenAsAdmin: Contract;
    let GameOwner: User;
    let users: User[];
    let gameId: BigNumber;
    let updatedGameId: BigNumber;
    let assets: BigNumber[];

    before(async function () {
      ({gameToken, gameTokenAsAdmin, users, GameOwner} = await setupTest());
      assets = await supplyAssets(GameOwner.address, [7, 11]);
      gameId = await getNewGame(
        gameToken,
        gameTokenAsAdmin,
        GameOwner,
        GameOwner,
        assets,
        [7, 11]
      );

      const {gameTokenAdmin} = await getNamedAccounts();
      gameTokenAsMinter = await gameToken.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );
    });

    it('should store the creator address, subID & version in the gameId', async function () {
      const idAsHex = utils.hexValue(gameId);
      const creator = idAsHex.slice(0, 42);
      const subId = idAsHex.slice(43, 58);
      const version = idAsHex.slice(58);
      expect(utils.getAddress(creator)).to.be.equal(users[0].address);
      expect(subId).to.be.equal('000000002cc26bf');
      expect(version).to.be.equal('00000001');
    });

    it('should update version when changes are made', async function () {
      let idAsHex = utils.hexValue(gameId);
      const versionBefore = idAsHex.slice(58);
      expect(versionBefore).to.be.equal('00000001');
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
      const versionAfter = idAsHex.slice(58);
      expect(versionAfter).to.be.equal('00000002');
    });

    it('should use baseId (creator address + subId) to map to game Assets & metaData ', async function () {
      const uriWithOldId = await gameToken.tokenURI(gameId);
      const uriWithUpdatedId = await gameToken.tokenURI(updatedGameId);
      const gameAssetsWithOldId = await gameToken.getAssetBalances(
        gameId,
        assets
      );
      const gameAssetsWithUpdatedId = await gameToken.getAssetBalances(
        updatedGameId,
        assets
      );
      expect(uriWithUpdatedId).to.be.equal(uriWithOldId);
      expect(gameAssetsWithOldId).to.deep.equal(gameAssetsWithUpdatedId);
    });
  });

  describe('GameToken: MetaTransactions', function () {
    it('can check "Trusted Forwarder" if MetaTransactionProcessor = METATX_2771', async function () {
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
    it('can set the MetaTransactionProcessor = METATX_SANDBOX', async function () {
      const {gameToken, gameTokenAsAdmin} = await setupTest();
      const others = await getUnnamedAccounts();
      await expect(gameTokenAsAdmin.setMetaTransactionProcessor(others[8], 1))
        .to.emit(gameTokenAsAdmin, 'MetaTransactionProcessor')
        .withArgs(others[8], METATX_SANDBOX);

      const type = await gameToken.getMetaTransactionProcessorType(others[8]);
      expect(type).to.be.equal(METATX_SANDBOX);
    });

    describe('GameToken: Invalid metaTransactions', function () {
      let gameAsUser7: Contract;
      let others: Address[];
      let gameId: BigNumber;
      let gameToken: Contract;
      let GameOwner: User;
      let gameTokenAsAdmin: Contract;

      it('should fail if processorType == METATX_2771 && from != _forceMsgSender()', async function () {
        ({gameToken, GameOwner, gameTokenAsAdmin} = await setupTest());
        others = await getUnnamedAccounts();
        const randomId = await getRandom();
        const receipt = await waitFor(
          gameTokenAsAdmin.createGame(
            GameOwner.address,
            GameOwner.address,
            {...update},
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
