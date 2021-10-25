import {setupEstate} from './fixtures';
import {expectEventWithArgs, waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';
import {supplyAssets} from '../Game/assets';
import {BigNumber, Contract} from 'ethers';
import {getNewGame} from './utils';
import {Address} from 'hardhat-deploy/types';
import {data712} from '../polygon/landBase/data712';

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
    const {estateContract, user0} = await setupEstate();
    const size = 1;
    const x = 6;
    const y = 12;
    const uri =
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

    /*await waitFor(landContractAsMinter.mintQuad(user0, size, x, y, emptyBytes));
    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: [],
          gameIds: [],
          uri,
        })
    ).to.be.revertedWith(`EMPTY_LAND_IDS_ARRAY`);*/
  });

  it('create should fail on different sizes for land, game arrays', async function () {
    const {estateContract, landContractAsMinter, user0} = await setupEstate();
    const size = 1;
    const x = 6;
    const y = 12;
    const uri =
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    await waitFor(landContractAsMinter.mintQuad(user0, size, x, y, emptyBytes));

    /*const landMintingEvents = await landContractAsMinter.queryFilter(
      landContractAsMinter.filters.Transfer()
    );*/

    /*const event = landMintingEvents.filter((e) => e.event === 'Transfer')[0];
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
    }*/
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
      //await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }
    await waitFor(landContractAsUser0.setUpTranferRole(estateContract.address));

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

  it('expected to fail if estate not given the role of TRANSFER', async function () {
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
      //await landContractAsUser0.approve(estateContract.address, landIds[i]);
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
    ).to.be.revertedWith('not authorized to transferMultiQuads');
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

    await waitFor(landContractAsUser0.setUpTranferRole(estateContract.address));

    for (let i = 0; i < landIds.length; i++) {
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

  it('create an estate with 567 lands and games', async function () {
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
    const mintingData: LandMintingData[] = [];
    const mintingGames = [];

    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        mintingData.push({beneficiary: user0, size: 1, x: i, y: j});
        mintingGames.push(1);
      }
    }

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, mintingGames, 0);

    for (let i = 0; i < landIds.length; i++) {
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(landContractAsUser0.setUpTranferRole(estateContract.address));

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );
    console.log('gas used for estate creation ' + receipt.gasUsed);
  });

  it('create a estate with 3x3 quad and try to recover one quad', async function () {
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
    const mintingData: LandMintingData[] = [];
    const mintingGames = [];

    mintingData.push({beneficiary: user0, size: 3, x: 0, y: 0});
    mintingGames.push(1);

    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, mintingGames, 0);

    for (let i = 0; i < landIds.length; i++) {
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(landContractAsUser0.setUpTranferRole(estateContract.address));

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(user0, user0, {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        })
    );

    //try to recover a part
    console.log('gas used for estate creation ' + receipt.gasUsed);
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
  it('adding non-adjacent lands to an existing estate should fail', async function () {
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
      {beneficiary: user0, size: 1, x: 12, y: 12},
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIdsToAdd = await mintLands(landContractAsMinter, mintingData2);

    for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(
        estateContract.address,
        landIdsToAdd[i]
      );
    }

    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .addLandsGamesToEstate(user0, user0, estateId, {
          landIds: landIdsToAdd,
          gameIds: [0, 0],
          uri,
        })
    ).to.be.revertedWith('LANDS_ARE_NOT_ADJACENT');
  });
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
  it('removing lands that break adjacency should fail', async function () {
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
      {beneficiary: user0, size: 1, x: 4, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const mintGamesRes = await mintGames(gameToken, user0, [1, 1, 1], 0);
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
    const landIdsToRemove = [landIds[1]];
    await expect(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .removeLandsFromEstate(user0, user0, estateId, {
          landIds: landIdsToRemove,
          gameIds: [],
          uri,
        })
    ).to.be.revertedWith('LANDS_ARE_NOT_ADJACENT');
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

    for (let i = 0; i < landIds.length; i++) {
      //await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }

    await waitFor(landContractAsUser0.setUpTranferRole(estateContract.address));

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
});
