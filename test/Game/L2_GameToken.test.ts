import {ethers, getNamedAccounts} from 'hardhat';
import {BigNumber, utils, Contract, BytesLike} from 'ethers';
import Prando from 'prando';
import {Address} from 'hardhat-deploy/types';
import {expect} from '../chai-setup';
import {waitFor, expectEventWithArgs} from '../utils';
import {setupTest, User} from './fixtures';
import {supplyAssets} from './assets';
const {defaultAbiCoder: abi} = utils;

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

function encodeMetaData(uri: string): string {
  return abi.encode(['string'], ['0x0']);
}

describe('L2_GameToken: Matic L2 Integration', function () {
  let gameToken: Contract;
  let L2_gameToken: Contract;
  let gameTokenAsMinter: Contract;
  let gameTokenAsPredicate: Contract;
  let GameOwner: User;
  let users: User[];
  let maticGameId1: BigNumber;
  let maticGameId2: BigNumber;
  let assets: BigNumber[];

  before(async function () {
    ({gameToken, L2_gameToken, GameOwner} = await setupTest());
    const {gameTokenAdmin, mintableAssetPredicate} = await getNamedAccounts();
    const L2_gameTokenAsAdmin = await L2_gameToken.connect(
      ethers.provider.getSigner(gameTokenAdmin)
    );
    await L2_gameTokenAsAdmin.changeMinter(gameTokenAdmin);
    assets = await supplyAssets(GameOwner.address, [7, 11]);
    maticGameId1 = await getNewGame(L2_gameToken, GameOwner, GameOwner, [], []);
    maticGameId2 = await getNewGame(L2_gameToken, GameOwner, GameOwner, [], []);

    gameTokenAsMinter = await gameToken.connect(
      ethers.provider.getSigner(gameTokenAdmin)
    );

    gameTokenAsPredicate = await gameToken.connect(
      ethers.provider.getSigner(mintableAssetPredicate)
    );
  });

  // @note no global before(...) !

  // @note setup subtests, ie:
  // - a series of expected outcomes when calling deposit, which can be reused if depositing a batch
  // - a series of expected outcomes when calling withdraw, which can be reused if calling withdrawBatch  & withdrawWithMetadata
  // ref: assetAttributesRegistry.test.ts/testSetCatalyst()

  describe('L2_GameToken: Deposits', function () {
    it('deposit function fails if called by ! ChildChainManager', async function () {});

    it('ChildChainManager can deposit single tokens when moving them from L1 to Matic', async function () {});

    it('sets withdrawnTokens to false for the deposited tokenId', async function () {});

    it('ChildChainManager can batch-deposit multiple tokens when moving them from L1 to Matic', async function () {});

    it('sets withdrawnTokens mapping to false for each of the deposited tokenIds', async function () {});

    it('reuses the existing L1 tokenId for deposited tokens', async function () {
      // expect(l2gameId).to.be.equal(l1gameId)
      // expect(l2gameVersion).to.be.equal(l1gameVersion)
      // expect(l2storageId).to.be.equal(l1storageId)
    });

    it('sets the _owners mapping correctly for deposited tokens', async function () {});
  });

  describe('L2_GameToken: Withdrawals', function () {
    it('can use encodeTokenMetadata prior to calling withdrawWithMetadata', async function () {});

    it('withdraw() fails if sender != owner of token', async function () {});

    it('can use withdraw function to exit a token to the root chain ...', async function () {});

    it('updates the _owners mapping correctly for the withdrawn token', async function () {});

    it('sets withdrawnTokens mapping to true for the withdrawn token', async function () {});

    it('calls _burn() with the tokenId being withdrawn', async function () {});

    it('withdrawBatch fails if batch size exceeds BATCH_LIMIT', async function () {});

    it('withdrawBatch fails if sender != owner of token for eny tokenId in Batch', async function () {});

    it('can use withdrawBatch function to exit multiple tokens to the root chain', async function () {});

    it('calling withdrawBatch calls _burn for each tokenId in  Batch', async function () {});

    it('calling withdrawBatch emits the WithdrawnBatch event', async function () {});

    it('can use withdrawWithMetadata function to exit a tokens to the root chain with metaData', async function () {});

    it('calling withdrawWithMetadata function calls _burn() with the tokenId', async function () {});

    it('calling withdrawWithMetadata function emits the TransferWithMetadata event with correct args', async function () {});
  });

  describe('L2_GameToken: L1-minted tokens', function () {});
  describe('L2_GameToken: Matic-minted tokens', function () {});
  describe('L2_GameToken: Burning', function () {});
});
