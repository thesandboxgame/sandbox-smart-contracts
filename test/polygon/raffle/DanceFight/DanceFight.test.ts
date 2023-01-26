import {expect} from 'chai';
import {ethers} from 'hardhat';

import {waitFor} from '../../../utils';

import {raffleSignWallet, setupRaffle, assert} from './DanceFight.fixtures';

// eslint-disable-next-line mocha/no-skipped-tests
describe('DanceFight', function () {
  it('should be able to mint with valid signature', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '1000');
    await setupWave(raffleDanceFightContract, 20, 5, '10');
    await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it('should be able to mint 3_130 different tokens', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '20000');
    await setupWave(raffleDanceFightContract, 3_130, 3_130, '1');
    const tokens = [];
    for (let i = 0; i < 3_130; i++) {
      if (i % 10 === 0) console.log('minting token', i);
      const receipt = await mint(
        raffleSignWallet,
        deployer,
        i,
        raffleDanceFightContract.address,
        hre.network.config.chainId || 31337,
        '1',
        1
      );
      const transferEvents = await raffleDanceFightContract.queryFilter(
        raffleDanceFightContract.filters.Transfer(),
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

  // eslint-disable-next-line mocha/no-skipped-tests
  it('should be able to mint 3_130 different tokens in 3 waves', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '4000');
    const waves = [130, 1000, 2000];
    const tokens = [];
    let signatureId = 0;
    for (const amount of waves) {
      await setupWave(raffleDanceFightContract, amount, amount, '1');
      for (let i = 0; i < amount; i++) {
        if (signatureId % 10 === 0) console.log('minting token', i);
        signatureId++;
        const receipt = await mint(
          raffleSignWallet,
          deployer,
          signatureId,
          raffleDanceFightContract.address,
          hre.network.config.chainId || 31337,
          '1',
          1
        );
        const transferEvents = await raffleDanceFightContract.queryFilter(
          raffleDanceFightContract.filters.Transfer(),
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
    assert.equal(tokens.length, 3130);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('should be able to mint 3_130 different tokens in 3 waves in 3 txs', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupRaffle();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '20000');
    const waves = [130, 1000, 2000];
    const tokens = [];
    let signatureId = 0;
    for (const amount of waves) {
      await setupWave(raffleDanceFightContract, amount, amount, '1');
      signatureId++;
      const receipt = await mint(
        raffleSignWallet,
        deployer,
        signatureId,
        raffleDanceFightContract.address,
        hre.network.config.chainId || 31337,
        amount,
        amount
      );
      const transferEvents = await raffleDanceFightContract.queryFilter(
        raffleDanceFightContract.filters.Transfer(),
        receipt.blockNumber
      );
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
    assert.equal(tokens.length, 3130);
  });

  it('should be able to personalize with valid signature', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalize,
    } = await setupRaffle();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(raffleDanceFightContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = transferEvents[0]?.args?.tokenId.toString();

    const personalizationMask = 32;

    await personalize(
      raffleSignWallet,
      deployer,
      1,
      hre.network.config.chainId || 31337,
      tokenId,
      personalizationMask
    );

    const personalizeEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Personalized()
    );

    assert.equal(personalizeEvents.length, 1);
    assert.exists(personalizeEvents[0].args);
    assert.equal(
      personalizeEvents[0]?.args?._personalizationMask,
      personalizationMask
    );

    const personalizationOf = await raffleDanceFightContract.personalizationOf(
      tokenId
    );

    assert.equal(personalizationOf, personalizationMask);
  });

  it('should not be able to personalize with invalid signature', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalizeInvalidSignature,
    } = await setupRaffle();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(raffleDanceFightContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = transferEvents[0]?.args?.tokenId.toString();

    const personalizationMask = 32;

    await expect(
      personalizeInvalidSignature(
        raffleSignWallet,
        deployer,
        1,
        hre.network.config.chainId || 31337,
        tokenId,
        personalizationMask
      )
    ).to.be.revertedWith('Signature failed');
  });

  it('should be able to differentiate a personalized asset', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalize,
    } = await setupRaffle();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');

    await setupWave(raffleDanceFightContract, 20, 5, '10');

    const receipt1 = await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents1 = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer(),
      receipt1.blockNumber
    );
    assert.equal(transferEvents1.length, 1);

    const receipt2 = await mint(
      raffleSignWallet,
      deployer,
      1,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents2 = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer(),
      receipt2.blockNumber
    );
    assert.equal(transferEvents2.length, 1);
    const tokenId2 = transferEvents2[0]?.args?.tokenId.toString();

    const personalizationMask = 16;

    const personalizeReceipt2 = await personalize(
      raffleSignWallet,
      deployer,
      2,
      hre.network.config.chainId || 31337,
      tokenId2,
      personalizationMask
    );

    const allPersonalizeEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Personalized()
    );

    const personalizeEvents2 = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Personalized(),
      personalizeReceipt2.blockNumber
    );

    assert.equal(allPersonalizeEvents.length, 1);
    assert.equal(personalizeEvents2.length, 1);
    assert.equal(
      personalizeEvents2[0]?.args?._personalizationMask,
      personalizationMask
    );
  });

  it('should not be able to personalize twice with the same signature', async function () {
    const {
      raffleDanceFightContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalizeSignature,
    } = await setupRaffle();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(raffleDanceFightContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await raffleDanceFightContract.queryFilter(
      raffleDanceFightContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = transferEvents[0]?.args?.tokenId.toString();

    const personalizationMask = 4;

    const signature = await personalizeSignature(
      raffleSignWallet,
      deployer,
      1,
      raffleDanceFightContract.address,
      hre.network.config.chainId || 31337,
      tokenId,
      personalizationMask
    );

    const contract = raffleDanceFightContract.connect(
      ethers.provider.getSigner(deployer)
    );

    await waitFor(
      contract.personalize(1, signature, tokenId, personalizationMask)
    );

    await expect(
      contract.personalize(1, signature, tokenId, personalizationMask)
    ).to.be.revertedWith('SignatureId already used');
  });
});
