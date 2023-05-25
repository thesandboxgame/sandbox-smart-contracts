import {expect, assert} from 'chai';
import {ethers} from 'hardhat';
import {waitFor} from '../../../utils';
const {BigNumber} = ethers;
const AddressZero = ethers.constants.AddressZero;

import {
  raffleSignWallet,
  setupAvatar,
  setupAvatarAndMint,
  COLLECTION_MAX_SUPPLY,
  implementationContractName,
  setupMockERC20,
  topUpAddress,
} from './AvatarCollection.fixtures';

const BATCH_SIZE = 50;

// eslint-disable-next-line mocha/no-skipped-tests
describe.only(implementationContractName, function () {
  it('setMarketingMint sets appropriate data', async function () {
    const {avatarCollectionContract} = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    await contract.setMarketingMint();

    const expectedWaveMaxTokens = 100;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );

    const expectedWaveMaxTokensPerWallet = 100;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = 0;
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
    );
  });

  it('setAllowlistMint sets appropriate data', async function () {
    const {avatarCollectionContract} = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    await contract.setAllowlistMint();

    const expectedWaveMaxTokens = await contract.maxSupply();
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );

    const expectedWaveMaxTokensPerWallet = 2;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = BigNumber.from(100).mul(
      '1000000000000000000'
    );
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
    );
  });

  it('setPublicMint sets appropriate data', async function () {
    const {avatarCollectionContract} = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    await contract.setPublicMint();

    const expectedWaveMaxTokens = await contract.maxSupply();
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );

    const expectedWaveMaxTokensPerWallet = 4;
    assert.equal(
      (await avatarCollectionContract.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = BigNumber.from(100).mul(
      '1000000000000000000'
    );
    assert.equal(
      (await avatarCollectionContract.waveSingleTokenPrice()).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
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
      hre.network.config.chainId || 31337
    );

    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );
    await contract.reveal(mintedTokenId, 1, signature);

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
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
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
      hre.network.config.chainId || 31337
    );

    await expect(
      contract.mint(raffleSignWallet.address, 1, 0, signature)
    ).to.be.revertedWith('Pausable: paused');

    // burn should revert (would revert because not tokens are minted if not paused)
    await expect(contract.burn(0)).to.be.revertedWith('Pausable: paused');

    // reveal should revert (it would of reverted because token was not minted regardless)
    await expect(contract.reveal(1, 0, signature)).to.be.revertedWith(
      'Pausable: paused'
    );

    // personalize should revert (it would of reverted because token was not minted regardless)
    const personalizationMask = 32;
    await expect(
      personalize(
        raffleSignWallet,
        deployer,
        1,
        hre.network.config.chainId || 31337,
        0,
        personalizationMask
      )
    ).to.be.revertedWith('Pausable: paused');
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
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const personalizationMask = 32;

    const oldPersonalization = await contract.personalizationOf(mintedTokenId);
    // sanity check
    assert.equal(oldPersonalization, 0);

    await contract.operatorPersonalize(mintedTokenId, personalizationMask);

    const currentPersonalization = await contract.personalizationOf(
      mintedTokenId
    );
    assert.equal(currentPersonalization, personalizationMask);
    assert.notEqual(currentPersonalization, oldPersonalization);
  });

  it('allowedToExecuteMint works (plus invalidations)', async function () {
    const {avatarCollectionContract, getNamedAccounts} = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );

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
    ).to.be.revertedWith(
      'AvatarCollection: executor address is not a contract'
    );
  });

  it('setTreasury works (plus invalidations)', async function () {
    const {avatarCollectionContract, getNamedAccounts} = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );

    // setTreasury // // // // // // // // // // // // // // // // // // // // // //
    const oldTreasury = await contract.mintTreasury();
    await contract.setTreasury(randomAddress);
    const newTreasury = await contract.mintTreasury();

    assert.notEqual(oldTreasury, newTreasury);
    assert.equal(randomAddress, newTreasury);

    await expect(contractAsUser.setTreasury(randomAddress)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );

    await expect(contract.setTreasury(AddressZero)).to.be.revertedWith(
      'AvatarCollection: owner is zero address'
    );
  });

  it('setSignAddress works (plus invalidations)', async function () {
    const {avatarCollectionContract, getNamedAccounts} = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );

    // setSignAddress // // // // // // // // // // // // // // // // // // // // // //
    const oldSignAddress = await contract.signAddress();
    await contract.setSignAddress(randomAddress);
    const newSignAddress = await contract.signAddress();

    assert.notEqual(oldSignAddress, newSignAddress);
    assert.equal(randomAddress, newSignAddress);

    await expect(
      contractAsUser.setSignAddress(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(contract.setSignAddress(AddressZero)).to.be.revertedWith(
      'AvatarCollection: sign address is zero address'
    );
  });

  it('setBaseURI works (plus invalidations)', async function () {
    const {avatarCollectionContract, getNamedAccounts} = await setupAvatar();

    const {deployer} = await getNamedAccounts();
    const owner = await avatarCollectionContract.owner();
    const randomAddress = ethers.Wallet.createRandom().connect(ethers.provider)
      .address;
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(deployer)
    );

    // setBaseURI // // // // // // // // // // // // // // // // // // // // // //
    const oldBaseURI = await contract.baseTokenURI();
    const toSetNewURI = 'http://test.test';
    await contract.setBaseURI(toSetNewURI);
    const newBaseURI = await contract.baseTokenURI();

    assert.notEqual(oldBaseURI, newBaseURI);
    assert.equal(toSetNewURI, newBaseURI);

    await expect(contractAsUser.setBaseURI(randomAddress)).to.be.revertedWith(
      'CollectionAccessControl: sender not authorized'
    );

    await expect(contract.setBaseURI('')).to.be.revertedWith(
      'AvatarCollection: baseURI is not set'
    );
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

  /*////////////////////////////////////////////////////////
                    Burn functionality tests
  ////////////////////////////////////////////////////////*/

  it('burn logic should work in call cases', async function () {
    // setup
    const {
      avatarCollectionContract,
      mintedIdx,
      minterAddress,
    } = await setupAvatarAndMint(3);
    const tokenId = mintedIdx[0];

    const avatarContractAsMinter = avatarCollectionContract.connect(
      ethers.provider.getSigner(minterAddress)
    );

    const randomAddress = raffleSignWallet.address;
    await topUpAddress(randomAddress, 100);

    const avatarContractAsRandomAddress = avatarCollectionContract.connect(
      ethers.provider.getSigner(randomAddress)
    );

    // check that the owner (minter) of the token is indeed minterAddress
    assert.equal(await avatarContractAsMinter.ownerOf(tokenId), minterAddress);

    // sanity check that the random address is not the minter address
    assert.notEqual(randomAddress, minterAddress);

    // validated that only the minter can burn an token (access control check)
    await expect(
      avatarContractAsRandomAddress.burn(tokenId)
    ).to.be.revertedWith('ERC721: caller is not token owner or approved');

    // actually do a host burn
    await avatarContractAsMinter.burn(tokenId);

    // check that a random address was not set, for whatever reason, as the minter
    assert.equal(
      await avatarContractAsMinter.didBurnTokens(randomAddress),
      false,
      'only minter could burn'
    );

    // check that it was actually burned
    await expect(avatarContractAsMinter.ownerOf(tokenId)).to.be.revertedWith(
      'ERC721: invalid token ID'
    );

    // check that the burner is correctly attributed
    assert.equal(await avatarContractAsMinter.burnerOf(tokenId), minterAddress);

    // check that minter was the one to burn a token
    assert.equal(
      await avatarContractAsMinter.didBurnTokens(minterAddress),
      true,
      'minter was the one to burn a token'
    );

    // another check that a random address was not somehow set as burner
    assert.equal(
      await avatarContractAsMinter.didBurnTokens(randomAddress),
      false,
      'only minter could burn'
    );

    // check that burn count is correct for minter
    assert.equal(
      (
        await avatarContractAsMinter.burnedTokensCount(minterAddress)
      ).toString(),
      '1',
      'minter burned 1 NFT'
    );

    // check that burn count is correct for random address
    assert.equal(
      (
        await avatarContractAsMinter.burnedTokensCount(randomAddress)
      ).toString(),
      '0',
      'random address burned 0 NFTs'
    );

    // burn the rest
    await avatarContractAsMinter.burn(mintedIdx[1]);
    await avatarContractAsMinter.burn(mintedIdx[2]);

    // check that new burn count is correct for minter
    assert.equal(
      (
        await avatarContractAsMinter.burnedTokensCount(minterAddress)
      ).toString(),
      '3',
      'minter burned 3 (all) NFT'
    );

    // check that all noted tokens as being burned were in the minted list. Count is already checked
    const burnedTokensCount = (
      await avatarContractAsMinter.burnedTokensCount(minterAddress)
    ).toNumber();
    for (const burnedTokenId of [...Array(burnedTokensCount).keys()]) {
      const burnedToken = await avatarContractAsMinter.burnedTokens(
        minterAddress,
        burnedTokenId
      );
      assert.isTrue(
        mintedIdx.includes(burnedToken.toString()),
        `burned tokenId:${burnedToken} not found in minted list`
      );
    }
  });

  /*////////////////////////////////////////////////////////
                CollectionAccessControl tests
  ////////////////////////////////////////////////////////*/

  it('CollectionAccess control: adding, revoking and checking roles for CONFIGURATOR_ROLE', async function () {
    // setup
    const {avatarCollectionContract} = await setupAvatar();

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );
    const toSetNewURI = 'http://test.test';

    const randomAddress = raffleSignWallet.address;
    await topUpAddress(randomAddress, 100);

    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(randomAddress)
    );

    // check owner can't set 0 address
    await expect(contract.addConfigurator(AddressZero)).to.be.revertedWith(
      'CollectionAccessControl: account is zero address'
    );

    // check simple operation restriction
    await expect(contractAsUser.setBaseURI(toSetNewURI)).to.be.revertedWith(
      'CollectionAccessControl: sender not authorized'
    );

    // check that role is not given
    assert.equal(
      await contract.hasRole(contract.CONFIGURATOR_ROLE(), randomAddress),
      false
    );
    await contract.addConfigurator(randomAddress);

    // check that role was given
    assert.equal(
      await contract.hasRole(contract.CONFIGURATOR_ROLE(), randomAddress),
      true
    );

    // check that now, with this role, the user can set the Base URI
    await contract.setBaseURI(toSetNewURI);

    // verify that it was actually modified
    assert.equal(await contract.baseTokenURI(), toSetNewURI);

    // revoke role for random address
    await contract.revokeConfiguratorRole(randomAddress);

    // check that role was removed
    assert.equal(
      await contract.hasRole(contract.CONFIGURATOR_ROLE(), randomAddress),
      false
    );

    // check that user now can't redo the action
    await expect(contractAsUser.setBaseURI('bad_link')).to.be.revertedWith(
      'CollectionAccessControl: sender not authorized'
    );
  });

  it('CollectionAccess control: adding, revoking and checking roles for TRANSFORMER_ROLE', async function () {
    // setup
    const {avatarCollectionContract, mintedIdx} = await setupAvatarAndMint(1);

    const owner = await avatarCollectionContract.owner();
    const contract = avatarCollectionContract.connect(
      ethers.provider.getSigner(owner)
    );

    const randomAddress = raffleSignWallet.address;
    await topUpAddress(randomAddress, 100);

    const contractAsUser = avatarCollectionContract.connect(
      ethers.provider.getSigner(randomAddress)
    );

    const tokenId = mintedIdx[0];
    const personalizationMask = 42;

    // check owner can't set 0 address for transformer role
    await expect(contract.addTransformer(AddressZero)).to.be.revertedWith(
      'CollectionAccessControl: account is zero address'
    );

    // check simple operation restriction
    await expect(
      contractAsUser.operatorPersonalize(tokenId, personalizationMask)
    ).to.be.revertedWith('CollectionAccessControl: sender not authorized');

    // check that role is not given
    assert.equal(
      await contract.hasRole(contract.TRANSFORMER_ROLE(), randomAddress),
      false
    );
    await contract.addTransformer(randomAddress);

    // check that role was given
    assert.equal(
      await contract.hasRole(contract.TRANSFORMER_ROLE(), randomAddress),
      true
    );

    // now it should actually work
    await contractAsUser.operatorPersonalize(tokenId, personalizationMask);

    // verify that it was actually modified
    assert.equal(
      await contract.personalizationOf(tokenId),
      personalizationMask
    );

    // revoke role for random address
    await contract.revokeTransformerRole(randomAddress);

    // check that role was removed
    assert.equal(
      await contract.hasRole(contract.TRANSFORMER_ROLE(), randomAddress),
      false
    );

    // check that user now can't redo the action
    await expect(
      contractAsUser.operatorPersonalize(tokenId, 32)
    ).to.be.revertedWith('CollectionAccessControl: sender not authorized');
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
