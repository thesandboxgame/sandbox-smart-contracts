// import {expect} from 'chai';
import {raffleSignWallet, setupRaffle, zeroAddress, assert} from './fixtures';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('RaffleTheDoggies', function () {
  it('should be able to mint with valid signature', async function () {
    const {
      raffleTheDoggiesContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '1000');
    await setupWave(raffleTheDoggiesContract, 0, 20, 5, '10', zeroAddress, 0);
    await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleTheDoggiesContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await raffleTheDoggiesContract.queryFilter(
      raffleTheDoggiesContract.filters.Transfer()
    );
    assert.equal(transferEvents.length, 1);
  });

  it('@skip-on-ci @skip-on-coverage should be able to mint 10_000 different tokens', async function () {
    const {
      raffleTheDoggiesContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '10000');
    await setupWave(
      raffleTheDoggiesContract,
      0,
      10000,
      10000,
      '1',
      zeroAddress,
      0
    );
    const tokens = [];
    for (let i = 0; i < 10000; i++) {
      if (i % 10 === 0) console.log('minting token', i);
      const receipt = await mint(
        raffleSignWallet,
        deployer,
        i,
        raffleTheDoggiesContract.address,
        hre.network.config.chainId || 31337,
        '1',
        1
      );
      const transferEvents = await raffleTheDoggiesContract.queryFilter(
        raffleTheDoggiesContract.filters.Transfer(),
        receipt.blockNumber
      );
      assert.equal(transferEvents.length, 1);
      assert.exists(transferEvents[0].args);
      if (transferEvents.length > 0 && transferEvents[0].args) {
        const tokenId = transferEvents[0].args.tokenId.toString();
        const exists = tokens.find((token) => token === tokenId);
        assert.notExists(exists);
        tokens.push(tokenId);
      }
    }
  });

  it('@skip-on-ci @skip-on-coverage should be able to mint 10_000 different tokens in 3 waves', async function () {
    const {
      raffleTheDoggiesContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '10000');
    const waves = [50, 6950, 3000];
    const tokens = [];
    let signatureId = 0;
    for (const amount of waves) {
      await setupWave(
        raffleTheDoggiesContract,
        0,
        amount,
        amount,
        '1',
        zeroAddress,
        0
      );
      for (let i = 0; i < amount; i++) {
        if (signatureId % 10 === 0) console.log('minting token', i);
        signatureId++;
        const receipt = await mint(
          raffleSignWallet,
          deployer,
          signatureId,
          raffleTheDoggiesContract.address,
          hre.network.config.chainId || 31337,
          '1',
          1
        );
        const transferEvents = await raffleTheDoggiesContract.queryFilter(
          raffleTheDoggiesContract.filters.Transfer(),
          receipt.blockNumber
        );
        assert.equal(transferEvents.length, 1);
        assert.exists(transferEvents[0].args);
        if (transferEvents.length > 0 && transferEvents[0].args) {
          const tokenId = transferEvents[0].args.tokenId.toString();
          const exists = tokens.find((token) => token === tokenId);
          assert.notExists(exists);
          tokens.push(tokenId);
        }
      }
    }
    assert.equal(tokens.length, 10000);
  });

  it('@skip-on-ci @skip-on-coverage should be able to mint 10_000 different tokens in 3 waves in 3 txs', async function () {
    const {
      raffleTheDoggiesContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '10000');
    // const waves = [50, 200, 500, 1000, 2000, 4000, 6750, 3000];
    const waves = [50, 6950, 3000];
    const tokens = [];
    let signatureId = 0;
    for (const amount of waves) {
      await setupWave(
        raffleTheDoggiesContract,
        0,
        amount,
        amount,
        '1',
        zeroAddress,
        0
      );
      signatureId++;
      const receipt = await mint(
        raffleSignWallet,
        deployer,
        signatureId,
        raffleTheDoggiesContract.address,
        hre.network.config.chainId || 31337,
        amount,
        amount
      );
      const transferEvents = await raffleTheDoggiesContract.queryFilter(
        raffleTheDoggiesContract.filters.Transfer(),
        receipt.blockNumber
      );
      console.log(transferEvents.length);
      assert.equal(transferEvents.length, amount);

      for (const transferEvent of transferEvents) {
        assert.exists(transferEvent.args);
        if (transferEvent.args) {
          const tokenId = transferEvent.args.tokenId.toString();
          const exists = tokens.find((token) => token === tokenId);
          assert.notExists(exists);
          tokens.push(tokenId);
        }
      }
    }
    assert.equal(tokens.length, 10000);
  });
});
