import {expect, assert} from 'chai';
import {ethers} from 'hardhat';
import {waitFor} from '../../utils';
const {BigNumber} = ethers;
const AddressZero = ethers.constants.AddressZero

import {
  raffleSignWallet,
  setupAvatar,
  COLLECTION_MAX_SUPPLY,
  implementationContractName,
  setupMockERC20
} from './AvatarCollection.fixtures';

const BATCH_SIZE = 50;

// eslint-disable-next-line mocha/no-skipped-tests
describe(implementationContractName, function () {
  it('setMarketingMint sets appropriate data', async function () {
    const {
      avatarCollectionContract,
    } = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    await contract.setMarketingMint();

    const expectedWaveMaxTokens = 100;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      "waveMaxTokensOverall is not set correctly"
    );

    const expectedWaveMaxTokensPerWallet = 100;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      "waveMaxTokensPerWallet is not set correctly"
    );

    const expectedWaveSingleTokenPrice = 0;
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      "waveSingleTokenPrice is not set correctly"
    );
  });

  it('setAllowlistMint sets appropriate data', async function () {
    const {
      avatarCollectionContract,
    } = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    await contract.setAllowlistMint();

    const expectedWaveMaxTokens = await contract.maxSupply();
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      "waveMaxTokensOverall is not set correctly"
    );

    const expectedWaveMaxTokensPerWallet = 2;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      "waveMaxTokensPerWallet is not set correctly"
    );

    const expectedWaveSingleTokenPrice = BigNumber.from(100).mul('1000000000000000000');
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      "waveSingleTokenPrice is not set correctly"
    );
  });

  it('setPublicMint sets appropriate data', async function () {
    const {
      avatarCollectionContract,
    } = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    await contract.setPublicMint();

    const expectedWaveMaxTokens = await contract.maxSupply();
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      "waveMaxTokensOverall is not set correctly"
    );

    const expectedWaveMaxTokensPerWallet = 4;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      "waveMaxTokensPerWallet is not set correctly"
    );

    const expectedWaveSingleTokenPrice = BigNumber.from(100).mul('1000000000000000000');
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      "waveSingleTokenPrice is not set correctly"
    );
  });

  it('reveal should be able to be called with valid signature and send 1 event', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      signAuthMessageAs,
    } = await setupAvatar();

    // minting 1 token
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 1, 1, '1');
    await mint(
      raffleSignWallet,
      deployer, // mint to this address
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '1',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    const mintedTokenId = transferEvents[0].args?.[2];

    // revealing the token
    const signature = await signAuthMessageAs(
      raffleSignWallet,
      deployer,
      1,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
    );

    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(deployer));
    await contract.reveal(
      mintedTokenId,
      1,
      signature
    );

    // checking that the event was properly sent
    const metadataUpdateEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.MetadataUpdate()
    );

    assert.equal(metadataUpdateEvents.length, 1);
  });


  it('relevant functions should not work when paused', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      signAuthMessageAs,
      personalize,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 1, 1, '1');

    // pause contract
    await contract.pause();

    // mint should revert
    const signature = await signAuthMessageAs(
      raffleSignWallet,
      deployer,
      1,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
    );

    await expect(
      contract.mint(
        raffleSignWallet.address,
        1,
        0,
        signature,
    )).to.be.revertedWith('Pausable: paused');

    // reveal should revert (it would of reverted because token was not minted regardless)
    await expect(
      contract.reveal(
        1,
        0,
        signature,
    )).to.be.revertedWith('Pausable: paused');

    // personalize should revert (it would of reverted because token was not minted regardless)
    const personalizationMask = 32;
    await expect(personalize(
        raffleSignWallet,
        deployer,
        1,
        hre.network.config.chainId || 31337,
        0,
        personalizationMask
      )).to.be.revertedWith('Pausable: paused');

  });

  it('operatorPersonalize should work from owner', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupAvatar();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 20, 5, '10');
    await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    const mintedTokenId = transferEvents[0].args?.[2];

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    const personalizationMask = 32;

    const oldPersonalization = await contract.personalizationOf(mintedTokenId);
    // sanity check
    assert.equal(oldPersonalization, 0);

    await contract.operatorPersonalize(mintedTokenId, personalizationMask)

    const currentPersonalization = await contract.personalizationOf(mintedTokenId);
    assert.equal(currentPersonalization, personalizationMask);
    assert.notEqual(currentPersonalization, oldPersonalization);

  });

  it('config setters work (plus invalidations)', async function () {
    const {
      avatarCollectionContract,
      getNamedAccounts,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider).address;
    const contract = avatarCollectionContract.connect(ethers.provider.getSigner(owner));
    const contractAsUser = avatarCollectionContract.connect(ethers.provider.getSigner(deployer));

    // setTreasury // // // // // // // // // // // // // // // // // // // // // //
    const oldTreasury = await contract.mintTreasury();
    await contract.setTreasury(randomAddress);
    const newTreasury = await contract.mintTreasury();

    assert.notEqual(oldTreasury, newTreasury);
    assert.equal(randomAddress, newTreasury);

    await expect(
      contractAsUser.setTreasury(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      contract.setTreasury(AddressZero)
    ).to.be.revertedWith("AvatarCollection: owner is zero address");

    // setSignAddress // // // // // // // // // // // // // // // // // // // // // //
    const oldSignAddress = await contract.signAddress();
    await contract.setSignAddress(randomAddress);
    const newSignAddress = await contract.signAddress();

    assert.notEqual(oldSignAddress, newSignAddress);
    assert.equal(randomAddress, newSignAddress);

    await expect(
      contractAsUser.setSignAddress(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      contract.setSignAddress(AddressZero)
    ).to.be.revertedWith("AvatarCollection: sign address is zero address");

    // setBaseURI // // // // // // // // // // // // // // // // // // // // // //
    const oldBaseURI = await contract.baseTokenURI();
    const toSetNewURI = "http://test.test";
    await contract.setBaseURI(toSetNewURI);
    const newBaseURI = await contract.baseTokenURI();

    assert.notEqual(oldBaseURI, newBaseURI);
    assert.equal(toSetNewURI, newBaseURI);

    await expect(
      contractAsUser.setBaseURI(randomAddress)
    ).to.be.revertedWith('CollectionAccessControl: sender not authorized');

    await expect(
      contract.setBaseURI("")
    ).to.be.revertedWith("AvatarCollection: baseURI is not set");

    // setAllowedExecuteMint // // // // // // // // // // // // // // // // // // // // // //

    const oldAllowedToExecuteMint = await contract.allowedToExecuteMint();
    const {randomTokenContract} = await setupMockERC20();
    const randomToken = randomTokenContract.address;
    await contract.setAllowedExecuteMint(randomToken);
    const newAllowedToExecuteMint = await contract.allowedToExecuteMint();

    assert.notEqual(oldAllowedToExecuteMint, newAllowedToExecuteMint);
    assert.equal(randomToken, newAllowedToExecuteMint);

    await expect(
      contractAsUser.setAllowedExecuteMint(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      contract.setAllowedExecuteMint(randomAddress)
    ).to.be.revertedWith("AvatarCollection: executor address is not a contract");

  });


  it('should be able to mint with valid signature', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupAvatar();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 20, 5, '10');
    await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it(`@skip-on-coverage should be able to mint ${COLLECTION_MAX_SUPPLY} different tokens`, async function () {
    const nftPriceInSand = 1;
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupAvatar();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, '20000');
    await setupWave(
      avatarCollectionContract,
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

      console.log(
        `for batch ${
          index + 1
        } minting ${mintingBatch} tokens. With this will be minted: ${
          totalMinted + mintingBatch
        } NFTs`
      );

      const receipt = await mint(
        raffleSignWallet,
        deployer,
        index,
        avatarCollectionContract.address,
        hre.network.config.chainId || 31337,
        mintingBatch * nftPriceInSand, // amount to be used by SAND to be approved
        mintingBatch
      );

      const transferEvents = await avatarCollectionContract.queryFilter(
        avatarCollectionContract.filters.Transfer(),
        receipt.blockNumber
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
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
    } = await setupAvatar();
    const {deployer} = await getNamedAccounts();
    await transferSand(deployer, `${COLLECTION_MAX_SUPPLY}`);

    const waves = getSupplySplittedIn3Waves();
    const tokens = [];
    let totalMinted = 0;
    let signatureId = 0;
    for (const waveSize of waves) {
      await setupWave(
        avatarCollectionContract,
        waveSize,
        waveSize,
        nftPriceInSand.toString()
      );
      const mintingQuantities = getSupplySplittedInBatches(
        waveSize,
        BATCH_SIZE
      );
      console.log(
        `Minting with a wave size of ${waveSize} in ${mintingQuantities.length} batches with ${mintingQuantities[0]} tokens per mint TX`
      );

      for (const i in mintingQuantities) {
        signatureId++;
        const index = parseInt(i);
        const mintingBatch = mintingQuantities[index];

        console.log(
          `for batch ${
            index + 1
          } minting ${mintingBatch} tokens. With this will be minted: ${
            totalMinted + mintingBatch
          } NFTs`
        );

        const receipt = await mint(
          raffleSignWallet,
          deployer,
          signatureId,
          avatarCollectionContract.address,
          hre.network.config.chainId || 31337,
          mintingBatch * nftPriceInSand, // amount to be used by SAND to be approved
          mintingBatch
        );

        const transferEvents = await avatarCollectionContract.queryFilter(
          avatarCollectionContract.filters.Transfer(),
          receipt.blockNumber
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
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalize,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
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

    const personalizeEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Personalized()
    );

    assert.equal(personalizeEvents.length, 1);
    assert.exists(personalizeEvents[0].args);
    assert.equal(
      personalizeEvents[0]?.args?._personalizationMask,
      personalizationMask
    );

    const personalizationOf = await avatarCollectionContract.personalizationOf(
      tokenId
    );

    assert.equal(personalizationOf, personalizationMask);
  });

  it('should not be able to personalize with invalid signature', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalizeInvalidSignature,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
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
    ).to.be.revertedWith('AvatarCollection: signature check failed');
  });

  it('should be able to differentiate a personalized asset', async function () {
    const {
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalize,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');

    await setupWave(avatarCollectionContract, 20, 5, '10');

    const receipt1 = await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents1 = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer(),
      receipt1.blockNumber
    );
    assert.equal(transferEvents1.length, 1);

    const receipt2 = await mint(
      raffleSignWallet,
      deployer,
      1,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents2 = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer(),
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

    const allPersonalizeEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Personalized()
    );

    const personalizeEvents2 = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Personalized(),
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
      avatarCollectionContract,
      transferSand,
      setupWave,
      getNamedAccounts,
      hre,
      mint,
      personalizeSignature,
    } = await setupAvatar();

    const {deployer} = await getNamedAccounts();

    await transferSand(deployer, '1000');
    await setupWave(avatarCollectionContract, 20, 5, '10');

    await mint(
      raffleSignWallet,
      deployer,
      0,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await avatarCollectionContract.queryFilter(
      avatarCollectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    assert.exists(transferEvents[0].args);

    const tokenId = transferEvents[0]?.args?.tokenId.toString();

    const personalizationMask = 4;

    const signature = await personalizeSignature(
      raffleSignWallet,
      deployer,
      1,
      avatarCollectionContract.address,
      hre.network.config.chainId || 31337,
      tokenId,
      personalizationMask
    );

    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );

    await waitFor(
      contract.personalize(1, signature, tokenId, personalizationMask)
    );

    await expect(
      contract.personalize(1, signature, tokenId, personalizationMask)
    ).to.be.revertedWith('AvatarCollection: signatureId already used');
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

/*
// if we reach a point where the memory overhead is too big, we can use this generator instead of getSupplySplittedInBatches
function *batchSizes(itemCount: number, batchCount: number): Generator {
  const batchSize = Math.floor(itemCount / batchCount);
  while (itemCount > batchSize) {
    itemCount -= batchSize;
    yield batchSize;
  }
  yield itemCount;
}
*/
