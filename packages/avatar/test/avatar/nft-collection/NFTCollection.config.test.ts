/* eslint-disable mocha/no-setup-in-describe */
import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

function checkAddress(
  method,
  getter,
  eventName,
  varName,
  zeroAddressErr = undefined
) {
  describe(method, function () {
    it(`owner should be able to ${method}`, async function () {
      const fixtures = await loadFixture(setupNFTCollectionContract);
      const contract = fixtures.collectionContractAsOwner;
      expect(await contract[getter]()).to.be.eq(fixtures[varName]);
      await expect(contract[method](fixtures.randomWallet))
        .to.emit(contract, eventName)
        .withArgs(
          fixtures.nftCollectionAdmin,
          fixtures[varName],
          fixtures.randomWallet
        );
      expect(await contract[getter]()).to.be.eq(fixtures.randomWallet);
    });

    it(`other should fail to ${method}`, async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract[method](randomWallet))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });
    if (zeroAddressErr) {
      it(`other should fail to call ${method} with zero address`, async function () {
        const {collectionContractAsOwner: contract} = await loadFixture(
          setupNFTCollectionContract
        );
        await expect(contract[method](ZeroAddress))
          .to.revertedWithCustomError(contract, zeroAddressErr)
          .withArgs(ZeroAddress);
      });
    }
  });
}

describe('NFTCollection config', function () {
  checkAddress(
    'setTrustedForwarder',
    'trustedForwarder',
    'TrustedForwarderSet',
    'trustedForwarder'
  );
  checkAddress(
    'setTreasury',
    'mintTreasury',
    'TreasurySet',
    'treasury',
    'InvalidTreasury'
  );
  checkAddress(
    'setSignAddress',
    'signAddress',
    'SignAddressSet',
    'raffleSignWallet',
    'InvalidSignAddress'
  );

  describe('base URI', function () {
    it('owner should be able to setBaseURI', async function () {
      const {
        collectionContractAsOwner: contract,
        nftCollectionAdmin,
        metadataUrl,
      } = await loadFixture(setupNFTCollectionContract);
      expect(await contract.baseTokenURI()).to.be.eq(metadataUrl);
      const someBaseUri = 'http://something.something';
      const tx = contract.setBaseURI(someBaseUri);
      await expect(tx)
        .to.emit(contract, 'BaseURISet')
        .withArgs(nftCollectionAdmin, metadataUrl, someBaseUri);
      await expect(tx)
        .to.emit(contract, 'BatchMetadataUpdate')
        .withArgs(0, '0x' + 'F'.repeat(64));
      expect(await contract.baseTokenURI()).to.be.eq(someBaseUri);
    });

    it('other should fail to setAllowedExecuteMint', async function () {
      const {collectionContractAsRandomWallet, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(
        collectionContractAsRandomWallet.setBaseURI(
          'http://something.something'
        )
      )
        .to.revertedWithCustomError(
          collectionContractAsRandomWallet,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(randomWallet);
    });

    it('owner should fail to setAllowedExecuteMint for non contract address', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.setBaseURI('')).to.revertedWithCustomError(
        contract,
        'InvalidBaseTokenURI'
      );
    });
  });

  describe('setAllowedExecuteMint', function () {
    it('owner should be able to setAllowedExecuteMint', async function () {
      const {
        collectionContractAsOwner: contract,
        nftCollectionAdmin,
        sandContract,
        mockERC20,
      } = await loadFixture(setupNFTCollectionContract);
      expect(await contract.allowedToExecuteMint()).to.be.eq(sandContract);
      const tx = contract.setAllowedExecuteMint(mockERC20);
      await expect(tx)
        .to.emit(contract, 'AllowedExecuteMintSet')
        .withArgs(nftCollectionAdmin, sandContract, mockERC20);
      expect(await contract.allowedToExecuteMint()).to.be.eq(mockERC20);
    });

    it('other should fail to setAllowedExecuteMint', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setAllowedExecuteMint(randomWallet))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });

    it('owner should fail to setAllowedExecuteMint for non contract address', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setAllowedExecuteMint(randomWallet))
        .to.revertedWithCustomError(contract, 'InvalidAllowedToExecuteMint')
        .withArgs(randomWallet);
    });
  });

  describe('pause / unpause', function () {
    it('owner should be able to pause / unpause the contract', async function () {
      const {collectionContractAsOwner: contract, nftCollectionAdmin} =
        await loadFixture(setupNFTCollectionContract);

      expect(await contract.paused()).to.be.false;

      await expect(contract.unpause()).to.revertedWithCustomError(
        contract,
        'ExpectedPause'
      );

      await expect(contract.pause())
        .to.emit(contract, 'Paused')
        .withArgs(nftCollectionAdmin);

      expect(await contract.paused()).to.be.true;

      await expect(contract.pause()).to.revertedWithCustomError(
        contract,
        'EnforcedPause'
      );

      await expect(contract.unpause())
        .to.emit(contract, 'Unpaused')
        .withArgs(nftCollectionAdmin);
    });

    it('other should fail to pause / unpause the contract', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.pause(randomWallet))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
      await expect(contract.unpause(randomWallet))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });

    it('owner should fail to call restricted methods when paused', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await contract.pause();
      await expect(
        contract.mint(randomWallet, 10, 1, '0x')
      ).to.revertedWithCustomError(contract, 'EnforcedPause');

      await expect(
        contract.waveMint(randomWallet, 10, 0, 1, '0x')
      ).to.revertedWithCustomError(contract, 'EnforcedPause');

      await expect(
        contract.batchMint(0, [[randomWallet, 1]])
      ).to.revertedWithCustomError(contract, 'EnforcedPause');

      await expect(contract.reveal(1, 1, '0x')).to.revertedWithCustomError(
        contract,
        'EnforcedPause'
      );

      await expect(
        contract.personalize(1, 1, 222, '0x')
      ).to.revertedWithCustomError(contract, 'EnforcedPause');

      await expect(contract.burn(1)).to.revertedWithCustomError(
        contract,
        'EnforcedPause'
      );
    });
  });

  describe('royalties', function () {
    describe('default royalty', function () {
      it('owner should be able to setDefaultRoyalty and resetDefaultRoyalty', async function () {
        const {
          collectionContractAsOwner: contract,
          nftCollectionAdmin,
          randomWallet,
        } = await loadFixture(setupNFTCollectionContract);

        expect(await contract.royaltyInfo(1, 20000)).to.be.deep.equal([
          ZeroAddress,
          0,
        ]);

        await expect(contract.setDefaultRoyalty(randomWallet, 123))
          .to.emit(contract, 'DefaultRoyaltySet')
          .withArgs(nftCollectionAdmin, randomWallet, 123);
        expect(await contract.royaltyInfo(12, 20000)).to.be.deep.equal([
          await randomWallet.getAddress(),
          (123 * 20000) / 10000,
        ]);

        await expect(contract.resetDefaultRoyalty())
          .to.emit(contract, 'DefaultRoyaltyReset')
          .withArgs(nftCollectionAdmin);

        expect(await contract.royaltyInfo(1, 20000)).to.be.deep.equal([
          ZeroAddress,
          0,
        ]);
      });

      it('other should fail to setDefaultRoyalty and resetDefaultRoyalty', async function () {
        const {collectionContractAsRandomWallet: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        await expect(contract.setDefaultRoyalty(randomWallet, 123))
          .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
          .withArgs(randomWallet);
        await expect(contract.resetDefaultRoyalty())
          .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
          .withArgs(randomWallet);
      });

      it('owner should fail to call setDefaultRoyalty with wrong values', async function () {
        const {collectionContractAsOwner: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        await expect(contract.setDefaultRoyalty(randomWallet, 20000))
          .to.revertedWithCustomError(contract, 'ERC2981InvalidDefaultRoyalty')
          .withArgs(20000, 10000);
        await expect(contract.setDefaultRoyalty(ZeroAddress, 123))
          .to.revertedWithCustomError(
            contract,
            'ERC2981InvalidDefaultRoyaltyReceiver'
          )
          .withArgs(ZeroAddress);
      });
    });

    describe('token royalty', function () {
      it('owner should be able to setTokenRoyalty and resetTokenRoyalty', async function () {
        const {
          collectionContractAsOwner: contract,
          nftCollectionAdmin,
          randomWallet,
        } = await loadFixture(setupNFTCollectionContract);
        const tokenId = 123;
        const otherTokenId = 124;
        const receiver = await randomWallet.getAddress();

        await contract.setDefaultRoyalty(randomWallet, 888);

        expect(await contract.royaltyInfo(tokenId, 20000)).to.be.deep.equal([
          receiver,
          (888 * 20000) / 10000,
        ]);
        expect(
          await contract.royaltyInfo(otherTokenId, 20000)
        ).to.be.deep.equal([receiver, (888 * 20000) / 10000]);

        await expect(contract.setTokenRoyalty(tokenId, randomWallet, 123))
          .to.emit(contract, 'TokenRoyaltySet')
          .withArgs(nftCollectionAdmin, tokenId, randomWallet, 123);

        expect(await contract.royaltyInfo(tokenId, 20000)).to.be.deep.equal([
          receiver,
          (123 * 20000) / 10000,
        ]);
        expect(
          await contract.royaltyInfo(otherTokenId, 20000)
        ).to.be.deep.equal([receiver, (888 * 20000) / 10000]);

        await expect(contract.resetTokenRoyalty(tokenId))
          .to.emit(contract, 'TokenRoyaltyReset')
          .withArgs(nftCollectionAdmin, tokenId);

        expect(await contract.royaltyInfo(tokenId, 20000)).to.be.deep.equal([
          receiver,
          (888 * 20000) / 10000,
        ]);
        expect(
          await contract.royaltyInfo(otherTokenId, 20000)
        ).to.be.deep.equal([receiver, (888 * 20000) / 10000]);
      });

      it('other should fail to setTokenRoyalty and resetTokenRoyalty', async function () {
        const {collectionContractAsRandomWallet: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        const tokenId = 34;
        await expect(contract.setTokenRoyalty(tokenId, randomWallet, 123))
          .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
          .withArgs(randomWallet);
        await expect(contract.resetTokenRoyalty(tokenId))
          .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
          .withArgs(randomWallet);
      });

      it('owner should fail to call setTokenRoyalty with wrong values', async function () {
        const {collectionContractAsOwner: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        const tokenId = 34;
        await expect(contract.setTokenRoyalty(tokenId, randomWallet, 20000))
          .to.revertedWithCustomError(contract, 'ERC2981InvalidTokenRoyalty')
          .withArgs(tokenId, 20000, 10000);
        await expect(contract.setTokenRoyalty(tokenId, ZeroAddress, 123))
          .to.revertedWithCustomError(
            contract,
            'ERC2981InvalidTokenRoyaltyReceiver'
          )
          .withArgs(tokenId, ZeroAddress);
      });
    });
  });

  describe('setMaxSupply', function () {
    it('owner should be able to setMaxSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        nftCollectionAdmin,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxSupply(1))
        .to.emit(contract, 'MaxSupplySet')
        .withArgs(nftCollectionAdmin, maxSupply, 1);
      expect(await contract.maxSupply()).to.be.eq(1);
    });

    it('owner should fail to setMaxSupply bellow totalSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        collectionOwner,
        nftCollectionAdmin,
        maxSupply,
        mint,
      } = await loadFixture(setupNFTCollectionContract);
      await mint(10);
      const totalSupply = await contract.totalSupply();
      await expect(contract.setMaxSupply(totalSupply))
        .to.emit(contract, 'MaxSupplySet')
        .withArgs(nftCollectionAdmin, maxSupply, totalSupply);
      await expect(contract.batchMint(0, [[collectionOwner, 1]]))
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(collectionOwner, 1);
      await expect(contract.setMaxSupply(totalSupply - 1n))
        .to.revertedWithCustomError(contract, 'LowMaxSupply')
        .withArgs(totalSupply - 1n, totalSupply);
    });

    it('other should fail to setMaxSupply', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxSupply(1))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });
  });

  describe('setMaxTokensPerWallet', function () {
    it('owner should be able to setMaxTokensPerWallet', async function () {
      const {
        collectionContractAsOwner: contract,
        nftCollectionAdmin,
        maxTokensPerWallet,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxTokensPerWallet(1))
        .to.emit(contract, 'MaxTokensPerWalletSet')
        .withArgs(nftCollectionAdmin, maxTokensPerWallet, 1);
      expect(await contract.maxTokensPerWallet()).to.be.eq(1);
    });

    it('owner should fail to setMaxTokensPerWallet above maxSupply', async function () {
      const {collectionContractAsOwner: contract, maxSupply} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxTokensPerWallet(maxSupply + 1))
        .to.revertedWithCustomError(contract, 'InvalidMaxTokensPerWallet')
        .withArgs(maxSupply + 1, maxSupply);
    });

    it('owner should fail to setMaxTokensPerWallet to zero', async function () {
      const {collectionContractAsOwner: contract, maxSupply} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxTokensPerWallet(0))
        .to.revertedWithCustomError(contract, 'InvalidMaxTokensPerWallet')
        .withArgs(0, maxSupply);
    });

    it('other should fail to setMaxTokensPerWallet', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setMaxTokensPerWallet(1))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });
  });
});
