import {expect} from 'chai';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection', function () {
  describe('reveal', function () {
    it('token owner should be able to be call reveal with a valid signature', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet,
        randomWallet,
        authSign,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      await expect(
        collectionContractAsRandomWallet.reveal(
          tokenIds[0],
          222,
          await authSign(randomWallet, 222)
        )
      )
        .to.emit(collectionContractAsRandomWallet, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
    });

    it('other owner should fail to call reveal', async function () {
      const {collectionContractAsOwner, randomWallet, mint} = await loadFixture(
        setupNFTCollectionContract
      );
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      await expect(
        collectionContractAsOwner.reveal(tokenIds[0], 222, '0x')
      ).to.revertedWith('NFTCollection: sender is not owner');
    });

    describe('signature issues', function () {
      it('should not be able to reveal when with an invalid signature', async function () {
        const {collectionContractAsOwner, mint} =
          await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        await expect(
          collectionContractAsOwner.reveal(tokenIds[0], 222, '0x')
        ).to.revertedWith('ECDSA: invalid signature length');
      });

      it('should not be able to reveal when with a wrong signature (signed by wrong address)', async function () {
        const {collectionContractAsOwner, randomWallet, authSign, mint} =
          await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        await expect(
          collectionContractAsOwner.reveal(
            tokenIds[0],
            222,
            await authSign(randomWallet, 222, randomWallet)
          )
        ).to.revertedWith('NFTCollection: signature failed');
      });

      it('should not be able to reveal when the signature is used twice', async function () {
        const {collectionContractAsOwner, collectionOwner, authSign, mint} =
          await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        const signature = await authSign(collectionOwner, 222);
        await collectionContractAsOwner.reveal(tokenIds[0], 222, signature);
        await expect(
          collectionContractAsOwner.reveal(tokenIds[0], 222, signature)
        ).to.revertedWith('NFTCollection: signatureId already used');
      });
    });
  });

  describe('personalize', function () {
    it('token owner should be able to be call personalize with a valid signature', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet,
        randomWallet,
        personalizeSignature,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      const personalizationMask = '0x123456789abcdef0';
      const tx = collectionContractAsRandomWallet.personalize(
        222,
        await personalizeSignature(
          randomWallet,
          tokenIds[0],
          personalizationMask,
          222
        ),
        tokenIds[0],
        personalizationMask
      );
      await expect(tx)
        .to.emit(collectionContractAsRandomWallet, 'Personalized')
        .withArgs(randomWallet, tokenIds[0], personalizationMask);
      await expect(tx)
        .to.emit(collectionContractAsRandomWallet, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
      expect(
        await collectionContractAsOwner.personalizationOf(tokenIds[0])
      ).to.be.eq(personalizationMask);
    });

    it('other owner should fail to call personalize', async function () {
      const {collectionContractAsOwner, randomWallet, mint} = await loadFixture(
        setupNFTCollectionContract
      );
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      await expect(
        collectionContractAsOwner.personalize(
          222,
          '0x',
          tokenIds[0],
          '0x123456789abcdef0'
        )
      ).to.revertedWith('NFTCollection: sender is not owner');
    });

    describe('signature issues', function () {
      it('should not be able to personalize when with an invalid signature', async function () {
        const {collectionContractAsOwner, mint} =
          await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        await expect(
          collectionContractAsOwner.personalize(
            222,
            '0x',
            tokenIds[0],
            '0x123456789abcdef0'
          )
        ).to.revertedWith('ECDSA: invalid signature length');
      });

      it('should not be able to personalize when with a wrong signature (signed by wrong address)', async function () {
        const {
          collectionContractAsOwner,
          randomWallet,
          personalizeSignature,
          mint,
        } = await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        await expect(
          collectionContractAsOwner.personalize(
            222,
            await personalizeSignature(
              randomWallet,
              tokenIds[0],
              '0x123456789abcdef0',
              222,
              randomWallet
            ),
            tokenIds[0],
            '0x123456789abcdef0'
          )
        ).to.revertedWith('NFTCollection: signature check failed');
      });

      it('should not be able to personalize when the signature is used twice', async function () {
        const {
          collectionContractAsOwner,
          collectionOwner,
          personalizeSignature,
          mint,
        } = await setupNFTCollectionContract();
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(1);
        const signature = await personalizeSignature(
          collectionOwner,
          tokenIds[0],
          '0x123456789abcdef0',
          222
        );
        await collectionContractAsOwner.personalize(
          222,
          signature,
          tokenIds[0],
          '0x123456789abcdef0'
        );
        await expect(
          collectionContractAsOwner.personalize(
            222,
            signature,
            tokenIds[0],
            '0x123456789abcdef0'
          )
        ).to.revertedWith('NFTCollection: signatureId already used');
      });
    });
  });

  describe('operatorPersonalize', function () {
    it('owner should be able to be call operatorPersonalize', async function () {
      const {collectionContractAsOwner, collectionOwner, mint, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      const personalizationMask = '0x123456789abcdef0';
      const tx = collectionContractAsOwner.operatorPersonalize(
        tokenIds[0],
        personalizationMask
      );
      await expect(tx)
        .to.emit(collectionContractAsOwner, 'Personalized')
        .withArgs(collectionOwner, tokenIds[0], personalizationMask);
      await expect(tx)
        .to.emit(collectionContractAsOwner, 'MetadataUpdate')
        .withArgs(tokenIds[0]);
      expect(
        await collectionContractAsOwner.personalizationOf(tokenIds[0])
      ).to.be.eq(personalizationMask);
    });

    it('other owner should fail to call operatorPersonalize', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet,
        randomWallet,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setMarketingMint();
      const tokenIds = await mint(1, randomWallet);
      await expect(
        collectionContractAsRandomWallet.operatorPersonalize(
          tokenIds[0],
          '0x123456789abcdef0'
        )
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('owner should fail to call operatorPersonalize with an invalid tokenId', async function () {
      const {collectionContractAsOwner} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsOwner.operatorPersonalize(0, '0x123456789abcdef0')
      ).to.revertedWith('NFTCollection: invalid token ID');
    });
  });

  describe('coverage', function () {
    it('chain id', async function () {
      const {collectionContract} = await loadFixture(
        setupNFTCollectionContract
      );
      expect(await collectionContract.chain()).to.be.eq(31337);
    });

    it('supportsInterface', async function () {
      const {collectionContract} = await loadFixture(
        setupNFTCollectionContract
      );
      const ifaces = {
        IERC165Upgradeable: '0x01ffc9a7',
        IERC2981Upgradeable: '0x2a55205a',
        IERC721Upgradeable: '0x80ac58cd',
        IERC721MetadataUpgradeable: '0x5b5e139f',
      };
      for (const i in ifaces) {
        expect(await collectionContract.supportsInterface(ifaces[i])).to.be
          .true;
      }
      expect(await collectionContract.supportsInterface('0x11111111')).to.be
        .false;
    });
  });

  it(`@skip-on-ci @skip-on-coverage should be able to mint maxSupply different tokens in 3 waves`, async function () {
    const {
      collectionContractAsOwner: contract,
      maxSupply,
      deployer,
      sandContract,
      authSign,
    } = await setupNFTCollectionContract();
    const nftPriceInSand = 1;
    await sandContract.donateTo(deployer, maxSupply);
    const tokens = [];
    let totalMinted = 0;
    let signatureId = 222;
    const BATCH_SIZE = 50;

    const fistWave = Math.trunc(maxSupply / 6);
    const secondWave = Math.trunc((maxSupply * 2) / 6);
    const waves = [fistWave, secondWave, maxSupply - fistWave - secondWave];
    for (const waveSize of waves) {
      await contract.setupWave(waveSize, waveSize, nftPriceInSand);
      const mintingQuantities = Array.from<number>({
        length: Math.floor(waveSize / BATCH_SIZE),
      }).fill(BATCH_SIZE);
      if (waveSize % BATCH_SIZE) mintingQuantities.push(waveSize % BATCH_SIZE);
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

        const receipt = await sandContract
          .connect(deployer)
          .approveAndCall(
            contract,
            mintingBatch * nftPriceInSand,
            contract.interface.encodeFunctionData('mint', [
              await deployer.getAddress(),
              mintingBatch,
              signatureId,
              await authSign(deployer, signatureId),
            ])
          );
        const transferEvents = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber || undefined
        );
        expect(transferEvents).to.have.lengthOf(mintingBatch);
        totalMinted += mintingBatch;
        for (const event of transferEvents) {
          const tokenId = event.args?.tokenId.toString();
          expect(tokens).not.to.include(tokenId);
          tokens.push(tokenId);
        }
      }
    }
    expect(tokens).to.have.lengthOf(maxSupply);
  });
});
