import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {getStorageSlotJS} from '../fixtures';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe('NFTCollection', function () {
  describe('reveal', function () {
    it('token owner should be able to be call reveal with a valid signature', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        randomWallet,
        revealSig,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      await expect(
        contract.reveal(tokenIds[0], 222, await revealSig(randomWallet, 222))
      )
        .to.emit(contract, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
    });

    it('other owner should fail to call reveal', async function () {
      const {
        collectionContractAsOwner: contract,
        collectionOwner,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      await expect(contract.reveal(tokenIds[0], 222, '0x'))
        .to.revertedWithCustomError(contract, 'ERC721IncorrectOwner')
        .withArgs(collectionOwner, tokenIds[0], randomWallet);
    });

    describe('signature issues', function () {
      it('should not be able to reveal when with an invalid signature', async function () {
        const {
          collectionContractAsOwner: contract,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        await expect(contract.reveal(tokenIds[0], 222, '0x'))
          .to.revertedWithCustomError(contract, 'ECDSAInvalidSignatureLength')
          .withArgs(0);
      });

      it('should not be able to reveal when with a wrong signature (signed by wrong address)', async function () {
        const {
          collectionContractAsOwner: contract,
          randomWallet,
          mintSign,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        await expect(
          contract.reveal(
            tokenIds[0],
            222,
            await mintSign(randomWallet, 222, randomWallet)
          )
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });

      it('should not be able to reveal when the signature is used twice', async function () {
        const {
          collectionContractAsOwner: contract,
          collectionOwner,
          revealSig,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        const signature = await revealSig(collectionOwner, 222);
        await contract.reveal(tokenIds[0], 222, signature);
        await expect(contract.reveal(tokenIds[0], 222, signature))
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });
    });
  });

  describe('personalize', function () {
    it('token owner should be able to be call personalize with a valid signature', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        randomWallet,
        personalizeSignature,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      const personalizationMask = '0x123456789abcdef0';
      const tx = contract.personalize(
        tokenIds[0],
        personalizationMask,
        222,
        await personalizeSignature(
          randomWallet,
          tokenIds[0],
          personalizationMask,
          222
        )
      );
      await expect(tx)
        .to.emit(contract, 'Personalized')
        .withArgs(randomWallet, tokenIds[0], personalizationMask);
      await expect(tx)
        .to.emit(contract, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
      expect(await contract.personalizationOf(tokenIds[0])).to.be.eq(
        personalizationMask
      );
    });

    it('other owner should fail to call personalize', async function () {
      const {
        collectionContractAsOwner: contract,
        collectionOwner,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      await expect(
        contract.personalize(tokenIds[0], '0x123456789abcdef0', 222, '0x')
      )
        .to.revertedWithCustomError(contract, 'ERC721IncorrectOwner')
        .withArgs(collectionOwner, tokenIds[0], randomWallet);
    });

    describe('signature issues', function () {
      it('should not be able to personalize when with an invalid signature', async function () {
        const {
          collectionContractAsOwner: contract,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        await expect(
          contract.personalize(tokenIds[0], '0x123456789abcdef0', 222, '0x')
        )
          .to.revertedWithCustomError(contract, 'ECDSAInvalidSignatureLength')
          .withArgs(0);
      });

      it('should not be able to personalize when with a wrong signature (signed by wrong address)', async function () {
        const {
          collectionContractAsOwner: contract,
          randomWallet,
          personalizeSignature,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        await expect(
          contract.personalize(
            tokenIds[0],
            '0x123456789abcdef0',
            222,
            await personalizeSignature(
              randomWallet,
              tokenIds[0],
              '0x123456789abcdef0',
              222,
              randomWallet
            )
          )
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });

      it('should not be able to personalize when the signature is used twice', async function () {
        const {
          collectionContractAsOwner: contract,
          collectionOwner,
          personalizeSignature,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(0);
        const tokenIds = await mint(1);
        const signature = await personalizeSignature(
          collectionOwner,
          tokenIds[0],
          '0x123456789abcdef0',
          222
        );
        await contract.personalize(
          tokenIds[0],
          '0x123456789abcdef0',
          222,
          signature
        );
        await expect(
          contract.personalize(
            tokenIds[0],
            '0x123456789abcdef0',
            222,
            signature
          )
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });
    });
  });

  describe('operatorPersonalize', function () {
    it('owner should be able to be call operatorPersonalize', async function () {
      const {
        collectionContractAsOwner: contract,
        collectionOwner,
        setupDefaultWave,
        mint,
        randomWallet,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      const personalizationMask = '0x123456789abcdef0';
      const tx = contract.operatorPersonalize(tokenIds[0], personalizationMask);
      await expect(tx)
        .to.emit(contract, 'Personalized')
        .withArgs(collectionOwner, tokenIds[0], personalizationMask);
      await expect(tx)
        .to.emit(contract, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
      expect(await contract.personalizationOf(tokenIds[0])).to.be.eq(
        personalizationMask
      );
    });

    it('other owner should fail to call operatorPersonalize', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(0);
      const tokenIds = await mint(1, randomWallet);
      await expect(
        contract.operatorPersonalize(tokenIds[0], '0x123456789abcdef0')
      )
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });

    it('owner should fail to call operatorPersonalize with an invalid tokenId', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.operatorPersonalize(0, '0x123456789abcdef0'))
        .to.revertedWithCustomError(contract, 'ERC721NonexistentToken')
        .withArgs(0);
    });
  });

  describe('trusted forwarder', function () {
    it('should return msgData without sender when called from the trusted forwarder', async function () {
      const {
        nftCollectionMockAsTrustedForwarder: contract,
        trustedForwarder,
        randomWallet2,
      } = await loadFixture(setupNFTCollectionContract);
      expect(await contract.isTrustedForwarder(trustedForwarder)).to.be.true;
      // 4 (func signature) + 32 (address padded) - 20 bytes
      expect(await contract.msgData(randomWallet2)).to.be.eq(
        '0x3185cfaa000000000000000000000000'
      );
    });

    it('should return msgData with sender when called form any account', async function () {
      const {nftCollectionMockAsRandomWallet: contract, randomWallet2} =
        await loadFixture(setupNFTCollectionContract);
      expect(await contract.msgData(randomWallet2)).to.be.eq(
        '0x3185cfaa0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc'
      );
    });

    it('should return msgSender without sender when called from the trusted forwarder', async function () {
      const {
        nftCollectionMockAsTrustedForwarder: contract,
        trustedForwarder,
        randomWallet2,
      } = await loadFixture(setupNFTCollectionContract);
      expect(await contract.isTrustedForwarder(trustedForwarder)).to.be.true;
      // 4 (func signature) + 32 (address padded)
      expect(await contract.msgSender(randomWallet2)).to.be.eq(randomWallet2);
    });

    it('should return msgSender with sender when called form any account', async function () {
      const {
        nftCollectionMockAsRandomWallet: contract,
        randomWallet,
        randomWallet2,
      } = await loadFixture(setupNFTCollectionContract);
      expect(await contract.msgSender(randomWallet2)).to.be.eq(randomWallet);
    });
  });

  describe('coverage', function () {
    it('chain id', async function () {
      const {collectionContract: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      expect(await contract.chain()).to.be.eq(31337);
    });

    it('feeDenominator', async function () {
      const {collectionContract: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      expect(await contract.feeDenominator()).to.be.eq(10000);
    });

    it('supportsInterface', async function () {
      const {collectionContract: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      const ifaces = {
        IERC165Upgradeable: '0x01ffc9a7',
        IERC2981Upgradeable: '0x2a55205a',
        IERC721Upgradeable: '0x80ac58cd',
        IERC721MetadataUpgradeable: '0x5b5e139f',
        IERC4906: '0x49064906',
      };
      for (const i in ifaces) {
        expect(await contract.supportsInterface(ifaces[i]), i).to.be.true;
      }
      expect(await contract.supportsInterface('0x11111111')).to.be.false;
    });

    it('should not be able to reenter mint', async function () {
      const {
        mockERC20,
        collectionOwner,
        mintSign,
        randomWallet,
        raffleSignWallet,
        waveMaxTokensPerWallet,
        waveMaxTokensOverall,
        deployWithCustomArg,
      } = await loadFixture(setupNFTCollectionContract);
      const contract = await deployWithCustomArg({
        allowedToExecuteMint: await mockERC20.getAddress(),
      });
      const contractAsOwner = contract.connect(collectionOwner);
      await contractAsOwner.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        1
      );
      await expect(
        mockERC20.mintReenter(
          contract,
          await randomWallet.getAddress(),
          6,
          222,
          await mintSign(
            randomWallet,
            222,
            raffleSignWallet,
            await contract.getAddress()
          )
        )
      ).to.be.revertedWithCustomError(contract, 'ReentrancyGuardReentrantCall');
    });

    it('should not be able to reenter waveMint', async function () {
      const {
        mockERC20,
        collectionOwner,
        waveMintSign,
        randomWallet,
        raffleSignWallet,
        waveMaxTokensPerWallet,
        waveMaxTokensOverall,
        deployWithCustomArg,
      } = await loadFixture(setupNFTCollectionContract);
      const contract = await deployWithCustomArg({
        allowedToExecuteMint: await mockERC20.getAddress(),
      });
      const contractAsOwner = contract.connect(collectionOwner);
      await contractAsOwner.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        1
      );
      await expect(
        mockERC20.waveMintReenter(
          contract,
          await randomWallet.getAddress(),
          6,
          0,
          222,
          await waveMintSign(
            randomWallet,
            6,
            0,
            222,
            raffleSignWallet,
            await contract.getAddress()
          )
        )
      ).to.be.revertedWithCustomError(contract, 'ReentrancyGuardReentrantCall');
    });
  });

  it(`@skip-on-ci @skip-on-coverage should be able to mint maxSupply different tokens in 3 waves`, async function () {
    const {
      collectionContractAsOwner: contract,
      maxSupply,
      deployer,
      randomWallet,
      randomWallet2,
      sandContract,
      mintSign,
    } = await loadFixture(setupNFTCollectionContract);

    const nftPriceInSand = 1;
    await sandContract.donateTo(deployer, maxSupply);
    const tokens = [];
    let totalMinted = 0;
    let signatureId = 222;
    const WAVE_SIZE = 20;
    const NUM_WAVES = 3;

    const wallets = [deployer, randomWallet, randomWallet2];

    // Create 3 waves of 20 tokens each
    for (let wave = 0; wave < NUM_WAVES; wave++) {
      await sandContract.donateTo(wallets[wave], WAVE_SIZE);
      await contract.setupWave(WAVE_SIZE, WAVE_SIZE, nftPriceInSand);
      let waveMinted = 0;

      // Keep minting until wave is fully used
      while (waveMinted < WAVE_SIZE) {
        signatureId++;
        // Random quantity between 1 and remaining tokens in wave
        const remainingInWave = WAVE_SIZE - waveMinted;
        const mintingBatch = Math.floor(Math.random() * remainingInWave) + 1;

        console.log(
          `Wave ${
            wave + 1
          }: Minting batch of ${mintingBatch} tokens. Total minted in wave: ${
            waveMinted + mintingBatch
          }/${WAVE_SIZE}`
        );

        const receipt = await sandContract
          .connect(wallets[wave])
          .approveAndCall(
            contract,
            mintingBatch * nftPriceInSand,
            contract.interface.encodeFunctionData('mint', [
              await wallets[wave].getAddress(),
              mintingBatch,
              signatureId,
              await mintSign(wallets[wave], signatureId),
            ])
          );

        const transferEvents = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber || undefined
        );
        expect(transferEvents).to.have.lengthOf(mintingBatch);

        waveMinted += mintingBatch;
        totalMinted += mintingBatch;

        for (const event of transferEvents) {
          const tokenId = event.args?.tokenId.toString();
          expect(tokens).not.to.include(tokenId);
          tokens.push(tokenId);
        }
      }

      expect(waveMinted).to.equal(WAVE_SIZE);
    }

    expect(totalMinted).to.equal(WAVE_SIZE * NUM_WAVES);
    expect(tokens).to.have.lengthOf(WAVE_SIZE * NUM_WAVES);
  });

  it('check V5 storage structure', async function () {
    const {nftCollectionMock} = await loadFixture(setupNFTCollectionContract);
    const slots = await nftCollectionMock.getV5VarsStorageStructure();
    expect(slots.erc2771HandlerUpgradable).to.be.equal(
      getStorageSlotJS(
        'thesandbox.storage.avatar.nft-collection.ERC2771HandlerUpgradeable'
      )
    );
    expect(slots.updatableOperatorFiltererUpgradeable).to.be.equal(
      getStorageSlotJS(
        'thesandbox.storage.avatar.nft-collection.UpdatableOperatorFiltererUpgradeable'
      )
    );
    expect(slots.nftCollection).to.be.equal(
      getStorageSlotJS('thesandbox.storage.avatar.nft-collection.NFTCollection')
    );
    expect(slots.nftCollectionSignature).to.be.equal(
      getStorageSlotJS(
        'thesandbox.storage.avatar.nft-collection.NFTCollectionSignature'
      )
    );
  });
});
