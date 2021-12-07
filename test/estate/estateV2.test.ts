import {setupEstate} from './fixtures';
import {expectEventWithArgs, waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';
import {supplyAssets} from '../Game/assets';
import {BigNumber, Contract} from 'ethers';
import {getNewGame} from './utils';
import {Address} from 'hardhat-deploy/types';

const emptyBytes = Buffer.from('');

type LandMintingData = {
  beneficiary: string;
  size: number;
  x: number;
  y: number;
};
async function mintLands(
  landContractAsMinter: Contract,
  mintingData: LandMintingData[]
): Promise<BigNumber[]> {
  const landIds: BigNumber[] = [];
  for (const data of mintingData) {
    const receipt = await waitFor(
      landContractAsMinter.mintQuad(
        data.beneficiary,
        data.size,
        data.x,
        data.y,
        emptyBytes
      )
    );
    const events = await expectEventWithArgs(
      landContractAsMinter,
      receipt,
      'Transfer'
    );
    const landId = events.args[2];
    landIds.push(landId);
  }
  return landIds;
}
async function mintGames(
  gameTokenContract: Contract,
  creator: Address,
  supplies: number[],
  nextId: number
): Promise<{gameIds: BigNumber[]; lastId: number}> {
  const gameIds: BigNumber[] = [];
  const assets = await supplyAssets(creator, supplies);
  for (let i = 0; i < assets.length; i++) {
    const gameId = await getNewGame(
      gameTokenContract,
      creator,
      creator,
      [assets[i]],
      [supplies[i]],
      i + nextId
    );
    gameIds.push(gameId);
  }
  return {gameIds, lastId: nextId + assets.length};
}
describe('EstateV2', function () {
  // createEstate
  it('create should fail on empty land array', async function () {
    const {estateContract, user0, landContractAsMinter} = await setupEstate();
    const size = 1;
    const x = 6;
    const y = 12;
    const uri =
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

    await waitFor(landContractAsMinter.mintQuad(user0, size, x, y, emptyBytes));
    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [],
          gameIds: [],
          uri,
        })
    ).to.be.revertedWith(`EMPTY_LAND_IDS_ARRAY`);
  });

  it('create should fail on different sizes for land, game arrays', async function () {
    const {estateContract, landContractAsMinter, user0} = await setupEstate();
    const size = 1;
    const x = 6;
    const y = 12;
    const uri =
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    await waitFor(landContractAsMinter.mintQuad(user0, size, x, y, emptyBytes));

    const landMintingEvents = await landContractAsMinter.queryFilter(
      landContractAsMinter.filters.Transfer()
    );

    const event = landMintingEvents.filter((e) => e.event === 'Transfer')[0];
    expect(event.args).not.be.equal(null);
    if (event.args) {
      const landId = event.args[2];
      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: [landId],
            gameIds: [],
            uri,
          })
      ).to.be.revertedWith(`DIFFERENT_LENGTH_LANDS_GAMES`);
    }
  });
  it('create an estate with a single land and game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
    }
  });

  it('create an estate with two lands and games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }
    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      const estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
  });

  it('create should fail for unordered list of lands with the same game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    let {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);
    gameIds = [gameIds[0], gameIds[1], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    ).to.be.revertedWith('BATCHTRANSFERFROM_NOT_OWNER');
  });
  // addLandsToEstate
  it('adding lands without games to an existing estate with lands and games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    // mint and add new lands (w/o games) to the existing estate
    const mintingData2: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(
        estateContract.address,
        landIdsToAdd[i]
      );
    }

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .addLandsGamesToEstate(user0, user0, estateId, {
          landIds: landIdsToAdd,
          gameIds: [0, 0],
          uri,
        })
    );

    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
    }
    const newEstateData = await estateContract.callStatic.getEstateData(newId);
    const mergedGames = [
      ...gameIds,
      ...[BigNumber.from('0'), BigNumber.from('0')],
    ];
    const mergedLands = [...landIds, ...landIdsToAdd];
    expect(newEstateData.gameIds).to.be.eql(mergedGames);
    expect(newEstateData.landIds).to.be.eql(mergedLands);
  });
  it('adding lands with games to an existing estate with lands and games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGamesRes = await mintGames(gameToken, user0, [1, 1], 0);
    const {gameIds} = mintGamesRes;
    const lastId = mintGamesRes.lastId;

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    // mint and add new lands (w/o games) to the existing estate
    const mintingData2: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);
    const gameIdsToAdd = await mintGames(gameToken, user0, [1, 1], lastId);
    const _gamesToAdd = gameIdsToAdd.gameIds;

    for (let i = 0; i < landIdsToAdd.length; i++) {
      await landContractAsUser0.approve(
        estateContract.address,
        landIdsToAdd[i]
      );
      await gameTokenAsUser0.approve(estateContract.address, _gamesToAdd[i]);
    }

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .addLandsGamesToEstate(user0, user0, estateId, {
          landIds: landIdsToAdd,
          gameIds: _gamesToAdd,
          uri,
        })
    );

    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    if (event.args[0]) {
      const newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
    }
  });
  it('adding lands to an existing estate using an existing game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGamesRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGamesRes.gameIds;
    gameIds = [gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    for (const gameId of gameIds) {
      const newOwner = await gameToken.ownerOf(gameId);
      expect(newOwner).to.be.equal(estateContract.address);
    }
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    // mint and add new lands (w/o games) to the existing estate
    const mintingData2: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

    for (let i = 0; i < landIdsToAdd.length; i++) {
      await landContractAsUser0.approve(
        estateContract.address,
        landIdsToAdd[i]
      );
    }
    console.log('before addLandsGamesToEstate');
    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .addLandsGamesToEstate(user0, user0, estateId, {
          landIds: landIdsToAdd,
          gameIds: gameIds,
          uri,
        })
    );

    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    if (event.args[0]) {
      const newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
      const estateData2 = await estateContract.callStatic.getEstateData(newId);
      expect(estateData2.gameIds).to.be.eql([...gameIds, ...gameIds]);
      expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
    }
  });
  // removeLandsFromEstate
  it('removing lands from an existing estate with lands and games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGamesRes = await mintGames(gameToken, user0, [1, 1], 0);
    const {gameIds} = mintGamesRes;

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    const landIdsToRemove = [landIds[0]];

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .removeLandsFromEstate(user0, user0, estateId, {
          landIds: landIdsToRemove,
          gameIds: [],
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    if (event.args[0]) {
      const newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.be.eql([gameIds[1]]);
      expect(newEstateData.landIds).to.be.eql([landIds[1]]);
    }
  });

  it('removing land that are associated with a game associated with more lands should fail', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);
    gameIds.push(...gameIds);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const landIdsToRemove = [landIds[1]];
    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .removeLandsFromEstate(user0, user0, estateId, {
          landIds: landIdsToRemove,
          gameIds: [],
          uri,
        })
    ).to.be.revertedWith('GAME_IS_ATTACHED_TO_OTHER_LANDS');
  });
  it('removing all lands associated with a single game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    let {gameIds} = await mintGames(gameToken, user0, [1], 0);

    gameIds = [gameIds[0], gameIds[0], gameIds[0]];
    //passing the same game ids,

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;

    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    const landIdsToRemove = landIds;
    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .removeLandsFromEstate(user0, user0, estateId, {
        landIds: landIdsToRemove,
        gameIds: [],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql([]);
      expect(newEstateData.landIds).to.eql([]);
    }
  });
  it('removing an unordered list of lands that associated with the same game should fail', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    let {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);
    gameIds = [gameIds[0], gameIds[0], gameIds[1]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const landIdsToRemove = [landIds[0], landIds[2], landIds[1]];
    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .removeLandsFromEstate(user0, user0, estateId, {
          landIds: landIdsToRemove,
          gameIds: [],
          uri,
        })
    ).to.be.revertedWith('BATCHTRANSFERFROM_NOT_OWNER');
  });
  it('removing an ordered list of lands that associated with the same game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    let {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);
    gameIds = [gameIds[0], gameIds[0], gameIds[1]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;

    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    //estate created, now remove lands
    const landIdsToRemove = landIds;

    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .removeLandsFromEstate(user0, user0, estateId, {
        landIds: landIdsToRemove,
        gameIds: [],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql([]);
      expect(newEstateData.landIds).to.eql([]);
    }
  });
  // setGameOfLands
  it('setting the game for all lands to 0', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    let {gameIds} = await mintGames(gameToken, user0, [1], 0);
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .setGamesOfLands(user0, user0, estateId, {
        landIds: landIds,
        gameIds: [0, 0, 0],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql([
        BigNumber.from('0'),
        BigNumber.from('0'),
        BigNumber.from('0'),
      ]);
      expect(newEstateData.landIds).to.eql(landIds);
    }
  });
  it('setting the game for all lands to the same gameId', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    const {lastId} = mintGameRes;
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const mintGameRes2 = await mintGames(gameToken, user0, [1], lastId);
    const gameId2 = mintGameRes2.gameIds[0];
    await gameTokenAsUser0.approve(estateContract.address, gameId2);

    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .setGamesOfLands(user0, user0, estateId, {
        landIds: landIds,
        gameIds: [gameId2, gameId2, gameId2],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql([gameId2, gameId2, gameId2]);
      expect(newEstateData.landIds).to.eql(landIds);
    }
  });

  it('setting different games for lands with the same game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    const {lastId} = mintGameRes;
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const mintGameRes2 = await mintGames(gameToken, user0, [1, 1, 1], lastId);
    const gameIds2 = mintGameRes2.gameIds;

    for (let i = 0; i < gameIds2.length; i++) {
      await gameTokenAsUser0.approve(estateContract.address, gameIds2[i]);
    }

    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .setGamesOfLands(user0, user0, estateId, {
        landIds: landIds,
        gameIds: gameIds2,
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql(gameIds2);
      expect(newEstateData.landIds).to.eql(landIds);
    }
  });
  it('setting a game that is associated with two lands to zero only for one land should not withdraw the game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }

    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .setGamesOfLands(user0, user0, estateId, {
        landIds: [landIds[0]],
        gameIds: [0],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.eql([BigNumber.from(0), gameIds[0]]);
      expect(newEstateData.landIds).to.eql(landIds);
      expect(await gameToken.ownerOf(gameIds[0])).to.be.equal(
        estateContract.address
      );
    }
  });
  // burn
  it('burn should fail for a non-existing estate', async function () {
    const {estateContract, user0} = await setupEstate();

    await expect(
      estateContract.connect(ethers.provider.getSigner(user0)).burn(42)
    ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST');
  });
  it('should burn an estate successfuly', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
    }
  });
  it('should fail to burn same estate twice', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
      await expect(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST');
    }
  });
  it('adding lands to a burned estate should fail', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [0],
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
        {beneficiary: user0, size: 1, x: 4, y: 12},
        {beneficiary: user0, size: 1, x: 4, y: 11},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData2);
      const mintGameRes = await mintGames(gameToken, user0, [1], 0);
      let gameIds = mintGameRes.gameIds;
      gameIds = [gameIds[0], gameIds[0], gameIds[0]];

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
        await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
      }

      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIds,
            gameIds: gameIds,
            uri,
          })
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST');
    }
  });
  it('removing lands from a burned estate should fail', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [0],
          uri,
        })
    );
    const newLandOwner = await landContractAsUser0.ownerOf(landIds[0]);
    expect(newLandOwner).to.be.equal(estateContract.address);
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIds,
            gameIds: [],
            uri,
          })
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST');
    }
  });
  it('setGamesOfLands lands from a burned estate should fail', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [0],
          uri,
        })
    );
    const newLandOwner = await landContractAsUser0.ownerOf(landIds[0]);
    expect(newLandOwner).to.be.equal(estateContract.address);
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .setGamesOfLands(user0, user0, estateId, {
            landIds: landIds,
            gameIds: [0],
            uri,
          })
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST');
    }
  });
  // transferFromBurnedEstate
  it('burn an estate, transfer lands and games from it', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      const res = await estateContract.isBurned(estateId);
      expect(res).to.be.equal(true);
      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFromBurnedEstate(user0, user0, estateId, [landIds[0]])
      );

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFromBurnedEstate(user0, user0, estateId, [
            landIds[1],
            landIds[2],
          ])
      );
      const newEstateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(newEstateData.gameIds).to.eql([]);
      expect(newEstateData.landIds).to.eql([]);
      const newGameOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newGameOwner).to.be.equal(user0);
      for (let i = 0; i < landIds.length; i++) {
        const newLandOwner = await landContractAsMinter.ownerOf(landIds[i]);
        expect(newLandOwner).to.be.equal(user0);
      }
    }
  });
  it('transferFromBurnedEstate should fail for non-burned estate', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );
    const event = await expectEventWithArgs(
      estateContract,
      receipt,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let estateId;
    if (event.args[0]) {
      estateId = event.args[1].toHexString();
      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFromBurnedEstate(user0, user0, estateId, [
            landIds[1],
            landIds[2],
          ])
      ).to.be.revertedWith('ASSET_NOT_BURNED');
    }
  });
  it('trying to transfer estate', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      user1,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await estateContract
      .connect(ethers.provider.getSigner(user0))
      .createEstate(user0, user0, {
        landIds: landIds,
        gameIds: gameIds,
        uri,
      });

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFrom(user0, user1, estateId)
      );
    }

    //now user 2 remove lands
    const landIdsToRemove = [landIds[0]];

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user1))
        .removeLandsFromEstate(user1, user1, estateId, {
          landIds: landIdsToRemove,
          gameIds: [],
          uri,
        })
    );

    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );

    expect(event.args).not.be.equal(null);
    if (event.args[0]) {
      const newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      expect(newEstateData.gameIds).to.be.eql([gameIds[1]]);
      expect(newEstateData.landIds).to.be.eql([landIds[1]]);
    }
  });
  it('trying to remove all games from estate', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      user1,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await estateContract
      .connect(ethers.provider.getSigner(user0))
      .createEstate(user0, user0, {
        landIds: landIds,
        gameIds: gameIds,
        uri,
      });

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFrom(user0, user1, estateId)
      );
    }

    //now user 2 remove games
    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user1))
        .setGamesOfLands(user1, user1, estateId, {
          landIds: landIds,
          gameIds: [0, 0],
          uri,
        })
    );

    console.log('GAS USED for removing 1 game ' + receipt2.gasUsed);

    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );

    expect(event.args).not.be.equal(null);
    if (event.args[0]) {
      const newId = event.args[1].toHexString();
      const newVersion = Number(newId.substring(62));
      const oldVersion = Number(estateId.toHexString().substring(62));
      expect(newVersion).to.be.equal(oldVersion + 1);
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );

      expect(newEstateData.gameIds[0].toNumber()).to.be.eql(0);
      expect(newEstateData.gameIds[1].toNumber()).to.be.eql(0);
      expect(newEstateData.landIds).to.be.eql(landIds);
    }
  });

  it('Add tests - validate that a burned estate can’t be transferred  ', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      user1,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      //now burn!
      await waitFor(
        estateContract.connect(ethers.provider.getSigner(user0)).burn(estateId)
      );
      //see if we can transfer the burned token

      await expect(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .transferFrom(user0, user1, estateId)
      ).to.be.revertedWith('NONEXISTENT_TOKEN');
    }
  });

  it('remove all games from estate then burn and then get transfer from burned', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);

    let estateId;
    if (estateCreationEvent[0].args) {
      estateId = estateCreationEvent[0].args[1];

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .setGamesOfLands(user0, user0, estateId, {
            landIds: landIds,
            gameIds: [0, 0],
            uri,
          })
      );

      const estateCreationEvents2 = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );

      const estateCreationEvent2 = estateCreationEvents2.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );

      if (estateCreationEvent2[1].args) {
        const newIdStr = estateCreationEvent2[1].args[1].toHexString();

        await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .burn(newIdStr)
        );

        const numberTokens = await estateContract.callStatic.balanceOf(user0);

        expect(numberTokens).to.be.equal(0);
      }

      const estateCreationEvents3 = await estateContract.queryFilter(
        estateContract.filters.Transfer()
      );

      const estateCreationEvent3 = estateCreationEvents3.filter(
        (e) => e.event === 'Transfer'
      );

      if (estateCreationEvent3[2].args) {
        const burnId = estateCreationEvent3[2].args[2].toHexString();

        await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .transferFromBurnedEstate(user0, user0, burnId, landIds)
        );
      }
    }

    for (let i = 0; i < landIds.length; i++) {
      const newLandOwner = await landContractAsMinter.ownerOf(landIds[i]);
      expect(newLandOwner).to.be.equal(user0);
    }
    for (let i = 0; i < gameIds.length; i++) {
      const newLandOwner = await gameToken.ownerOf(gameIds[i]);
      expect(newLandOwner).to.be.equal(user0);
    }
  });
  it('create estate with only one game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await landContractAsUser0.approve(estateContract.address, landIds[0]);

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [gameIds[0], gameIds[0]],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );

    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    expect(estateCreationEvent[0].args).not.be.equal(null);
  });
  it('test getLandsForGame', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
    }
    await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);
    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [gameIds[0], gameIds[0]],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      const lands = await estateContract.callStatic.getLandsForGame(gameIds[0]);
      expect(lands).to.be.eql(landIds);
    }
  });

  it('Remove lands and add new lands', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);
    gameIds.push(...gameIds);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const landIdsToRemove = landIds;

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .removeLandsFromEstate(user0, user0, estateId, {
          landIds: landIdsToRemove,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents2 = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent2 = estateCreationEvents2.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    console.log(estateCreationEvent2);

    expect(estateCreationEvent2[1].args).not.be.equal(null);
    let estateId2;
    if (estateCreationEvent2[1].args) {
      //expect(estateCreationEvent2[1].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent2[1].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent2[1].args[2].uri).to.be.equal(uri);
      const estateId2 = estateCreationEvent2[1].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId2
      );
      //expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql([]);
      console.log(estateData.gameIds);
    }
  });

  it('setting less games than lands', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 11},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    const {lastId} = mintGameRes;
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[0], gameIds[0]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.gameIds).to.be.eql(gameIds);
      expect(estateData.landIds).to.be.eql(landIds);
    }
    const mintGameRes2 = await mintGames(gameToken, user0, [1], lastId);
    const gameId2 = mintGameRes2.gameIds[0];
    await gameTokenAsUser0.approve(estateContract.address, gameId2);

    const receipt2 = await estateContract
      .connect(ethers.provider.getSigner(user0))
      .setGamesOfLands(user0, user0, estateId, {
        landIds: [landIds[0], landIds[1]],
        gameIds: [gameId2, gameId2],
        uri,
      });
    const event = await expectEventWithArgs(
      estateContract,
      receipt2,
      'EstateTokenUpdated'
    );
    expect(event.args).not.be.equal(null);
    let newId;
    if (event.args[0]) {
      newId = event.args[1].toHexString();
      const newEstateData = await estateContract.callStatic.getEstateData(
        newId
      );
      //expect(newEstateData.gameIds).to.eql([gameId2, gameId2, 0]);
      //expect(newEstateData.landIds).to.eql(landIds);
      console.log('game tokens ' + newEstateData.gameIds);
      console.log('land tokens ' + newEstateData.landIds);
    }
  });

  /* it('starting with 3 lands and then adding the rest for a 6 lands game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 8, y: 12},
      {beneficiary: user0, size: 1, x: 9, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [
      gameIds[0],
      gameIds[0],
      gameIds[0],
      gameIds[0],
      gameIds[0],
      gameIds[0],
    ];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
    }
    await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [landIds[0], landIds[1], landIds[2]],
          gameIds: [0, 0, 0],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      //expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      //expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.landIds).to.be.eql([
        landIds[0],
        landIds[1],
        landIds[2],
      ]);

      const receipt2 = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIds,
            gameIds: gameIds,
            uri,
          })
      );
      console.log('GAS USED ' + receipt2.gasUsed);
    }

    const estateCreationEvents2 = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent2 = estateCreationEvents2.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );

    if (estateCreationEvent2[1].args) {
      const newIdStr = estateCreationEvent2[1].args[1].toHexString();
      const estateData2 = await estateContract.callStatic.getEstateData(
        newIdStr
      );
      expect(estateData2.landIds).to.be.eql(landIds);
    }
  }); */

  /* it('start and update', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 8, y: 12},
      {beneficiary: user0, size: 1, x: 9, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1, 1, 1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [
      gameIds[0],
      gameIds[1],
      gameIds[2],
      gameIds[0],
      gameIds[1],
      gameIds[2],
    ];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }
    //await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [landIds[0], landIds[1], landIds[2]],
          gameIds: [0, 0, 0],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      //expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      //expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      estateId = estateCreationEvent[0].args[1];
      console.log('first estate id: ' + estateId);
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.landIds).to.be.eql([
        landIds[0],
        landIds[1],
        landIds[2],
      ]);

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .updateEstate(user0, user0, estateId, {
            landAndGameAssociations: [
              [landIds[3], gameIds[0]],
              [landIds[4], gameIds[1]],
              [landIds[5], gameIds[2]],
            ],
            gameIdsToAdd: [gameIds[0], gameIds[1], gameIds[2]],
            landIdsToRemove: [],
            gameIdsToRemove: [],
            uri,
          })
      );

      const estateCreationEvents2 = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdatedII()
      );
      const estateCreationEvent2 = estateCreationEvents2.filter(
        (e) => e.event === 'EstateTokenUpdatedII'
      );

      if (estateCreationEvent2[0].args) {
        const newIdStr = estateCreationEvent2[0].args[1];
        console.log('second estate id: ' + newIdStr);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newIdStr
        );
        console.log('Estate data ' + estateData2);

        //console.log('estate id ' + newIdStr);

        await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .updateEstate(user0, user0, newIdStr, {
              landAndGameAssociations: [
                [landIds[3], gameIds[1]],
                [landIds[4], gameIds[2]],
                [landIds[5], gameIds[0]],
              ],
              gameIdsToAdd: [],
              landIdsToRemove: [],
              gameIdsToRemove: [],
              uri,
            })
        );
        //console.log(receipt3);
      }

      const estateCreationEvents3 = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdatedII()
      );
      const estateCreationEvent3 = estateCreationEvents3.filter(
        (e) => e.event === 'EstateTokenUpdatedII'
      );

      if (estateCreationEvent3[0].args) {
        const newIdStr2 = estateCreationEvent3[0].args[1];
        console.log('second estate id: ' + newIdStr2);
        const estateData3 = await estateContract.callStatic.getEstateData(
          newIdStr2
        );
        console.log('Estate data 2 ' + estateData3);
      }
    }
  }); */

  /* it('create with just lands and remove lands', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
    }
    //await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [landIds[0], landIds[1], landIds[2]],
          gameIds: [0, 0, 0],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      estateId = estateCreationEvent[0].args[1];

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .updateEstate(user0, user0, estateId, {
            landAndGameAssociations: [],
            gameIdsToAdd: [],
            landIdsToRemove: [landIds[0], landIds[1], landIds[2]],
            gameIdsToRemove: [],
            uri,
          })
      );

      const estateCreationEvents2 = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdatedII()
      );
      const estateCreationEvent2 = estateCreationEvents2.filter(
        (e) => e.event === 'EstateTokenUpdatedII'
      );

      if (estateCreationEvent2[0].args) {
        const newIdStr = estateCreationEvent2[0].args[1];
        console.log('second estate id: ' + newIdStr);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newIdStr
        );
        console.log('Estate data ' + estateData2);

        expect(estateData2.landIds).to.be.eql([]);

        //console.log(receipt3);
      }
    }
  }); */
  /* it('remove games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGameRes = await mintGames(gameToken, user0, [1, 1, 1], 0);
    let gameIds = mintGameRes.gameIds;
    gameIds = [gameIds[0], gameIds[1], gameIds[2]];

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }
    //await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [landIds[0], landIds[1], landIds[2]],
          gameIds: [gameIds[0], gameIds[1], gameIds[2]],
          uri,
        })
    );

    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    let estateId;
    if (estateCreationEvent[0].args) {
      estateId = estateCreationEvent[0].args[1];
      const estateData = await estateContract.callStatic.getEstateData(
        estateId
      );
      expect(estateData.landIds).to.be.eql([
        landIds[0],
        landIds[1],
        landIds[2],
      ]);

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .updateEstate(user0, user0, estateId, {
            landAndGameAssociations: [],
            gameIdsToAdd: [],
            landIdsToRemove: [],
            gameIdsToRemove: [gameIds[0], gameIds[1], gameIds[2]],
            uri,
          })
      );

      const estateCreationEvents2 = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdatedII()
      );
      const estateCreationEvent2 = estateCreationEvents2.filter(
        (e) => e.event === 'EstateTokenUpdatedII'
      );

      if (estateCreationEvent2[0].args) {
        const newIdStr = estateCreationEvent2[0].args[1];
        const estateData2 = await estateContract.callStatic.getEstateData(
          newIdStr
        );
        console.log('second estate: ' + estateData2);
        expect(estateData2.gameIds).to.be.eql([]);

        //console.log(receipt3);
      }
    }
  }); */
  it('create an estate with 3 lands and 3 games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
    }
    console.log('GAS USED ' + receipt2.gasUsed);
  });
  it('create an estate with 6 lands and 6 games', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 8, y: 12},
      {beneficiary: user0, size: 1, x: 9, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1, 1, 1, 1, 1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
    }
    console.log('GAS USED ' + receipt2.gasUsed);
  });
  it('create an estate with 9 lands and 1 game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 8, y: 12},
      {beneficiary: user0, size: 1, x: 9, y: 12},
      {beneficiary: user0, size: 1, x: 10, y: 12},
      {beneficiary: user0, size: 1, x: 11, y: 12},
      {beneficiary: user0, size: 1, x: 12, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
    }
    await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
          ],
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql([
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
      ]);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
    }
    console.log('GAS USED ' + receipt2.gasUsed);
  });
  /* it('create an estate with 9 lands and 1 game and remove 3 lands', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 1, x: 5, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
      {beneficiary: user0, size: 1, x: 6, y: 12},
      {beneficiary: user0, size: 1, x: 7, y: 12},
      {beneficiary: user0, size: 1, x: 8, y: 12},
      {beneficiary: user0, size: 1, x: 9, y: 12},
      {beneficiary: user0, size: 1, x: 10, y: 12},
      {beneficiary: user0, size: 1, x: 11, y: 12},
      {beneficiary: user0, size: 1, x: 12, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
    }
    await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: [
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
            gameIds[0],
          ],
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].gameIds).to.be.eql([
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
        gameIds[0],
      ]);
      expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      const estateId = estateCreationEvent[0].args[1];

      const receipt2 = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: [
              landIds[0],
              landIds[1],
              landIds[2],
              landIds[3],
              landIds[4],
              landIds[5],
            ],
            gameIds: [
              gameIds[0],
              gameIds[0],
              gameIds[0],
              gameIds[0],
              gameIds[0],
              gameIds[0],
            ],
            uri,
          })
      );
      console.log('GAS USED ' + receipt2.gasUsed);
    }
  }); */
  /* it('create an estate with 256 lands and 1 game', async function () {
    const {
      estateContract,
      landContractAsMinter,
      landContractAsUser0,
      user0,
      gameToken,
      gameTokenAsUser0,
    } = await setupEstate();

    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const mintingData: LandMintingData[] = [
      {beneficiary: user0, size: 24, x: 0, y: 0},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1], 0);

    await landContractAsUser0.setApprovalForAll(estateContract.address, true);
    await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);
    const ids = [];
    const manyGames = [];

    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        //await landContractAsUser0.approve(estateContract.address, i + j * 408);
        ids.push(i + j * 408);
        manyGames.push(gameIds[0]);
      }
    }

    const receipt2 = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: ids,
          gameIds: manyGames,
          uri,
        })
    );

    const newOwner = await gameToken.ownerOf(gameIds[0]);
    expect(newOwner).to.be.equal(estateContract.address);
    const estateCreationEvents = await estateContract.queryFilter(
      estateContract.filters.EstateTokenUpdated()
    );
    const estateCreationEvent = estateCreationEvents.filter(
      (e) => e.event === 'EstateTokenUpdated'
    );
    expect(estateCreationEvent[0].args).not.be.equal(null);
    if (estateCreationEvent[0].args) {
      expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
    }
    console.log('GAS USED ' + receipt2.gasUsed);
  }); */
  describe('GasTest for estate creation', function () {
    it('gas 1 lands and 0 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 2 lands and 0 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
        {beneficiary: user0, size: 1, x: 6, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 3 lands and 0 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 4 lands and 0 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 5 lands and 0 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 5, y: 12},
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 1 land and 1 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);
      const {gameIds} = await mintGames(gameToken, user0, [1], 0);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
        await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: gameIds,
            uri,
          })
      );

      const newOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newOwner).to.be.equal(estateContract.address);
      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 2 land and 1 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);
      const {gameIds} = await mintGames(gameToken, user0, [1], 0);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [gameIds[0], gameIds[0]],
            uri,
          })
      );

      const newOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newOwner).to.be.equal(estateContract.address);
      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
        console.log(estateCreationEvent[0].args[2].gameIds);
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 3 land and 1 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);
      const {gameIds} = await mintGames(gameToken, user0, [1], 0);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [gameIds[0], gameIds[0], gameIds[0]],
            uri,
          })
      );

      const newOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newOwner).to.be.equal(estateContract.address);
      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
        console.log(estateCreationEvent[0].args[2].gameIds);
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 4 land and 1 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);
      const {gameIds} = await mintGames(gameToken, user0, [1], 0);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [gameIds[0], gameIds[0], gameIds[0], gameIds[0]],
            uri,
          })
      );

      const newOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newOwner).to.be.equal(estateContract.address);
      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
        console.log(estateCreationEvent[0].args[2].gameIds);
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('gas 5 land and 1 games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
        gameToken,
        gameTokenAsUser0,
      } = await setupEstate();

      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);
      const {gameIds} = await mintGames(gameToken, user0, [1], 0);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await gameTokenAsUser0.approve(estateContract.address, gameIds[0]);

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [
              gameIds[0],
              gameIds[0],
              gameIds[0],
              gameIds[0],
              gameIds[0],
            ],
            uri,
          })
      );

      const newOwner = await gameToken.ownerOf(gameIds[0]);
      expect(newOwner).to.be.equal(estateContract.address);
      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      if (estateCreationEvent[0].args) {
        //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
        console.log(estateCreationEvent[0].args[2].gameIds);
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    describe('GasTest for two games', function () {
      it('gas 2 land and 2 games', async function () {
        const {
          estateContract,
          landContractAsMinter,
          landContractAsUser0,
          user0,
          gameToken,
          gameTokenAsUser0,
        } = await setupEstate();

        const uri =
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const mintingData: LandMintingData[] = [
          {beneficiary: user0, size: 1, x: 6, y: 12},
          {beneficiary: user0, size: 1, x: 7, y: 12},
        ];
        const landIds = await mintLands(landContractAsMinter, mintingData);
        const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

        for (let i = 0; i < landIds.length; i++) {
          await landContractAsUser0.approve(estateContract.address, landIds[i]);
        }

        for (let j = 0; j < landIds.length; j++) {
          await gameTokenAsUser0.approve(estateContract.address, gameIds[j]);
        }

        const receipt = await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .createEstate(user0, user0, {
              landIds: landIds,
              gameIds: gameIds,
              uri,
            })
        );

        const newOwner = await gameToken.ownerOf(gameIds[0]);
        expect(newOwner).to.be.equal(estateContract.address);
        const estateCreationEvents = await estateContract.queryFilter(
          estateContract.filters.EstateTokenUpdated()
        );
        const estateCreationEvent = estateCreationEvents.filter(
          (e) => e.event === 'EstateTokenUpdated'
        );
        expect(estateCreationEvent[0].args).not.be.equal(null);
        if (estateCreationEvent[0].args) {
          //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
          console.log(estateCreationEvent[0].args[2].gameIds);
          expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
          expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        }
        console.log('GAS USED ' + receipt.gasUsed);
      });
      it('gas 3 land and 2 games', async function () {
        const {
          estateContract,
          landContractAsMinter,
          landContractAsUser0,
          user0,
          gameToken,
          gameTokenAsUser0,
        } = await setupEstate();

        const uri =
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const mintingData: LandMintingData[] = [
          {beneficiary: user0, size: 1, x: 6, y: 12},
          {beneficiary: user0, size: 1, x: 7, y: 12},
          {beneficiary: user0, size: 1, x: 8, y: 12},
        ];
        const landIds = await mintLands(landContractAsMinter, mintingData);
        let {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);
        gameIds = [gameIds[0], gameIds[1], gameIds[1]];

        for (let i = 0; i < landIds.length; i++) {
          await landContractAsUser0.approve(estateContract.address, landIds[i]);
          await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
        }

        const receipt = await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .createEstate(user0, user0, {
              landIds: landIds,
              gameIds: gameIds,
              uri,
            })
        );

        const newOwner = await gameToken.ownerOf(gameIds[0]);
        expect(newOwner).to.be.equal(estateContract.address);
        const estateCreationEvents = await estateContract.queryFilter(
          estateContract.filters.EstateTokenUpdated()
        );
        const estateCreationEvent = estateCreationEvents.filter(
          (e) => e.event === 'EstateTokenUpdated'
        );
        expect(estateCreationEvent[0].args).not.be.equal(null);
        if (estateCreationEvent[0].args) {
          //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
          console.log(estateCreationEvent[0].args[2].gameIds);
          expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
          expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        }
        console.log('GAS USED ' + receipt.gasUsed);
      });
      it('gas 4 land and 2 games', async function () {
        const {
          estateContract,
          landContractAsMinter,
          landContractAsUser0,
          user0,
          gameToken,
          gameTokenAsUser0,
        } = await setupEstate();

        const uri =
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const mintingData: LandMintingData[] = [
          {beneficiary: user0, size: 1, x: 6, y: 12},
          {beneficiary: user0, size: 1, x: 7, y: 12},
          {beneficiary: user0, size: 1, x: 8, y: 12},
          {beneficiary: user0, size: 1, x: 9, y: 12},
        ];
        const landIds = await mintLands(landContractAsMinter, mintingData);
        const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

        for (let i = 0; i < landIds.length; i++) {
          await landContractAsUser0.approve(estateContract.address, landIds[i]);
        }

        for (let j = 0; j < gameIds.length; j++) {
          await gameTokenAsUser0.approve(estateContract.address, gameIds[j]);
        }

        const receipt = await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .createEstate(user0, user0, {
              landIds: landIds,
              gameIds: [gameIds[0], gameIds[0], gameIds[1], gameIds[1]],
              uri,
            })
        );

        const newOwner = await gameToken.ownerOf(gameIds[0]);
        expect(newOwner).to.be.equal(estateContract.address);
        const estateCreationEvents = await estateContract.queryFilter(
          estateContract.filters.EstateTokenUpdated()
        );
        const estateCreationEvent = estateCreationEvents.filter(
          (e) => e.event === 'EstateTokenUpdated'
        );
        expect(estateCreationEvent[0].args).not.be.equal(null);
        if (estateCreationEvent[0].args) {
          //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
          console.log(estateCreationEvent[0].args[2].gameIds);
          expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
          expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        }
        console.log('GAS USED ' + receipt.gasUsed);
      });
      it('gas 5 land and 2 games', async function () {
        const {
          estateContract,
          landContractAsMinter,
          landContractAsUser0,
          user0,
          gameToken,
          gameTokenAsUser0,
        } = await setupEstate();

        const uri =
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const mintingData: LandMintingData[] = [
          {beneficiary: user0, size: 1, x: 6, y: 12},
          {beneficiary: user0, size: 1, x: 7, y: 12},
          {beneficiary: user0, size: 1, x: 8, y: 12},
          {beneficiary: user0, size: 1, x: 9, y: 12},
          {beneficiary: user0, size: 1, x: 10, y: 12},
        ];
        const landIds = await mintLands(landContractAsMinter, mintingData);
        const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

        for (let i = 0; i < landIds.length; i++) {
          await landContractAsUser0.approve(estateContract.address, landIds[i]);
        }

        for (let j = 0; j < gameIds.length; j++) {
          await gameTokenAsUser0.approve(estateContract.address, gameIds[j]);
        }

        const receipt = await waitFor(
          estateContract
            .connect(ethers.provider.getSigner(user0))
            .createEstate(user0, user0, {
              landIds: landIds,
              gameIds: [
                gameIds[0],
                gameIds[0],
                gameIds[0],
                gameIds[1],
                gameIds[1],
              ],
              uri,
            })
        );

        const newOwner = await gameToken.ownerOf(gameIds[0]);
        expect(newOwner).to.be.equal(estateContract.address);
        const estateCreationEvents = await estateContract.queryFilter(
          estateContract.filters.EstateTokenUpdated()
        );
        const estateCreationEvent = estateCreationEvents.filter(
          (e) => e.event === 'EstateTokenUpdated'
        );
        expect(estateCreationEvent[0].args).not.be.equal(null);
        if (estateCreationEvent[0].args) {
          //expect(estateCreationEvent[0].args[2].gameIds).to.be.eql(gameIds);
          console.log(estateCreationEvent[0].args[2].gameIds);
          expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
          expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        }
        console.log('GAS USED ' + receipt.gasUsed);
      });
    });
  });
  describe('GasTest for addition', function () {
    it('adding 1 land', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
      }

      // mint and add new lands (w/o games) to the existing estate
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
      ];
      const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

      for (let i = 0; i < landIdsToAdd.length; i++) {
        await landContractAsUser0.approve(
          estateContract.address,
          landIdsToAdd[i]
        );
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIdsToAdd,
            gameIds: [0],
            uri,
          })
      );

      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newId
        );
        expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('adding 2 land', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
      }

      // mint and add new lands (w/o games) to the existing estate
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
      ];
      const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

      for (let i = 0; i < landIdsToAdd.length; i++) {
        await landContractAsUser0.approve(
          estateContract.address,
          landIdsToAdd[i]
        );
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIdsToAdd,
            gameIds: [0, 0],
            uri,
          })
      );

      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newId
        );
        expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('adding 3 land', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
      }

      // mint and add new lands (w/o games) to the existing estate
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
      ];
      const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

      for (let i = 0; i < landIdsToAdd.length; i++) {
        await landContractAsUser0.approve(
          estateContract.address,
          landIdsToAdd[i]
        );
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIdsToAdd,
            gameIds: [0, 0, 0],
            uri,
          })
      );

      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newId
        );
        expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('adding 4 land', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
      }

      // mint and add new lands (w/o games) to the existing estate
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
      ];
      const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

      for (let i = 0; i < landIdsToAdd.length; i++) {
        await landContractAsUser0.approve(
          estateContract.address,
          landIdsToAdd[i]
        );
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIdsToAdd,
            gameIds: [0, 0, 0, 0],
            uri,
          })
      );

      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newId
        );
        expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('adding 5 land', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 6, y: 12},
        {beneficiary: user0, size: 1, x: 7, y: 12},
        {beneficiary: user0, size: 1, x: 8, y: 12},
        {beneficiary: user0, size: 1, x: 9, y: 12},
        {beneficiary: user0, size: 1, x: 10, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
      }

      // mint and add new lands (w/o games) to the existing estate
      const mintingData2: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

      for (let i = 0; i < landIdsToAdd.length; i++) {
        await landContractAsUser0.approve(
          estateContract.address,
          landIdsToAdd[i]
        );
      }

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .addLandsGamesToEstate(user0, user0, estateId, {
            landIds: landIdsToAdd,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const estateData2 = await estateContract.callStatic.getEstateData(
          newId
        );
        expect(estateData2.landIds).to.be.eql([...landIds, ...landIdsToAdd]);
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
  });
  describe('GasTest for removing lands', function () {
    it('removing 1 land from an existing estate with lands and no games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
        const estateData = await estateContract.callStatic.getEstateData(
          estateId
        );
        expect(estateData.landIds).to.be.eql(landIds);
      }

      const landIdsToRemove = [landIds[0]];

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIdsToRemove,
            gameIds: [],
            uri,
          })
      );
      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const newEstateData = await estateContract.callStatic.getEstateData(
          newId
        );
        /* expect(newEstateData.landIds).to.be.eql([
          landIds[1],
          landIds[2],
          landIds[3],
          landIds[4],
        ]); */
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('removing 2 lands from an existing estate with lands and no games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
        const estateData = await estateContract.callStatic.getEstateData(
          estateId
        );
        expect(estateData.landIds).to.be.eql(landIds);
      }

      const landIdsToRemove = [landIds[0], landIds[1]];

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIdsToRemove,
            gameIds: [],
            uri,
          })
      );
      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const newEstateData = await estateContract.callStatic.getEstateData(
          newId
        );
        /* expect(newEstateData.landIds).to.be.eql([
          landIds[1],
          landIds[2],
          landIds[3],
          landIds[4],
        ]); */
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('removing 3 lands from an existing estate with lands and no games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
        const estateData = await estateContract.callStatic.getEstateData(
          estateId
        );
        expect(estateData.landIds).to.be.eql(landIds);
      }

      const landIdsToRemove = [landIds[0], landIds[1], landIds[2]];

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIdsToRemove,
            gameIds: [],
            uri,
          })
      );
      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const newEstateData = await estateContract.callStatic.getEstateData(
          newId
        );
        /* expect(newEstateData.landIds).to.be.eql([
          landIds[1],
          landIds[2],
          landIds[3],
          landIds[4],
        ]); */
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('removing 4 lands from an existing estate with lands and no games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
        const estateData = await estateContract.callStatic.getEstateData(
          estateId
        );
        expect(estateData.landIds).to.be.eql(landIds);
      }

      const landIdsToRemove = [landIds[0], landIds[1], landIds[2], landIds[3]];

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIdsToRemove,
            gameIds: [],
            uri,
          })
      );
      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const newEstateData = await estateContract.callStatic.getEstateData(
          newId
        );
        /* expect(newEstateData.landIds).to.be.eql([
            landIds[1],
            landIds[2],
            landIds[3],
            landIds[4],
          ]); */
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
    it('removing 5 lands from an existing estate with lands and no games', async function () {
      const {
        estateContract,
        landContractAsMinter,
        landContractAsUser0,
        user0,
      } = await setupEstate();
      const uri =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const mintingData: LandMintingData[] = [
        {beneficiary: user0, size: 1, x: 11, y: 12},
        {beneficiary: user0, size: 1, x: 12, y: 12},
        {beneficiary: user0, size: 1, x: 13, y: 12},
        {beneficiary: user0, size: 1, x: 14, y: 12},
        {beneficiary: user0, size: 1, x: 15, y: 12},
      ];
      const landIds = await mintLands(landContractAsMinter, mintingData);

      for (let i = 0; i < landIds.length; i++) {
        await landContractAsUser0.approve(estateContract.address, landIds[i]);
      }

      await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .createEstate(user0, user0, {
            landIds: landIds,
            gameIds: [0, 0, 0, 0, 0],
            uri,
          })
      );

      const estateCreationEvents = await estateContract.queryFilter(
        estateContract.filters.EstateTokenUpdated()
      );
      const estateCreationEvent = estateCreationEvents.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      expect(estateCreationEvent[0].args).not.be.equal(null);
      let estateId;
      if (estateCreationEvent[0].args) {
        expect(estateCreationEvent[0].args[2].landIds).to.be.eql(landIds);
        expect(estateCreationEvent[0].args[2].uri).to.be.equal(uri);
        estateId = estateCreationEvent[0].args[1];
        const estateData = await estateContract.callStatic.getEstateData(
          estateId
        );
        expect(estateData.landIds).to.be.eql(landIds);
      }

      const landIdsToRemove = landIds;

      const receipt = await waitFor(
        estateContract
          .connect(ethers.provider.getSigner(user0))
          .removeLandsFromEstate(user0, user0, estateId, {
            landIds: landIdsToRemove,
            gameIds: [],
            uri,
          })
      );
      const event = await expectEventWithArgs(
        estateContract,
        receipt,
        'EstateTokenUpdated'
      );
      expect(event.args).not.be.equal(null);
      if (event.args[0]) {
        const newId = event.args[1].toHexString();
        const newVersion = Number(newId.substring(62));
        const oldVersion = Number(estateId.toHexString().substring(62));
        expect(newVersion).to.be.equal(oldVersion + 1);
        const newEstateData = await estateContract.callStatic.getEstateData(
          newId
        );
        /* expect(newEstateData.landIds).to.be.eql([
            landIds[1],
            landIds[2],
            landIds[3],
            landIds[4],
          ]); */
      }
      console.log('GAS USED ' + receipt.gasUsed);
    });
  });
});
