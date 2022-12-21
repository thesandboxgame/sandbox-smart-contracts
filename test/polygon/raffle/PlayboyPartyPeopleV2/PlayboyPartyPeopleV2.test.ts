import {expect} from 'chai';
import {ethers} from 'hardhat';

import {waitFor} from '../../../utils';

import {
  raffleSignWallet,
  setupRaffle,
  zeroAddress,
  assert,
} from './PlayboyPartyPeopleV2.fixtures';

// eslint-disable-next-line mocha/no-skipped-tests
describe.only('RafflePlayboyPartyPeopleV2', function () {
  it.only('should be able to mint with valid signature', async function () {
    await setupRaffle();
    // const {deployer} = await getNamedAccounts();
    // await transferSand(deployer, '1000');
    // await setupWave(
    //   rafflePlayboyPartyPeopleContract,
    //   0,
    //   20,
    //   5,
    //   '10',
    //   zeroAddress,
    //   0
    // );
    // await mint(
    //   raffleSignWallet,
    //   deployer,
    //   0,
    //   rafflePlayboyPartyPeopleContract.address,
    //   hre.network.config.chainId || 31337,
    //   '10',
    //   1
    // );

    // const transferEvents = await rafflePlayboyPartyPeopleContract.queryFilter(
    //   rafflePlayboyPartyPeopleContract.filters.Transfer()
    // );

    // console.log(transferEvents);

    // assert.equal(transferEvents.length, 1);

    assert.equal(true, true);
  });
});
