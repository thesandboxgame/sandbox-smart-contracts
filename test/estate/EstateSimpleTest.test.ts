import {setupEstate} from './estateFixture';
import {waitFor, expectEventWithArgsFromReceipt} from '../utils';
import {expect} from '../chai-setup';
import {ethers, deployments} from 'hardhat';
import {BigNumber} from 'ethers';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';

describe.only('Estate test with maps', function () {
  it('test fixtures', async function () {
    const {user0} = await setupEstate();
    console.log(user0);
  });

  it.only('start with free lands', async function () {
    const {
      estateContract,
      estateMinter,
      estateMinterContract,
      landContract,
      user0,
      gameToken,
      gameMinter,
      minter,
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const bytes = '0x3333';

    //deploying mock sand contract
    console.log('deploying mock sand contract');
    await deployments.deploy('SandMock', {
      from: user0,
      contract: ERC20Mock,
      args: ['AToken', 'SAND'],
      proxy: false,
    });

    //minting sand for user
    const sandToken = await ethers.getContract('SandMock', user0);
    await sandToken.mint(user0, 10000);

    await waitFor(
      gameMinter
        .connect(ethers.provider.getSigner(user0))
        .updateSand(sandToken.address)
    );

    //Minting Land
    console.log('minting lands');
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(minter))
        .mintQuad(user0, 12, 0, 0, bytes)
    );

    //Minting games

    await waitFor(
      sandToken
        .connect(ethers.provider.getSigner(user0))
        .approve(gameMinter.address, 5000)
    );

    console.log('minting games');
    const minerAdd = await gameToken
      .connect(ethers.provider.getSigner(minter))
      .getMinter();

    console.log('game minter');
    console.log(minerAdd);
    console.log(minter);
    const gameIds: BigNumber[] = [];

    for (let i = 0; i < 12; i++) {
      console.log(i);
      const receipt = await gameMinter
        .connect(ethers.provider.getSigner(user0))
        .createGame(
          user0,
          {
            assetIdsToRemove: [],
            assetAmountsToRemove: [],
            assetIdsToAdd: [],
            assetAmountsToAdd: [],
            uri: uri,
            exactNumOfLandsRequired: 3,
          },
          user0,
          i
        );

      const event = await expectEventWithArgsFromReceipt(
        gameToken,
        receipt,
        'GameTokenUpdated'
      );
      gameIds.push(event.args[1]);
    }

    //Approving tokens
    console.log('approving tokens');
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(user0))
        .setApprovalForAllFor(user0, estateContract.address, true)
    );

    await waitFor(
      gameToken
        .connect(ethers.provider.getSigner(user0))
        .setApprovalForAllFor(user0, estateContract.address, true)
    );

    //Estate minting
    console.log('estate minting');
    await waitFor(
      estateMinterContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate({
          quadTuple: [[12], [0], [0]],
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
});
