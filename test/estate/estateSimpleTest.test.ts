import {setupEstate} from './fixtures';
import {expectEventWithArgsFromReceipt, toWei, waitFor} from '../utils';
import {expect} from '../chai-setup';
import {ethers} from 'hardhat';
import {BigNumber} from 'ethers';

describe('Estate test with maps', function () {
  it('test fixtures', async function () {
    const {user0} = await setupEstate();
    console.log(user0);
  });

  it('start with free lands', async function () {
    const {
      sandContractAsUser0,
      sandContractAsBeneficiary,
      estateContract,
      estateMinter,
      estateMinterContract,
      landContract,
      user0,
      gameToken,
      gameMinter,
      minter,
      childChainManager,
      polygonSand
    } = await setupEstate();
    const uri =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const bytes = '0x3333';


    // await childChainManager.callDeposit(user0,
    //   ethers.utils.defaultAbiCoder.encode(['uint256'], [toWei(10)]));
    await sandContractAsBeneficiary.transfer(user0, toWei(10))

    //Minting Land
    console.log('minting lands');
    await waitFor(
      landContract
        .connect(ethers.provider.getSigner(minter))
        .mintQuad(user0, 12, 0, 0, bytes)
    );

    //Minting games
    await sandContractAsUser0.approve(gameMinter.address, toWei(10));

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
    /*
uint256[][3] quadTuple; //(size, x, y)
bytes32 uri;
     */
    console.log('estate minting');
    await waitFor(
      estateMinterContract
        .connect(ethers.provider.getSigner(user0))
        .createEstate(
          [
            [[12], [0], [0]],
            uri
          ],
          [])
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
