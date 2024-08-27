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
      const {collectionContractAsRandomWallet, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(
        collectionContractAsRandomWallet[method](randomWallet)
      ).to.revertedWith('Ownable: caller is not the owner');
    });
    if (zeroAddressErr) {
      it(`other should fail to call ${method} with zero address`, async function () {
        const {collectionContractAsOwner} = await loadFixture(
          setupNFTCollectionContract
        );
        await expect(
          collectionContractAsOwner[method](ZeroAddress)
        ).to.revertedWith(zeroAddressErr);
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
    'NFTCollection: owner is zero address'
  );
  checkAddress(
    'setSignAddress',
    'signAddress',
    'SignAddressSet',
    'raffleSignWallet',
    'NFTCollection: sign address is zero address'
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
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setBaseURI(
          'http://something.something'
        )
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('owner should fail to setAllowedExecuteMint for non contract address', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.setBaseURI('')).to.revertedWith(
        'NFTCollection: baseURI is not set'
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
      const {collectionContractAsRandomWallet, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(
        collectionContractAsRandomWallet.setAllowedExecuteMint(randomWallet)
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('owner should fail to setAllowedExecuteMint for non contract address', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(
        contract.setAllowedExecuteMint(randomWallet)
      ).to.revertedWith('NFTCollection: executor address is not a contract');
    });
  });

  describe('pause / unpause', function () {
    it('owner should be able to pause / unpause the contract', async function () {
      const {collectionContractAsOwner: contract, nftCollectionAdmin} =
        await loadFixture(setupNFTCollectionContract);

      expect(await contract.paused()).to.be.false;

      await expect(contract.unpause()).to.revertedWith('Pausable: not paused');

      await expect(contract.pause())
        .to.emit(contract, 'Paused')
        .withArgs(nftCollectionAdmin);

      expect(await contract.paused()).to.be.true;

      await expect(contract.pause()).to.revertedWith('Pausable: paused');

      await expect(contract.unpause())
        .to.emit(contract, 'Unpaused')
        .withArgs(nftCollectionAdmin);
    });

    it('other should fail to pause / unpause the contract', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.pause(randomWallet)).to.revertedWith(
        'Ownable: caller is not the owner'
      );
      await expect(contract.unpause(randomWallet)).to.revertedWith(
        'Ownable: caller is not the owner'
      );
    });

    it('owner should fail to call restricted methods when paused', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await contract.pause();
      await expect(contract.mint(randomWallet, 10, 1, '0x')).to.revertedWith(
        'Pausable: paused'
      );
      await expect(contract.batchMint([[randomWallet, 1]])).to.revertedWith(
        'Pausable: paused'
      );
      await expect(contract.reveal(1, 1, '0x')).to.revertedWith(
        'Pausable: paused'
      );
      await expect(contract.personalize(1, '0x', 1, 1)).to.revertedWith(
        'Pausable: paused'
      );
      await expect(contract.burn(1)).to.revertedWith('Pausable: paused');
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
        await expect(
          contract.setDefaultRoyalty(randomWallet, 123)
        ).to.revertedWith('Ownable: caller is not the owner');
        await expect(contract.resetDefaultRoyalty()).to.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('owner should fail to call setDefaultRoyalty with wrong values', async function () {
        const {collectionContractAsOwner: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        await expect(
          contract.setDefaultRoyalty(randomWallet, 20000)
        ).to.revertedWith('ERC2981: royalty fee will exceed salePrice');
        await expect(
          contract.setDefaultRoyalty(ZeroAddress, 123)
        ).to.revertedWith('ERC2981: invalid receiver');
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
        await expect(
          contract.setTokenRoyalty(tokenId, randomWallet, 123)
        ).to.revertedWith('Ownable: caller is not the owner');
        await expect(contract.resetTokenRoyalty(tokenId)).to.revertedWith(
          'Ownable: caller is not the owner'
        );
      });

      it('owner should fail to call setTokenRoyalty with wrong values', async function () {
        const {collectionContractAsOwner: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        const tokenId = 34;
        await expect(
          contract.setTokenRoyalty(tokenId, randomWallet, 20000)
        ).to.revertedWith('ERC2981: royalty fee will exceed salePrice');
        await expect(
          contract.setTokenRoyalty(tokenId, ZeroAddress, 123)
        ).to.revertedWith('ERC2981: Invalid parameters');
      });
    });
  });

  describe('setMaxSupply', function () {
    it('owner should be able to setMaxSupply', async function () {
      const {collectionContractAsOwner, nftCollectionAdmin, maxSupply} =
        await loadFixture(setupNFTCollectionContract);
      await expect(collectionContractAsOwner.setMaxSupply(1))
        .to.emit(collectionContractAsOwner, 'MaxSupplySet')
        .withArgs(nftCollectionAdmin, maxSupply, 1);
      expect(await collectionContractAsOwner.maxSupply()).to.be.eq(1);
    });

    it('owner should fail to setMaxSupply bellow totalSupply', async function () {
      const {collectionContractAsOwner, nftCollectionAdmin, maxSupply, mint} =
        await loadFixture(setupNFTCollectionContract);
      await mint(10);
      const totalSupply = await collectionContractAsOwner.totalSupply();
      await expect(collectionContractAsOwner.setMaxSupply(totalSupply))
        .to.emit(collectionContractAsOwner, 'MaxSupplySet')
        .withArgs(nftCollectionAdmin, maxSupply, totalSupply);
      await expect(mint(1)).to.revertedWith(
        'NFTCollection: _waveMaxTokens exceeds maxSupply'
      );
      await expect(
        collectionContractAsOwner.setMaxSupply(totalSupply - 1n)
      ).to.revertedWith('NFTCollection: maxSupply must be gte totalSupply');
    });

    it('other should fail to setMaxSupply', async function () {
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setMaxSupply(1)
      ).to.revertedWith('Ownable: caller is not the owner');
    });
  });
});
