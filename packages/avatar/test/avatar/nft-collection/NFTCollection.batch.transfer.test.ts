import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection batch transfer', function () {
  function check(method, data) {
    describe(method, function () {
      it(`owner of a token should be able to ${method}`, async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          randomWallet,
          randomWallet2,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setMarketingMint();
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
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setMarketingMint();
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
          collectionContractAsOwner,
          collectionContractAsRandomWallet2,
          randomWallet,
          randomWallet2,
          mint,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setMarketingMint();
        const tokenIds = await mint(5, randomWallet);
        await expect(
          collectionContractAsRandomWallet2[method](
            ...[randomWallet, randomWallet2, tokenIds, ...data]
          )
        ).to.revertedWith('ERC721: caller is not token owner or approved');
      });
    });
  }

  // eslint-disable-next-line mocha/no-setup-in-describe
  check('batchTransferFrom', []);
  // eslint-disable-next-line mocha/no-setup-in-describe
  check('safeBatchTransferFrom', ['0x']);
});
