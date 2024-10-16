import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

describe('NFTCollection batch transfer', function () {
  function check(method, data) {
    describe(method, function () {
      it(`owner of a token should be able to ${method}`, async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          randomWallet,
          randomWallet2,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(20);
        const tokenIds = await mint(5, randomWallet);
        await contract[method](
          ...[randomWallet, randomWallet2, tokenIds, ...data]
        );
        for (const t of tokenIds) {
          expect(await collectionContractAsOwner.ownerOf(t)).to.be.equal(
            randomWallet2
          );
        }
      });

      it(`approved should be able to ${method}`, async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          collectionContractAsRandomWallet2,
          randomWallet,
          randomWallet2,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(20);
        const tokenIds = await mint(5, randomWallet);
        for (const t of tokenIds) {
          await contract.approve(randomWallet2, t);
        }
        await collectionContractAsRandomWallet2[method](
          ...[randomWallet, randomWallet2, tokenIds, ...data]
        );
        for (const t of tokenIds) {
          expect(await collectionContractAsOwner.ownerOf(t)).to.be.equal(
            randomWallet2
          );
        }
      });

      it(`should fail to ${method} if not owner`, async function () {
        const {
          collectionContractAsRandomWallet2: contract,
          randomWallet,
          randomWallet2,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(20);
        const tokenIds = await mint(5, randomWallet);
        await expect(
          contract[method](...[randomWallet, randomWallet2, tokenIds, ...data])
        )
          .to.revertedWithCustomError(contract, 'ERC721InsufficientApproval')
          .withArgs(randomWallet2, tokenIds[0]);
      });

      it(`should fail to ${method} to address zero`, async function () {
        const {
          collectionContractAsRandomWallet2: contract,
          randomWallet,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(20);
        const tokenIds = await mint(5, randomWallet);
        await expect(
          contract[method](...[randomWallet, ZeroAddress, tokenIds, ...data])
        )
          .to.revertedWithCustomError(contract, 'ERC721InvalidReceiver')
          .withArgs(ZeroAddress);
      });

      it(`should fail to ${method} if not owner`, async function () {
        const {
          collectionContractAsRandomWallet2: contract,
          collectionContractAsRandomWallet,
          randomWallet,
          randomWallet2,
          setupDefaultWave,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await setupDefaultWave(20);
        const tokenIds = await mint(5, randomWallet);
        await collectionContractAsRandomWallet.approve(
          randomWallet2,
          tokenIds[0]
        );
        await expect(
          contract[method](...[randomWallet2, randomWallet, tokenIds, ...data])
        )
          .to.revertedWithCustomError(contract, 'ERC721IncorrectOwner')
          .withArgs(randomWallet2, tokenIds[0], randomWallet);
      });
    });
  }

  // eslint-disable-next-line mocha/no-setup-in-describe
  check('batchTransferFrom', []);
  // eslint-disable-next-line mocha/no-setup-in-describe
  check('safeBatchTransferFrom', ['0x']);

  describe('coverage for _checkOnERC721ReceivedImpl', function () {
    it('should be able to safeBatchTransferFrom to a holder ', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        mockERC721Holder,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      const tokenIds = await mint(5, randomWallet);
      // safeBatchTransferFrom
      await contract.safeBatchTransferFrom(
        randomWallet,
        mockERC721Holder,
        tokenIds,
        '0x'
      );
    });

    it('should fail to safeBatchTransferFrom if the holder returns the wrong selector', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        mockERC721Holder,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      const tokenIds = await mint(5, randomWallet);
      await mockERC721Holder.setReject(true);
      // safeBatchTransferFrom
      await expect(
        contract.safeBatchTransferFrom(
          randomWallet,
          mockERC721Holder,
          tokenIds,
          '0x'
        )
      )
        .to.revertedWithCustomError(contract, 'ERC721InvalidReceiver')
        .withArgs(mockERC721Holder);
    });

    it('should fail to safeBatchTransferFrom if the holder revers with empty string', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        mockERC721Holder,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      const tokenIds = await mint(5, randomWallet);
      await mockERC721Holder.setEmptyRevert(true);
      // safeBatchTransferFrom
      await expect(
        contract.safeBatchTransferFrom(
          randomWallet,
          mockERC721Holder,
          tokenIds,
          '0x'
        )
      )
        .to.revertedWithCustomError(contract, 'ERC721InvalidReceiver')
        .withArgs(mockERC721Holder);
    });

    it('should fail to safeBatchTransferFrom if the holder revers with a string', async function () {
      const {
        collectionContractAsRandomWallet: contract,
        mockERC721Holder,
        randomWallet,
        setupDefaultWave,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      const tokenIds = await mint(5, randomWallet);
      await mockERC721Holder.setRevert(true, 'pum');
      // safeBatchTransferFrom
      await expect(
        contract.safeBatchTransferFrom(
          randomWallet,
          mockERC721Holder,
          tokenIds,
          '0x'
        )
      ).to.revertedWith('pum');
    });
  });
});
