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
    const {estateContract, landContractAsMinter, user0} = await setupEstate();
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

  it('create an estate with two lands and games with meta', async function () {
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

    const encodedABI = await landContractAsUser0.populateTransaction.approve(
      estateContract.address,
      landIds[0]
    ); //how would this work?

    /*for (let i = 0; i < landIds.length; i++) {
      await landContractAsUser0.approve(estateContract.address, landIds[i]);
      await gameTokenAsUser0.approve(estateContract.address, gameIds[i]);
    }*/

    const signature = await ethers.utils
      .keccak256(
        landContractAsUser0.approve(estateContract.address, landIds[0])
      )
      .substr(0, 10);
    console.log('HHHHHHHHHHHHHH3' + signature.toString());

    //web3.utils.keccak256("transferFrom(address,address,uint256)").substr(0,10)

    //let fnSignature = await ethers.utils.solidityKeccak256("transferFrom(address,address,uint256)").substr(0,10)

    // encode the function parameters and add them to the call data
    /*let fnParams = web3.eth.abi.encodeParameters(
    ["address","address","uint256"],
    [fromAddr,toAddr,tokenValue]
    )*/

    /*const wallet = await ethers.getSigner(user0);
    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );*/

    /*await waitFor(
      estateContract.connect(ethers.provider.getSigner(user0)).createEstateII(
        user0,
        user0,
        {
          landIds: landIds,
          gameIds: gameIds,
          uri,
        },
        encodedABI,
        signature
      )
    );*/

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

  it('create should fail for lands that are not adjacent', async function () {
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
      {beneficiary: user0, size: 1, x: 8, y: 12},
    ];
    const landIds = await mintLands(landContractAsMinter, mintingData);
    const {gameIds} = await mintGames(gameToken, user0, [1, 1], 0);

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
    ).to.be.revertedWith('LANDS_ARE_NOT_ADJACENT');
  });

  it('veryBigArrayInput', async function () {
    const {estateContract, user0} = await setupEstate();

    const landIds = [
      66,
      3,
      23,
      72,
      78,
      80,
      52,
      9,
      11,
      5,
      36,
      58,
      8,
      63,
      87,
      46,
      88,
      13,
      85,
      27,
      64,
      67,
      40,
      71,
      84,
      9,
      14,
      7,
      1,
      30,
      95,
      33,
      30,
      57,
      82,
      9,
      79,
      65,
      87,
      78,
      12,
      6,
      93,
      6,
      8,
      79,
      41,
      80,
      86,
      3,
      26,
      78,
      51,
      62,
      73,
      85,
      94,
      5,
      75,
      23,
      86,
      91,
      55,
      81,
      100,
      1,
      2,
      94,
      31,
      52,
      55,
      73,
      34,
      85,
      82,
      62,
      21,
      10,
      8,
      52,
      5,
      36,
      89,
      57,
      72,
      38,
      25,
      98,
      75,
      101,
      95,
      47,
      15,
      87,
      18,
      28,
      39,
      55,
      9,
      3,
      73,
      3,
      44,
      3,
      35,
      5,
      12,
      100,
      97,
      91,
      96,
      84,
      86,
      48,
      41,
      82,
      61,
      23,
      45,
      36,
      11,
      47,
      95,
      0,
      53,
      101,
      40,
      27,
      41,
      99,
      53,
      2,
      28,
      39,
      83,
      82,
      96,
      76,
      4,
      96,
      4,
      77,
      22,
      62,
      46,
      68,
      51,
      99,
      12,
      17,
      90,
      99,
      30,
      42,
      55,
      64,
      79,
      39,
      2,
      96,
      68,
      6,
      39,
      99,
      19,
      97,
      45,
      61,
      36,
      86,
      76,
      50,
      53,
      38,
      83,
      86,
      67,
      74,
      19,
      93,
      13,
      58,
      15,
      95,
      44,
      72,
      98,
      28,
      95,
      2,
      1,
      75,
      85,
      69,
      2,
      74,
      41,
      82,
      56,
      12,
      101,
      85,
      4,
      27,
      17,
      33,
      51,
      58,
      45,
      30,
      101,
      16,
      67,
      57,
      91,
      7,
      58,
      12,
      3,
      73,
      48,
      66,
      45,
      86,
      86,
      17,
      19,
      11,
      93,
      26,
      56,
      40,
      94,
      66,
      51,
      62,
      6,
      36,
      96,
      46,
      56,
      37,
      41,
      28,
      84,
      28,
      85,
      44,
      25,
      93,
      79,
      3,
      23,
      0,
      83,
      44,
      66,
      67,
      61,
      34,
      70,
      27,
      73,
      76,
      27,
      66,
      83,
      19,
      98,
      11,
      40,
      44,
      43,
      36,
      33,
      1,
      12,
      51,
      41,
      83,
      54,
      78,
      66,
      39,
      89,
      88,
      78,
      33,
      100,
      49,
      64,
      84,
      55,
      66,
      93,
      65,
      45,
      13,
      71,
      95,
      101,
      11,
      55,
      45,
      78,
      15,
      47,
      29,
      14,
      19,
      60,
      76,
      57,
      83,
      8,
      72,
      20,
      86,
      45,
      59,
      79,
      72,
      70,
      93,
      66,
      89,
      86,
      34,
      92,
      46,
      69,
      15,
      93,
      25,
      66,
      66,
      69,
      1,
      22,
      27,
      91,
      46,
      58,
      8,
      69,
      86,
      48,
      45,
      97,
      29,
      50,
      13,
      51,
      2,
      75,
      45,
      27,
      31,
      44,
      28,
      70,
      86,
      5,
      90,
      38,
      28,
      98,
      37,
      11,
      45,
      51,
      81,
      4,
      82,
      19,
      44,
      62,
      29,
      75,
      20,
      7,
      92,
      16,
      64,
      76,
      42,
      72,
      41,
      33,
      26,
      93,
      49,
      71,
      6,
      17,
      60,
      77,
      67,
      66,
      51,
      89,
      33,
      89,
      8,
      10,
      30,
      31,
      63,
      43,
      21,
      83,
      97,
      75,
      88,
      14,
      43,
      41,
      10,
      66,
      96,
      47,
      52,
      3,
      44,
      31,
      100,
      60,
      9,
      13,
      35,
      14,
      8,
      45,
      21,
      2,
      49,
      30,
      40,
      3,
      46,
      84,
      5,
      99,
      28,
      47,
      52,
      41,
      92,
      43,
      8,
      38,
      59,
      68,
      34,
      94,
      74,
      81,
      74,
      21,
      24,
      14,
      23,
      23,
      49,
      95,
      45,
      29,
      42,
      39,
      81,
      56,
      89,
      95,
      85,
      66,
      48,
      50,
      33,
      24,
      42,
      9,
      38,
      65,
      52,
      74,
      46,
      49,
      46,
      51,
      4,
      88,
      91,
      45,
      69,
      89,
      80,
      6,
      69,
      63,
      64,
      56,
      8,
      75,
      61,
      16,
      9,
      85,
      71,
      43,
      46,
      64,
      19,
      74,
      42,
      64,
      2,
      20,
      90,
      83,
      61,
      72,
      70,
      29,
      45,
      6,
      30,
      49,
      33,
      84,
      0,
      2,
      55,
      14,
      7,
      72,
      32,
      19,
      48,
      34,
      25,
      52,
      41,
      1,
      2,
      20,
      63,
      74,
      61,
      54,
      85,
      32,
      37,
      33,
      7,
      80,
      93,
      101,
      89,
      96,
      73,
      72,
      93,
      24,
      24,
      79,
      97,
      84,
      34,
      23,
      50,
      27,
      57,
      1,
      75,
      54,
      40,
    ];

    const receipt = await waitFor(
      estateContract
        .connect(ethers.provider.getSigner(user0))
        .giveMeAnOK(landIds)
    );

    console.log(receipt.gasUsed.toString());
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
    //{beneficiary: user0, size: 1, x: 6, y: 12},
    //{beneficiary: user0, size: 1, x: 5, y: 12},
    //];

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

    /*const estateCreationEvents = await estateContract.queryFilter(
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
    }*/
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
