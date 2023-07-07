import {expect} from 'chai';
import {runAssetSetup} from './fixtures/assetFixture';
import {ethers} from 'hardhat';

describe('Base Asset Contract (/packages/asset/contracts/Asset.sol)', function () {
  describe('Base URI', async function () {
    it('Should have correct base URI set in the constructor', async function () {
      const {AssetContract, mintOne, baseURI} = await runAssetSetup();
      const {tokenId, metadataHash} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      const extractedBaseURI = tokenURI.split(metadataHash)[0];
      expect(extractedBaseURI).to.be.equal(baseURI);
    });
    it('Should allow DEFAULT_ADMIN to change base URI', async function () {
      const {AssetContract, AssetContractAsAdmin, mintOne} =
        await runAssetSetup();
      await AssetContractAsAdmin.setBaseURI('newBaseURI');
      const {tokenId, metadataHash} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      const extractedBaseURI = tokenURI.split(metadataHash)[0];
      expect(extractedBaseURI).to.be.equal('newBaseURI');
    });
    it('Should not allow non-DEFAULT_ADMIN to change base URI', async function () {
      const {AssetContractAsMinter, minter, defaultAdminRole} =
        await runAssetSetup();
      await expect(
        AssetContractAsMinter.setBaseURI('newBaseURI')
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });
  });
  describe('Token URI', async function () {
    it('Should return correct token URI', async function () {
      const {AssetContract, mintOne, baseURI, metadataHashes} =
        await runAssetSetup();
      const {tokenId} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
    });
    it('Should allow DEFAULT_ADMIN to change token URI', async function () {
      const {
        AssetContract,
        AssetContractAsAdmin,
        mintOne,
        metadataHashes,
        baseURI,
      } = await runAssetSetup();
      const {tokenId} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
      await AssetContractAsAdmin.setTokenURI(tokenId, metadataHashes[1]);
      const newTokenURI = await AssetContract.uri(tokenId);
      expect(newTokenURI).to.be.equal(baseURI + metadataHashes[1]);
    });
    it('Should not allow DEFAULT_ADMIN to change token URI to already used hash', async function () {
      const {
        AssetContract,
        AssetContractAsAdmin,
        mintOne,
        metadataHashes,
        baseURI,
      } = await runAssetSetup();
      const {tokenId} = await mintOne();
      await mintOne(undefined, undefined, undefined, metadataHashes[1]);
      const tokenURI = await AssetContract.uri(tokenId);
      expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
      await expect(
        AssetContractAsAdmin.setTokenURI(tokenId, metadataHashes[1])
      ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
    });
    it('Should not allow non-DEFAULT_ADMIN to change token URI', async function () {
      const {
        AssetContractAsMinter,
        minter,
        mintOne,
        metadataHashes,
        defaultAdminRole,
      } = await runAssetSetup();
      const {tokenId} = await mintOne();
      await expect(
        AssetContractAsMinter.setTokenURI(tokenId, metadataHashes[1])
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });
  });
  describe('Minting', function () {
    it('Should allow account with MINTER_ROLE to mint', async function () {
      const {
        AssetContractAsMinter,
        generateRandomTokenId,
        minter,
        metadataHashes,
      } = await runAssetSetup();
      const tokenId = generateRandomTokenId();
      const amount = 1;
      await expect(
        AssetContractAsMinter.mint(
          minter.address,
          tokenId,
          amount,
          metadataHashes[0]
        )
      ).to.not.be.reverted;
    });
    it('Should not allow account without MINTER_ROLE to mint', async function () {
      const {
        AssetContractAsAdmin,
        generateRandomTokenId,
        assetAdmin,
        metadataHashes,
        minterRole,
      } = await runAssetSetup();
      const tokenId = generateRandomTokenId();
      const amount = 1;
      await expect(
        AssetContractAsAdmin.mint(
          assetAdmin.address,
          tokenId,
          amount,
          metadataHashes[0]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${assetAdmin.address.toLowerCase()} is missing role ${minterRole}`
      );
    });
    it('Should mark the metadata hash as used after minting', async function () {
      const {AssetContract, mintOne} = await runAssetSetup();
      const {tokenId, metadataHash} = await mintOne();
      const linkedTokenId = await AssetContract.hashUsed(metadataHash);
      expect(linkedTokenId).to.be.equal(ethers.utils.hexlify(tokenId));
    });
    describe('Single Mint', function () {
      it('Should mint tokens with correct amounts', async function () {
        const {AssetContract, mintOne, minter} = await runAssetSetup();
        const amount = 3;
        const {tokenId} = await mintOne(undefined, undefined, amount);
        const balance = await AssetContract.balanceOf(minter.address, tokenId);
        expect(balance).to.be.equal(3);
      });
      it('Should mint tokens with correct URI', async function () {
        const {AssetContract, mintOne, metadataHashes, baseURI} =
          await runAssetSetup();
        const {tokenId} = await mintOne();
        const tokenURI = await AssetContract.uri(tokenId);
        expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
      });
      it('Should mint tokens with correct owner', async function () {
        const {AssetContract, mintOne, owner} = await runAssetSetup();
        const amount = 1;
        const {tokenId} = await mintOne(owner.address, undefined, amount);
        const balance = await AssetContract.balanceOf(owner.address, tokenId);
        expect(balance).to.be.equal(amount);
      });
      it('should not allow minting with duplicate metadata hash', async function () {
        const {mintOne, metadataHashes} = await runAssetSetup();
        await mintOne(undefined, undefined, undefined, metadataHashes[0]);
        await expect(
          mintOne(undefined, undefined, undefined, metadataHashes[0])
        ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
      });
    });
    describe('Batch Mint', function () {
      it('Should mint tokens with correct amounts', async function () {
        const {AssetContract, mintBatch, minter} = await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(undefined, undefined, amounts);
        const balance = await AssetContract.balanceOfBatch(
          new Array(tokenIds.length).fill(minter.address),
          tokenIds
        );
        expect(balance).to.be.deep.equal(amounts);
      });
      it('Should mint tokens with correct URIs', async function () {
        const {AssetContract, mintBatch, metadataHashes, baseURI} =
          await runAssetSetup();
        const hashes = [metadataHashes[2], metadataHashes[3]];
        const {tokenIds} = await mintBatch(
          undefined,
          undefined,
          undefined,
          hashes
        );
        const tokenURI1 = await AssetContract.uri(tokenIds[0]);
        const tokenURI2 = await AssetContract.uri(tokenIds[1]);
        expect(tokenURI1).to.be.equal(baseURI + hashes[0]);
        expect(tokenURI2).to.be.equal(baseURI + hashes[1]);
      });
      it('Should mint tokens with correct owner', async function () {
        const {AssetContract, mintBatch, owner} = await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
        const balance = await AssetContract.balanceOfBatch(
          new Array(tokenIds.length).fill(owner.address),
          tokenIds
        );
        expect(balance).to.be.deep.equal(amounts);
      });
      it('should not allow minting with duplicate metadata hash in a batch', async function () {
        const {mintBatch, metadataHashes} = await runAssetSetup();
        await expect(
          mintBatch(undefined, undefined, undefined, [
            metadataHashes[0],
            metadataHashes[0],
          ])
        ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
      });
      it('should not allow minting with already existing metadata hash', async function () {
        const {mintOne, mintBatch, metadataHashes} = await runAssetSetup();
        await mintOne(undefined, undefined, undefined, metadataHashes[0]);
        await expect(
          mintBatch(undefined, undefined, undefined, [
            metadataHashes[0],
            metadataHashes[1],
          ])
        ).to.be.revertedWith('Asset: not allowed to reuse metadata hash');
      });
      it("should not allow minting if the length of the ids and amounts don't match", async function () {
        const {AssetContractAsMinter, generateRandomTokenId, minter} =
          await runAssetSetup();
        const tokenIds = [
          generateRandomTokenId(),
          generateRandomTokenId(),
          generateRandomTokenId(),
        ];
        const amounts = [1, 2];
        const hashes = ['0x1', '0x2', '0x3'];
        await expect(
          AssetContractAsMinter.mintBatch(
            minter.address,
            tokenIds,
            amounts,
            hashes
          )
        ).to.be.revertedWith('Asset: ids and amounts length mismatch');
      });
      it("should not allow minting if the length of the ids and hashes don't match", async function () {
        const {AssetContractAsMinter, generateRandomTokenId, minter} =
          await runAssetSetup();
        const tokenIds = [generateRandomTokenId(), generateRandomTokenId()];
        const amounts = [1, 2];
        const hashes = ['0x1'];
        await expect(
          AssetContractAsMinter.mintBatch(
            minter.address,
            tokenIds,
            amounts,
            hashes
          )
        ).to.be.revertedWith('Asset: ids and metadataHash length mismatch');
      });
    });
    describe('Mint Events', function () {
      it('Should emit TransferSingle event on single mint', async function () {
        const {AssetContract, mintOne} = await runAssetSetup();

        const {tx} = await mintOne();
        await expect(tx).to.emit(AssetContract, 'TransferSingle');
      });
      it('Should emit TransferSingle event with correct args on single mint', async function () {
        const {AssetContract, mintOne, generateRandomTokenId, minter} =
          await runAssetSetup();
        const tokenId = generateRandomTokenId();
        const amount = 3;
        const recipient = minter.address;
        const {tx} = await mintOne(recipient, tokenId, amount);
        await expect(tx)
          .to.emit(AssetContract, 'TransferSingle')
          .withArgs(
            minter.address,
            ethers.constants.AddressZero,
            recipient,
            tokenId,
            amount
          );
      });
      it('Should emit TransferBatch event on batch mint', async function () {
        const {AssetContract, mintBatch} = await runAssetSetup();
        const {tx} = await mintBatch();
        await expect(tx).to.emit(AssetContract, 'TransferBatch');
      });
      it('Should emit TransferBatch event with correct args on batch mint', async function () {
        const {AssetContract, mintBatch, generateRandomTokenId, minter} =
          await runAssetSetup();
        const tokenIds = [generateRandomTokenId(), generateRandomTokenId()];
        const amounts = [7, 2];
        const recipient = minter.address;
        const {tx} = await mintBatch(recipient, tokenIds, amounts);
        await expect(tx)
          .to.emit(AssetContract, 'TransferBatch')
          .withArgs(
            minter.address,
            ethers.constants.AddressZero,
            recipient,
            [
              ethers.utils.hexlify(tokenIds[0]),
              ethers.utils.hexlify(tokenIds[1]),
            ],
            amounts
          );
      });
    });
  });
  describe('Burning', function () {
    it('Should allow account with BURNER_ROLE to burn tokens from any account', async function () {
      const {AssetContract, mintOne, burnOne, owner} = await runAssetSetup();
      const {tokenId} = await mintOne(owner.address, undefined, 10);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        10
      );
      await burnOne(owner.address, tokenId, 5);
      const balanceAfterBurn = await AssetContract.balanceOf(
        owner.address,
        tokenId
      );
      expect(balanceAfterBurn).to.be.equal(5);
    });
    it('Should not allow account without BURNER_ROLE to burn tokens from any account', async function () {
      const {
        AssetContract,
        AssetContractAsMinter,
        mintOne,
        owner,
        burnerRole,
        minter,
      } = await runAssetSetup();
      const {tokenId} = await mintOne(owner.address, undefined, 10);
      expect(await AssetContract.balanceOf(owner.address, tokenId)).to.be.equal(
        10
      );
      await expect(
        AssetContractAsMinter.burnFrom(owner.address, tokenId, 5)
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${burnerRole}`
      );
    });
    it('Should allow account with BURNER_ROLE to burn batch of tokens from any account', async function () {
      const {AssetContract, mintBatch, burnBatch, owner} =
        await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
      const balance = await AssetContract.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await burnBatch(owner.address, tokenIds, [1, 1]);
      const balanceAfterBurn = await AssetContract.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balanceAfterBurn).to.be.deep.equal([1, 3]);
    });
    it('Should not allow account without BURNER_ROLE to burn batch of tokens from any account', async function () {
      const {
        AssetContract,
        AssetContractAsMinter,
        mintBatch,
        owner,
        burnerRole,
        minter,
      } = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
      const balance = await AssetContract.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await expect(
        AssetContractAsMinter.burnBatchFrom(owner.address, tokenIds, [1, 1])
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${burnerRole}`
      );
    });
  });
  describe('Trusted Forwarder', function () {
    it('should allow to read the trusted forwarder', async function () {
      const {AssetContract, trustedForwarder} = await runAssetSetup();
      expect(await AssetContract.getTrustedForwarder()).to.be.equal(
        trustedForwarder.address
      );
    });
    it('should allow DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetContract} = await runAssetSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await AssetContract.setTrustedForwarder(randomAddress);
      expect(await AssetContract.getTrustedForwarder()).to.be.equal(
        randomAddress
      );
    });
  });
});
