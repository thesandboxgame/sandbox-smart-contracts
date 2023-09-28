import {expect, assert} from 'chai';
import {ethers} from 'hardhat';
import {ZeroAddress} from 'ethers';
import {preSetupAvatar} from './raffle.fixtures';
import { getTestingAccounts, setupMockERC20 } from '../fixtures';

// ======================= collection differences ======================= 

const contractName = 'DanceFight';
const collectionSymbol = 'DF';
const COLLECTION_MAX_SUPPLY = 3130;

// ====================================================================== 

const BATCH_SIZE = 50;

async function setupAvatar() {
  const {
    treasury,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    trustedForwarder,
  } = await getTestingAccounts();
    
  const initializationArgs = [
      `https://contracts-demo.sandbox.game/${contractName}-unrevealed/`,
      contractName,
      collectionSymbol,
      treasury.address,
      raffleSignWallet.address,
      trustedForwarder.address,
      defaultOperatorFiltererRegistry.address,
      defaultOperatorFiltererSubscription.address,
      true, // we want to subscribe to OpenSea's list
    ];
  return await preSetupAvatar(contractName, COLLECTION_MAX_SUPPLY, initializationArgs);
}

/// eslint-disable-next-line mocha/no-skipped-tests
describe(contractName, function () {

  it('allowedToExecuteMint works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: collectionContract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();
    const {deployer} = await getTestingAccounts();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;

    // setAllowedExecuteMint // // // // // // // // // // // // // // // // // // // // // //
    const oldAllowedToExecuteMint = await collectionContract.allowedToExecuteMint();
    const randomTokenContract = await setupMockERC20();
    const randomToken = await randomTokenContract.getAddress();
    await collectionContract.setAllowedExecuteMint(randomToken);
    const newAllowedToExecuteMint = await collectionContract.allowedToExecuteMint();

    assert.notEqual(oldAllowedToExecuteMint, newAllowedToExecuteMint);
    assert.equal(randomToken, newAllowedToExecuteMint);

    await expect(
      collectionContractAsRandomWallet.setAllowedExecuteMint(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      collectionContract.setAllowedExecuteMint(ZeroAddress)
    ).to.be.revertedWith(
      'Address is zero address'
    );
  });

  it('setTreasury works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;

    // setSandOwnerAddress // // // // // // // // // // // // // // // // // // // // // //
    const oldSandOwner = await contract.sandOwner();
    await contract.setSandOwnerAddress(randomAddress);
    const newTreasury = await contract.sandOwner();

    assert.notEqual(oldSandOwner, newTreasury);
    assert.equal(randomAddress, newTreasury);

    await expect(collectionContractAsRandomWallet.setSandOwnerAddress(randomAddress)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );

    await expect(contract.setSandOwnerAddress(ethers.ZeroAddress)).to.be.revertedWith(
      'Owner is zero address'
    );
  });

  it('setSignAddress works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;

    // setSignAddress // // // // // // // // // // // // // // // // // // // // // //
    const oldSignAddress = await contract.signAddress();
    await contract.setSignAddress(randomAddress);
    const newSignAddress = await contract.signAddress();

    assert.notEqual(oldSignAddress, newSignAddress);
    assert.equal(randomAddress, newSignAddress);

    await expect(
      collectionContractAsRandomWallet.setSignAddress(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(contract.setSignAddress(ethers.ZeroAddress)).to.be.revertedWith(
      'Sign address is zero address'
    );
  });

  it('setBaseURI works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;

    // setBaseURI // // // // // // // // // // // // // // // // // // // // // //
    const oldBaseURI = await contract.baseTokenURI();
    const toSetNewURI = 'http://test.test';
    await contract.setBaseURI(toSetNewURI);
    const newBaseURI = await contract.baseTokenURI();

    assert.notEqual(oldBaseURI, newBaseURI);
    assert.equal(toSetNewURI, newBaseURI);

    await expect(collectionContractAsRandomWallet.setBaseURI(randomAddress)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );

    await expect(contract.setBaseURI('')).to.be.revertedWith(
      'baseURI is not set'
    );
  });

  it('should be able to mint with valid signature', async function () {
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      setupWave,
      mint,
    } = await setupAvatar();

    const {deployer, raffleSignWallet} = await getTestingAccounts();
    await transferSand(deployer.address, '1000');
    await setupWave(20, 5, '10');
    await mint(
      raffleSignWallet,
      deployer.address,
      0,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await contract.queryFilter(
      contract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it(`@skip-on-coverage should be able to mint ${COLLECTION_MAX_SUPPLY} different tokens`, async function () {
    const nftPriceInSand = 1;
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      setupWave,
      mint,
    } = await setupAvatar();
    const {deployer, raffleSignWallet} = await getTestingAccounts();
    await transferSand(deployer.address, '20000');
    await setupWave(
      COLLECTION_MAX_SUPPLY,
      COLLECTION_MAX_SUPPLY,
      nftPriceInSand.toString()
    );
    const tokens = [];
    const mintingQuantities = getSupplySplittedInBatches(
      COLLECTION_MAX_SUPPLY,
      BATCH_SIZE
    );
    let totalMinted = 0;
    for (const i in mintingQuantities) {
      const index = parseInt(i);
      const mintingBatch = mintingQuantities[index];

      // console.log(
      //   `for batch ${
      //     index + 1
      //   } minting ${mintingBatch} tokens. With this will be minted: ${
      //     totalMinted + mintingBatch
      //   } NFTs`
      // );

      const receipt = await mint(
        raffleSignWallet,
        deployer.address,
        index,
        await contract.getAddress(),
        network.config.chainId || 31337,
        mintingBatch * nftPriceInSand, // amount to be used by SAND to be approved
        mintingBatch
      );

      const transferEvents = await contract.queryFilter(
        contract.filters.Transfer(),
        receipt.blockNumber || undefined
      );
      assert.equal(transferEvents.length, mintingBatch);

      totalMinted += mintingBatch;
      for (const event of transferEvents) {
        assert.exists(event.args);
        const tokenId = event.args?.tokenId.toString();
        const exists = tokens.find((token) => token === tokenId);
        assert.notExists(exists);
        tokens.push(tokenId);
      }
    }
    assert.equal(tokens.length, COLLECTION_MAX_SUPPLY);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it(`@skip-on-coverage should be able to mint ${COLLECTION_MAX_SUPPLY} different tokens in 3 waves`, async function () {
    const nftPriceInSand = 1; // not in WEI, in actual token, scaled to decimals
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      setupWave,
      mint,
    } = await setupAvatar();
    const {deployer, raffleSignWallet} = await getTestingAccounts();
    await transferSand(deployer.address, `${COLLECTION_MAX_SUPPLY}`);

    const waves = getSupplySplittedIn3Waves();
    const tokens = [];
    let totalMinted = 0;
    let signatureId = 0;
    for (const waveSize of waves) {
      await setupWave(
        waveSize,
        waveSize,
        nftPriceInSand.toString()
      );
      const mintingQuantities = getSupplySplittedInBatches(
        waveSize,
        BATCH_SIZE
      );
      // console.log(
      //   `Minting with a wave size of ${waveSize} in ${mintingQuantities.length} batches with ${mintingQuantities[0]} tokens per mint TX`
      // );

      for (const i in mintingQuantities) {
        signatureId++;
        const index = parseInt(i);
        const mintingBatch = mintingQuantities[index];

        // console.log(
        //   `for batch ${
        //     index + 1
        //   } minting ${mintingBatch} tokens. With this will be minted: ${
        //     totalMinted + mintingBatch
        //   } NFTs`
        // );

        const receipt = await mint(
          raffleSignWallet,
          deployer.address,
          signatureId,
          await contract.getAddress(),
          network.config.chainId || 31337,
          mintingBatch * nftPriceInSand, // amount to be used by SAND to be approved
          mintingBatch
        );

        const transferEvents = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber || undefined
        );
        assert.equal(transferEvents.length, mintingBatch);

        totalMinted += mintingBatch;
        for (const event of transferEvents) {
          assert.exists(event.args);
          const tokenId = event.args?.tokenId.toString();
          const exists = tokens.find((token) => token === tokenId);
          assert.notExists(exists);
          tokens.push(tokenId);
        }
      }
    }
    assert.equal(tokens.length, COLLECTION_MAX_SUPPLY);
  });

  it('should be able to personalize with valid signature', async function () {
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      personalize,
      setupWave,
      mint,
    } = await setupAvatar();
    const {deployer, raffleSignWallet} = await getTestingAccounts();

    await transferSand(deployer.address, '1000');
    await setupWave(20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer.address,
      0,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await contract.queryFilter(
      contract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = parseInt(transferEvents[0]?.args?.tokenId.toString());

    const personalizationMask = 32n;

    await personalize(
      raffleSignWallet,
      deployer.address,
      1,
      network.config.chainId || 31337,
      tokenId,
      parseInt(personalizationMask.toString())
    );

    const personalizeEvents = await contract.queryFilter(
      contract.filters.Personalized()
    );

    assert.equal(personalizeEvents.length, 1);
    assert.exists(personalizeEvents[0].args);
    assert.equal(
      personalizeEvents[0]?.args?._personalizationMask,
      personalizationMask
    );

    const personalizationOf = await contract.personalizationOf(
      tokenId
    );

    assert.equal(personalizationOf, personalizationMask);
  });

  it('should not be able to personalize with invalid signature', async function () {
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      personalizeInvalidSignature,
      setupWave,
      mint,
    } = await setupAvatar();

    const {deployer, raffleSignWallet} = await getTestingAccounts();

    await transferSand(deployer.address, '1000');
    await setupWave(20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer.address,
      0,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await contract.queryFilter(
      contract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = parseInt(transferEvents[0]?.args?.tokenId.toString());

    const personalizationMask = 32;

    await expect(
      personalizeInvalidSignature(
        raffleSignWallet,
        deployer.address,
        1,
        network.config.chainId || 31337,
        tokenId,
        personalizationMask
      )
    ).to.be.revertedWith('Signature failed');
  });

  it('should be able to differentiate a personalized asset', async function () {
    const {
      network,
      collectionContractAsOwner: contract,
      transferSand,
      personalize,
      setupWave,
      mint,
    } = await setupAvatar();

    const {deployer, raffleSignWallet} = await getTestingAccounts();

    await transferSand(deployer.address, '1000');

    await setupWave(20, 5, '10');

    const receipt1 = await mint(
      raffleSignWallet,
      deployer.address,
      0,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents1 = await contract.queryFilter(
      contract.filters.Transfer(),
      receipt1.blockNumber || undefined
    );
    assert.equal(transferEvents1.length, 1);

    const receipt2 = await mint(
      raffleSignWallet,
      deployer.address,
      1,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents2 = await contract.queryFilter(
      contract.filters.Transfer(),
      receipt2.blockNumber || undefined
    );
    assert.equal(transferEvents2.length, 1);
    const tokenId2 = parseInt(transferEvents2[0]?.args?.tokenId.toString());

    const personalizationMask = 16n;

    const personalizeReceipt2 = await personalize(
      raffleSignWallet,
      deployer.address,
      2,
      network.config.chainId || 31337,
      tokenId2,
      parseInt(personalizationMask.toString())
    );

    const allPersonalizeEvents = await contract.queryFilter(
      contract.filters.Personalized()
    );

    const personalizeEvents2 = await contract.queryFilter(
      contract.filters.Personalized(),
      personalizeReceipt2.blockNumber || undefined
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
      network,
      collectionContractAsOwner: contract,
      transferSand,
      personalizeSignature,
      setupWave,
      mint,
    } = await setupAvatar();

    const {deployer, raffleSignWallet} = await getTestingAccounts();

    await transferSand(deployer.address, '1000');
    await setupWave(20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer.address,
      0,
      await contract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await contract.queryFilter(
      contract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = transferEvents[0]?.args?.tokenId.toString();

    const personalizationMask = 4;

    const signature = await personalizeSignature(
      raffleSignWallet,
      deployer.address,
      1,
      await contract.getAddress(),
      network.config.chainId || 31337,
      tokenId,
      personalizationMask
    );

    const contractAsDeployer = contract.connect(deployer);
    
    const personalizeTx = await contractAsDeployer.personalize(1, signature, tokenId, personalizationMask);
    await personalizeTx.wait();
    
    await expect(
      contractAsDeployer.personalize(1, signature, tokenId, personalizationMask)
    ).to.be.revertedWith('SignatureId already used');
  });
});

const getSupplySplittedIn3Waves = () => {
  const fistWave = Math.trunc(COLLECTION_MAX_SUPPLY / 6);
  const secondWave = Math.trunc((COLLECTION_MAX_SUPPLY * 2) / 6);
  const thirdWave = COLLECTION_MAX_SUPPLY - fistWave - secondWave;
  return [fistWave, secondWave, thirdWave];
};

const getSupplySplittedInBatches = (
  originalBatchSize: number,
  batches: number
): number[] => {
  const batchSize: number = Math.floor(originalBatchSize / batches);
  const lastBatch: number = originalBatchSize % batches;
  const mintingCounts = Array.from<number>({length: batches}).fill(batchSize);
  if (lastBatch) mintingCounts.push(lastBatch);
  return mintingCounts;
};
