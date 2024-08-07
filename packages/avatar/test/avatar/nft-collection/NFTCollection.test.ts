import {assert, expect} from 'chai';
import {ethers} from 'hardhat';
import {parseUnits} from 'ethers';

import {
  COLLECTION_MAX_SUPPLY,
  setupAvatar,
  setupAvatarAndMint,
  setupNFTCollectionContract,
} from './NFTCollection.fixtures';
import {
  getTestingAccounts,
  setupMockERC20,
  topUpAddressWithETH,
} from '../fixtures';

const BATCH_SIZE = 50;
// eslint-disable-next-line mocha/no-skipped-tests
describe('NFTCollection', function () {
  it('setMarketingMint sets appropriate data', async function () {
    const {collectionContractAsOwner} = await setupNFTCollectionContract();

    await collectionContractAsOwner.setMarketingMint();
    const expectedWaveMaxTokens = 50;
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );
    const expectedWaveMaxTokensPerWallet = 50;
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = 0;

    assert.equal(
      (await collectionContractAsOwner.price(1)).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
    );
  });

  it('setAllowListMint sets appropriate data', async function () {
    const {collectionContractAsOwner} = await setupNFTCollectionContract();

    await collectionContractAsOwner.setAllowListMint();

    const expectedWaveMaxTokens = await collectionContractAsOwner.maxSupply();
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );

    const expectedWaveMaxTokensPerWallet = 2;
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = parseUnits('100', 'ether');
    assert.equal(
      (await collectionContractAsOwner.price(1)).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
    );
  });

  it('setPublicMint sets appropriate data', async function () {
    const {collectionContractAsOwner} = await setupNFTCollectionContract();

    await collectionContractAsOwner.setPublicMint();
    const expectedWaveMaxTokens = await collectionContractAsOwner.maxSupply();
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensOverall()).toString(),
      expectedWaveMaxTokens.toString(),
      'waveMaxTokensOverall is not set correctly'
    );

    const expectedWaveMaxTokensPerWallet = 4;
    assert.equal(
      (await collectionContractAsOwner.waveMaxTokensPerWallet()).toString(),
      expectedWaveMaxTokensPerWallet.toString(),
      'waveMaxTokensPerWallet is not set correctly'
    );

    const expectedWaveSingleTokenPrice = parseUnits('100', 'ether');
    assert.equal(
      (await collectionContractAsOwner.price(1)).toString(),
      expectedWaveSingleTokenPrice.toString(),
      'waveSingleTokenPrice is not set correctly'
    );
  });

  it('reveal should be able to be called with valid signature and send 1 event', async function () {
    const {
      network,
      collectionContractAsOwner: collectionContract,
      transferSand,
      setupWave,
      mint,
      signAuthMessageAs,
    } = await setupAvatar();

    // minting 1 token
    const {deployer, raffleSignWallet} = await getTestingAccounts();
    await transferSand(deployer.address, '1000');
    await setupWave(1, 1, '1');
    await mint(
      raffleSignWallet,
      deployer.address, // mint to this address
      0,
      await collectionContract.getAddress(),
      network.config.chainId || 31337,
      '1',
      1
    );
    const transferEvents = await collectionContract.queryFilter(
      collectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    const mintedTokenId = transferEvents[0].args?.[2];

    // revealing the token
    const signature = await signAuthMessageAs(
      raffleSignWallet,
      deployer.address,
      1,
      await collectionContract.getAddress(),
      network.config.chainId || 31337
    );

    const contract = collectionContract.connect(deployer);
    await contract.reveal(mintedTokenId, 1, signature);

    // checking that the event was properly sent
    const metadataUpdateEvents = await collectionContract.queryFilter(
      collectionContract.filters.MetadataUpdate()
    );

    assert.equal(metadataUpdateEvents.length, 1);
  });

  it('relevant functions should not work when paused', async function () {
    const {
      network,
      collectionContractAsOwner: collectionContract,
      transferSand,
      setupWave,
      signAuthMessageAs,
      personalize,
    } = await setupAvatar();

    const {deployer, raffleSignWallet} = await getTestingAccounts();

    await transferSand(deployer.address, '1000');
    await setupWave(1, 1, '1');

    // pause contract
    await collectionContract.pause();

    // mint should revert
    const signature = await signAuthMessageAs(
      raffleSignWallet,
      deployer.address,
      1,
      await collectionContract.getAddress(),
      network.config.chainId || 31337
    );

    await expect(
      collectionContract.mint(raffleSignWallet.address, 1, 0, signature)
    ).to.be.revertedWith('Pausable: paused');

    // burn should revert (would revert because not tokens are minted if not paused)
    await expect(collectionContract.burn(0)).to.be.revertedWith(
      'Pausable: paused'
    );

    // reveal should revert (it would of reverted because token was not minted regardless)
    await expect(collectionContract.reveal(1, 0, signature)).to.be.revertedWith(
      'Pausable: paused'
    );

    // personalize should revert (it would of reverted because token was not minted regardless)
    const personalizationMask = 32;
    await expect(
      personalize(
        raffleSignWallet,
        deployer.address,
        1,
        network.config.chainId || 31337,
        0,
        personalizationMask
      )
    ).to.be.revertedWith('Pausable: paused');
  });

  it('operatorPersonalize should work from owner', async function () {
    const {
      network,
      collectionContractAsOwner: collectionContract,
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
      await collectionContract.getAddress(),
      network.config.chainId || 31337,
      '10',
      1
    );

    const transferEvents = await collectionContract.queryFilter(
      collectionContract.filters.Transfer()
    );

    assert.equal(transferEvents.length, 1);
    const mintedTokenId = transferEvents[0].args?.[2];

    const personalizationMask = 32n;

    const oldPersonalization = await collectionContract.personalizationOf(
      mintedTokenId
    );
    // sanity check
    assert.equal(oldPersonalization, 0n);

    await collectionContract.operatorPersonalize(
      mintedTokenId,
      personalizationMask
    );

    const currentPersonalization = await collectionContract.personalizationOf(
      mintedTokenId
    );
    assert.equal(currentPersonalization, personalizationMask);
    assert.notEqual(currentPersonalization, oldPersonalization);
  });

  it('allowedToExecuteMint works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: collectionContract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(
      ethers.provider
    ).address;

    // setAllowedExecuteMint // // // // // // // // // // // // // // // // // // // // // //

    const oldAllowedToExecuteMint =
      await collectionContract.allowedToExecuteMint();
    const randomTokenContract = await setupMockERC20();
    const randomToken = await randomTokenContract.getAddress();
    await collectionContract.setAllowedExecuteMint(randomToken);
    const newAllowedToExecuteMint =
      await collectionContract.allowedToExecuteMint();

    assert.notEqual(oldAllowedToExecuteMint, newAllowedToExecuteMint);
    assert.equal(randomToken, newAllowedToExecuteMint);

    await expect(
      collectionContractAsRandomWallet.setAllowedExecuteMint(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      collectionContract.setAllowedExecuteMint(randomAddress)
    ).to.be.revertedWith('NFTCollection: executor address is not a contract');
  });

  it('setTreasury works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(
      ethers.provider
    ).address;

    // setTreasury // // // // // // // // // // // // // // // // // // // // // //
    const oldTreasury = await contract.mintTreasury();
    await contract.setTreasury(randomAddress);
    const newTreasury = await contract.mintTreasury();

    assert.notEqual(oldTreasury, newTreasury);
    assert.equal(randomAddress, newTreasury);

    await expect(
      collectionContractAsRandomWallet.setTreasury(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(contract.setTreasury(ethers.ZeroAddress)).to.be.revertedWith(
      'NFTCollection: owner is zero address'
    );
  });

  it('setSignAddress works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(
      ethers.provider
    ).address;

    // setSignAddress // // // // // // // // // // // // // // // // // // // // // //
    const oldSignAddress = await contract.signAddress();
    await contract.setSignAddress(randomAddress);
    const newSignAddress = await contract.signAddress();

    assert.notEqual(oldSignAddress, newSignAddress);
    assert.equal(randomAddress, newSignAddress);

    await expect(
      collectionContractAsRandomWallet.setSignAddress(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      contract.setSignAddress(ethers.ZeroAddress)
    ).to.be.revertedWith('NFTCollection: sign address is zero address');
  });

  it('setBaseURI works (plus invalidations)', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionContractAsRandomWallet,
    } = await setupAvatar();

    const randomAddress = ethers.Wallet.createRandom().connect(
      ethers.provider
    ).address;

    // setBaseURI // // // // // // // // // // // // // // // // // // // // // //
    const oldBaseURI = await contract.baseTokenURI();
    const toSetNewURI = 'http://test.test';
    await contract.setBaseURI(toSetNewURI);
    const newBaseURI = await contract.baseTokenURI();

    assert.notEqual(oldBaseURI, newBaseURI);
    assert.equal(toSetNewURI, newBaseURI);

    await expect(
      collectionContractAsRandomWallet.setBaseURI(randomAddress)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(contract.setBaseURI('')).to.be.revertedWith(
      'NFTCollection: baseURI is not set'
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
  it(`@skip-on-ci @skip-on-coverage should be able to mint ${COLLECTION_MAX_SUPPLY} different tokens`, async function () {
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

      console.log(
        `for batch ${
          index + 1
        } minting ${mintingBatch} tokens. With this will be minted: ${
          totalMinted + mintingBatch
        } NFTs`
      );

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
  it(`@skip-on-ci @skip-on-coverage should be able to mint ${COLLECTION_MAX_SUPPLY} different tokens in 3 waves`, async function () {
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
      await setupWave(waveSize, waveSize, nftPriceInSand.toString());
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
      personalizeEvents[0]?.args?.personalizationMask,
      personalizationMask
    );

    const personalizationOf = await contract.personalizationOf(tokenId);

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
    ).to.be.revertedWith('NFTCollection: signature check failed');
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
      personalizeEvents2[0]?.args?.personalizationMask,
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

    const personalizeTx = await contractAsDeployer.personalize(
      1,
      signature,
      tokenId,
      personalizationMask
    );
    await personalizeTx.wait();

    await expect(
      contractAsDeployer.personalize(1, signature, tokenId, personalizationMask)
    ).to.be.revertedWith('NFTCollection: signatureId already used');
  });

  /*////////////////////////////////////////////////////////
                    Burn functionality tests
  ////////////////////////////////////////////////////////*/

  it('burn logic should work in call cases', async function () {
    // setup
    const {
      collectionContract: NFTCollectionContract,
      collectionContractAsOwner: contractAsOwner,
      mintedIdx,
      minterAddress,
    } = await setupAvatarAndMint(3);
    const tokenId = mintedIdx[0];

    const {raffleSignWallet} = await getTestingAccounts();

    const avatarContractAsMinter = NFTCollectionContract.connect(
      await ethers.provider.getSigner(minterAddress)
    );

    const randomAddress = raffleSignWallet.address;
    await topUpAddressWithETH(randomAddress, 100);

    const avatarContractAsRandomAddress =
      NFTCollectionContract.connect(raffleSignWallet);

    // check that the owner (minter) of the token is indeed minterAddress
    assert.equal(await avatarContractAsMinter.ownerOf(tokenId), minterAddress);

    // sanity check that the random address is not the minter address
    assert.notEqual(randomAddress, minterAddress);

    // validated that burning is not allowed by default
    assert.isNotTrue(
      await avatarContractAsRandomAddress.isBurnEnabled(),
      'burning should be disabled by default'
    );
    await expect(
      avatarContractAsRandomAddress.burn(tokenId)
    ).to.be.revertedWith('Burning is not enabled');

    // enable burning
    await contractAsOwner.enableBurning();

    assert.isTrue(
      await avatarContractAsRandomAddress.isBurnEnabled(),
      'burning should of been enabled'
    );

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
    const burnedTokensCount = await avatarContractAsMinter.burnedTokensCount(
      minterAddress
    );

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

    // check that disable burning also works
    await contractAsOwner.disableBurning();

    assert.isNotTrue(
      await avatarContractAsRandomAddress.isBurnEnabled(),
      'burning should now be disabled'
    );
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
