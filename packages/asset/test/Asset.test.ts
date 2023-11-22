import {expect} from 'chai';
import {ethers, upgrades} from 'hardhat';
import {runAssetSetup} from './fixtures/asset/assetFixture';
import {setupOperatorFilter} from './fixtures/operatorFilterFixture';
import {
  AccessControlInterfaceId,
  ERC1155InterfaceId,
  ERC1155MetadataURIInterfaceId,
  ERC165InterfaceId,
  ERC2981InterfaceId,
  RoyaltyMultiDistributorInterfaceId,
  RoyaltyMultiRecipientsInterfaceId,
  RoyaltyUGCInterfaceId,
} from './utils/interfaceIds';
import {BigNumber} from 'ethers';
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('Base Asset Contract (/packages/asset/contracts/Asset.sol)', function () {
  describe('Access Control', function () {
    it('should have MINTER_ROLE defined', async function () {
      const {AssetContract} = await runAssetSetup();
      const minterRole = await AssetContract.MINTER_ROLE();
      expect(minterRole).to.be.equal(ethers.utils.id('MINTER_ROLE'));
    });
    it('should have BURNER_ROLE defined', async function () {
      const {AssetContract} = await runAssetSetup();
      const burnerRole = await AssetContract.BURNER_ROLE();
      expect(burnerRole).to.be.equal(ethers.utils.id('BURNER_ROLE'));
    });
    it('should be able to grant roles', async function () {
      const {AssetContract, AssetContractAsAdmin, owner} =
        await runAssetSetup();

      await AssetContractAsAdmin.grantRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      expect(
        await AssetContract.hasRole(
          ethers.utils.id('BURNER_ROLE'),
          owner.address
        )
      ).to.be.true;
    });
    it('should be able to revoke roles', async function () {
      const {AssetContract, AssetContractAsAdmin, owner} =
        await runAssetSetup();

      await AssetContractAsAdmin.grantRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      expect(
        await AssetContract.hasRole(
          ethers.utils.id('BURNER_ROLE'),
          owner.address
        )
      ).to.be.true;

      await AssetContractAsAdmin.revokeRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      expect(
        await AssetContract.hasRole(
          ethers.utils.id('BURNER_ROLE'),
          owner.address
        )
      ).to.be.false;
    });
    it('should emit RoleGranted event when granting roles', async function () {
      const {AssetContract, AssetContractAsAdmin, owner} =
        await runAssetSetup();

      const tx = await AssetContractAsAdmin.grantRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      await expect(tx).to.emit(AssetContract, 'RoleGranted');
    });
    it('should emit RoleRevoked event when revoking roles', async function () {
      const {AssetContract, AssetContractAsAdmin, owner} =
        await runAssetSetup();

      await AssetContractAsAdmin.grantRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      const tx = await AssetContractAsAdmin.revokeRole(
        ethers.utils.id('BURNER_ROLE'),
        owner.address
      );

      await expect(tx).to.emit(AssetContract, 'RoleRevoked');
    });
    it('should not allow non-DEFAULT_ADMIN to grant roles', async function () {
      const {AssetContractAsMinter, minter, defaultAdminRole} =
        await runAssetSetup();

      await expect(
        AssetContractAsMinter.grantRole(
          ethers.utils.id('BURNER_ROLE'),
          minter.address
        )
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });
  });
  describe('Base URI', function () {
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
  describe('Token URI', function () {
    it('Should return correct token URI', async function () {
      const {AssetContract, mintOne, baseURI, metadataHashes} =
        await runAssetSetup();
      const {tokenId} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
    });
    it('Should allow MODERATOR_ROLE to change token URI', async function () {
      const {
        AssetContract,
        AssetContractAsOwner,
        owner,
        AssetContractAsAdmin,
        mintOne,
        metadataHashes,
        baseURI,
      } = await runAssetSetup();
      const {tokenId} = await mintOne();
      const tokenURI = await AssetContract.uri(tokenId);
      expect(tokenURI).to.be.equal(baseURI + metadataHashes[0]);
      // grant moderator role to owner
      await AssetContractAsAdmin.grantRole(
        ethers.utils.id('MODERATOR_ROLE'),
        owner.address
      );
      await AssetContractAsOwner.setTokenURI(tokenId, metadataHashes[1]);
      const newTokenURI = await AssetContract.uri(tokenId);
      expect(newTokenURI).to.be.equal(baseURI + metadataHashes[1]);
    });
    it('Should not allow unauthorized accounts to change token URI', async function () {
      const {AssetContractAsMinter, mintOne, metadataHashes, minter} =
        await runAssetSetup();
      const {tokenId} = await mintOne();
      await expect(
        AssetContractAsMinter.setTokenURI(tokenId, metadataHashes[1])
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${ethers.utils.id(
          'MODERATOR_ROLE'
        )}`
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
        ).to.be.revertedWith('Asset: Hash already used');
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
        ).to.be.revertedWith('Asset: Hash already used');
      });
      it('should not allow minting with already existing metadata hash', async function () {
        const {mintOne, mintBatch, metadataHashes} = await runAssetSetup();
        await mintOne(undefined, undefined, undefined, metadataHashes[0]);
        await expect(
          mintBatch(undefined, undefined, undefined, [
            metadataHashes[0],
            metadataHashes[1],
          ])
        ).to.be.revertedWith('Asset: Hash already used');
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
        ).to.be.revertedWith('Asset: 2-Array mismatch');
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
        ).to.be.revertedWith('Asset: 1-Array mismatch');
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
    it('should allow users to burn their own tokens - single token', async function () {
      const {AssetContractAsOwner, mintOne, owner} = await runAssetSetup();
      const {tokenId} = await mintOne(owner.address, undefined, 10);
      expect(
        await AssetContractAsOwner.balanceOf(owner.address, tokenId)
      ).to.be.equal(10);
      await AssetContractAsOwner.burn(owner.address, tokenId, 5);
      const balanceAfterBurn = await AssetContractAsOwner.balanceOf(
        owner.address,
        tokenId
      );
      expect(balanceAfterBurn).to.be.equal(5);
    });
    it('should allow users to burn their own tokens - batch of tokens', async function () {
      const {AssetContractAsOwner, mintBatch, owner} = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
      const balance = await AssetContractAsOwner.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await AssetContractAsOwner.burnBatch(owner.address, tokenIds, [1, 1]);
      const balanceAfterBurn = await AssetContractAsOwner.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balanceAfterBurn).to.be.deep.equal([1, 3]);
    });
    describe('Burning Events', function () {
      it('should emit TransferSingle event on burnFrom', async function () {
        const {AssetContractAsBurner, mintOne, minter} = await runAssetSetup();
        const {tokenId} = await mintOne();
        const tx = await AssetContractAsBurner.burnFrom(
          minter.address,
          tokenId,
          5
        );
        await expect(tx).to.emit(AssetContractAsBurner, 'TransferSingle');
      });
      it('should emit TransferSingle event with correct args on burnFrom', async function () {
        const {AssetContractAsBurner, mintOne, minter, burner} =
          await runAssetSetup();
        const {tokenId} = await mintOne();
        const tx = await AssetContractAsBurner.burnFrom(
          minter.address,
          tokenId,
          5
        );
        await expect(tx)
          .to.emit(AssetContractAsBurner, 'TransferSingle')
          .withArgs(
            burner.address,
            minter.address,
            ethers.constants.AddressZero,
            tokenId,
            5
          );
      });
      it('should emit TransferBatch event on burnBatchFrom', async function () {
        const {AssetContractAsBurner, mintBatch, minter} =
          await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(minter.address, undefined, amounts);
        const tx = await AssetContractAsBurner.burnBatchFrom(
          minter.address,
          tokenIds,
          [1, 1]
        );
        await expect(tx).to.emit(AssetContractAsBurner, 'TransferBatch');
      });
      it('should emit TransferBatch event with correct args on burnBatchFrom', async function () {
        const {AssetContractAsBurner, mintBatch, minter, burner} =
          await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(minter.address, undefined, amounts);
        const tx = await AssetContractAsBurner.burnBatchFrom(
          minter.address,
          tokenIds,
          [1, 1]
        );
        await expect(tx)
          .to.emit(AssetContractAsBurner, 'TransferBatch')
          .withArgs(
            burner.address,
            minter.address,
            ethers.constants.AddressZero,
            [
              ethers.utils.hexlify(tokenIds[0]),
              ethers.utils.hexlify(tokenIds[1]),
            ],
            [1, 1]
          );
      });
      it("should emit TransferSingle event on owner's burn", async function () {
        const {AssetContractAsOwner, mintOne, owner} = await runAssetSetup();
        const {tokenId} = await mintOne(owner.address, undefined, 10);
        const tx = await AssetContractAsOwner.burn(owner.address, tokenId, 5);
        await expect(tx).to.emit(AssetContractAsOwner, 'TransferSingle');
      });
      it("should emit TransferSingle event with correct args on owner's burn", async function () {
        const {AssetContractAsOwner, mintOne, owner} = await runAssetSetup();
        const {tokenId} = await mintOne(owner.address, undefined, 10);
        const tx = await AssetContractAsOwner.burn(owner.address, tokenId, 5);
        await expect(tx)
          .to.emit(AssetContractAsOwner, 'TransferSingle')
          .withArgs(
            owner.address,
            owner.address,
            ethers.constants.AddressZero,
            tokenId,
            5
          );
      });
      it("should emit TransferBatch event on owner's burnBatch", async function () {
        const {AssetContractAsOwner, mintBatch, owner} = await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
        const tx = await AssetContractAsOwner.burnBatch(
          owner.address,
          tokenIds,
          [1, 1]
        );
        await expect(tx).to.emit(AssetContractAsOwner, 'TransferBatch');
      });
      it("should emit TransferBatch event with correct args on owner's burnBatch", async function () {
        const {AssetContractAsOwner, mintBatch, owner} = await runAssetSetup();
        const amounts = [2, 4];
        const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
        const tx = await AssetContractAsOwner.burnBatch(
          owner.address,
          tokenIds,
          [1, 1]
        );
        await expect(tx)
          .to.emit(AssetContractAsOwner, 'TransferBatch')
          .withArgs(
            owner.address,
            owner.address,
            ethers.constants.AddressZero,
            [
              ethers.utils.hexlify(tokenIds[0]),
              ethers.utils.hexlify(tokenIds[1]),
            ],
            [1, 1]
          );
      });
    });
  });
  describe('Trusted Forwarder', function () {
    it('should allow to read the trusted forwarder', async function () {
      const {AssetContract, trustedForwarder} = await runAssetSetup();
      expect(await AssetContract.getTrustedForwarder()).to.be.equal(
        trustedForwarder.address
      );
    });
    it('should correctly check if an address is a trusted forwarder or not', async function () {
      const {AssetContract, trustedForwarder} = await runAssetSetup();
      expect(await AssetContract.isTrustedForwarder(trustedForwarder.address))
        .to.be.true;
      expect(
        await AssetContract.isTrustedForwarder(ethers.constants.AddressZero)
      ).to.be.false;
    });
    it('should return correct msgData', async function () {
      const {MockAssetContract} = await runAssetSetup();
      // call the function to satisfy the coverage only
      await MockAssetContract.msgData();
    });
    it('should allow DEFAULT_ADMIN to set the trusted forwarder ', async function () {
      const {AssetContract} = await runAssetSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await AssetContract.setTrustedForwarder(randomAddress);
      expect(await AssetContract.getTrustedForwarder()).to.be.equal(
        randomAddress
      );
    });
    it("should not allow non-DEFAULT_ADMIN to set the trusted forwarder's address", async function () {
      const {AssetContractAsMinter, minter, defaultAdminRole} =
        await runAssetSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await expect(
        AssetContractAsMinter.setTrustedForwarder(randomAddress)
      ).to.be.revertedWith(
        `AccessControl: account ${minter.address.toLowerCase()} is missing role ${defaultAdminRole}`
      );
    });
  });
  describe('Transferring', function () {
    it('should allow owner to transfer a single token', async function () {
      const {AssetContractAsOwner, mintOne, owner} = await runAssetSetup();
      const {tokenId} = await mintOne(owner.address, undefined, 10);
      await AssetContractAsOwner.safeTransferFrom(
        owner.address,
        ethers.Wallet.createRandom().address,
        tokenId,
        5,
        '0x'
      );
      const balanceAfterTransfer = await AssetContractAsOwner.balanceOf(
        owner.address,
        tokenId
      );
      expect(balanceAfterTransfer).to.be.equal(5);
    });
    it('should allow owner to transfer a batch of tokens', async function () {
      const {AssetContractAsOwner, mintBatch, owner} = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
      const balance = await AssetContractAsOwner.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await AssetContractAsOwner.safeBatchTransferFrom(
        owner.address,
        ethers.Wallet.createRandom().address,
        tokenIds,
        [1, 1],
        '0x'
      );
      const balanceAfterTransfer = await AssetContractAsOwner.balanceOfBatch(
        new Array(tokenIds.length).fill(owner.address),
        tokenIds
      );
      expect(balanceAfterTransfer).to.be.deep.equal([1, 3]);
    });
    it('should allow non-owner to transfer a single token if approved', async function () {
      const {
        AssetContractAsMinter,
        AssetContractAsOwner,
        mintOne,
        minter,
        owner,
      } = await runAssetSetup();
      const {tokenId} = await mintOne(minter.address, undefined, 10);
      await AssetContractAsMinter.setApprovalForAll(owner.address, true);
      await AssetContractAsOwner.safeTransferFrom(
        minter.address,
        ethers.Wallet.createRandom().address,
        tokenId,
        5,
        '0x'
      );
      const balanceAfterTransfer = await AssetContractAsMinter.balanceOf(
        minter.address,
        tokenId
      );
      expect(balanceAfterTransfer).to.be.equal(5);
    });
    it('should allow non-owner to transfer a batch of tokens if approved', async function () {
      const {
        AssetContractAsMinter,
        AssetContractAsOwner,
        mintBatch,
        minter,
        owner,
      } = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(minter.address, undefined, amounts);
      const balance = await AssetContractAsMinter.balanceOfBatch(
        new Array(tokenIds.length).fill(minter.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await AssetContractAsMinter.setApprovalForAll(owner.address, true);
      await AssetContractAsOwner.safeBatchTransferFrom(
        minter.address,
        ethers.Wallet.createRandom().address,
        tokenIds,
        [1, 1],
        '0x'
      );
      const balanceAfterTransfer = await AssetContractAsMinter.balanceOfBatch(
        new Array(tokenIds.length).fill(minter.address),
        tokenIds
      );
      expect(balanceAfterTransfer).to.be.deep.equal([1, 3]);
    });
    it('should not allow non-owner to transfer a single token if not approved', async function () {
      const {AssetContractAsOwner, mintOne, minter} = await runAssetSetup();
      const {tokenId} = await mintOne(minter.address, undefined, 10);
      await expect(
        AssetContractAsOwner.safeTransferFrom(
          minter.address,
          ethers.Wallet.createRandom().address,
          tokenId,
          5,
          '0x'
        )
      ).to.be.revertedWith('Asset: Transfer error');
    });
    it('should not allow non-owner to transfer a batch of tokens if not approved', async function () {
      const {AssetContractAsOwner, mintBatch, minter} = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(minter.address, undefined, amounts);
      const balance = await AssetContractAsOwner.balanceOfBatch(
        new Array(tokenIds.length).fill(minter.address),
        tokenIds
      );
      expect(balance).to.be.deep.equal(amounts);
      await expect(
        AssetContractAsOwner.safeBatchTransferFrom(
          minter.address,
          ethers.Wallet.createRandom().address,
          tokenIds,
          [1, 1],
          '0x'
        )
      ).to.be.revertedWith('ERC1155: caller is not token owner or approved');
    });
    it('should emit TransferSingle event on single transfer', async function () {
      const {AssetContractAsOwner, mintOne, owner} = await runAssetSetup();
      const {tokenId} = await mintOne(owner.address, undefined, 10);
      const tx = await AssetContractAsOwner.safeTransferFrom(
        owner.address,
        ethers.Wallet.createRandom().address,
        tokenId,
        5,
        '0x'
      );
      await expect(tx).to.emit(AssetContractAsOwner, 'TransferSingle');
    });
    it('should emit TransferBatch event on batch transfer', async function () {
      const {AssetContractAsOwner, mintBatch, owner} = await runAssetSetup();
      const amounts = [2, 4];
      const {tokenIds} = await mintBatch(owner.address, undefined, amounts);
      const tx = await AssetContractAsOwner.safeBatchTransferFrom(
        owner.address,
        ethers.Wallet.createRandom().address,
        tokenIds,
        [1, 1],
        '0x'
      );
      await expect(tx).to.emit(AssetContractAsOwner, 'TransferBatch');
    });
  });
  describe('Approving', function () {
    it('should allow owners to approve other accounts to use their tokens', async function () {
      const {AssetContractAsOwner, owner} = await runAssetSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      await AssetContractAsOwner.setApprovalForAll(randomAddress, true);
      const approved = await AssetContractAsOwner.isApprovedForAll(
        owner.address,
        randomAddress
      );
      expect(approved).to.be.true;
    });
    it('should emit ApprovalForAll event approval', async function () {
      const {AssetContractAsOwner} = await runAssetSetup();
      const randomAddress = ethers.Wallet.createRandom().address;
      const tx = await AssetContractAsOwner.setApprovalForAll(
        randomAddress,
        true
      );
      await expect(tx).to.emit(AssetContractAsOwner, 'ApprovalForAll');
    });
  });
  describe('Interface support', function () {
    it('should support ERC165', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(await AssetContract.supportsInterface(ERC165InterfaceId)).to.be
        .true;
    });
    it('should support ERC1155', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(await AssetContract.supportsInterface(ERC1155InterfaceId)).to.be
        .true;
    });
    it('should support ERC1155MetadataURI', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(
        await AssetContract.supportsInterface(ERC1155MetadataURIInterfaceId)
      ).to.be.true;
    });
    it('should support AccessControlUpgradeable', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(await AssetContract.supportsInterface(AccessControlInterfaceId)).to
        .be.true;
    });
    it('should support IRoyaltyUGC', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(await AssetContract.supportsInterface(RoyaltyUGCInterfaceId)).to.be
        .true;
    });
    it('should support IRoyaltyMultiDistributor', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(
        await AssetContract.supportsInterface(
          RoyaltyMultiDistributorInterfaceId
        )
      ).to.be.true;
    });
    it('should support IRoyaltyMultiRecipients', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(
        await AssetContract.supportsInterface(RoyaltyMultiRecipientsInterfaceId)
      ).to.be.true;
    });
    it('should support IERC2981', async function () {
      const {AssetContract} = await runAssetSetup();
      expect(await AssetContract.supportsInterface(ERC2981InterfaceId)).to.be
        .true;
    });
  });
  describe('Token util', function () {
    it('should return correct creator from asset for a token', async function () {
      const {AssetContractAsMinter, generateAssetId, owner} =
        await runAssetSetup();

      const tier = 4;
      const revealNonce = 1;
      const creatorNonce = 1;
      const bridgeMinted = false;

      const tokenId = generateAssetId(
        owner.address,
        tier,
        creatorNonce,
        revealNonce,
        bridgeMinted
      );

      await AssetContractAsMinter.mint(owner.address, tokenId, 1, '0x');

      expect(await AssetContractAsMinter.getCreatorAddress(tokenId)).to.equal(
        owner.address
      );
    });

    it('should return correct bridged information from asset for a token', async function () {
      const {AssetContractAsMinter, generateAssetId, owner} =
        await runAssetSetup();

      const tier = 4;
      const revealNonce = 1;
      const creatorNonce = 1;
      const bridgeMinted = false;

      const tokenId = generateAssetId(
        owner.address,
        tier,
        creatorNonce,
        revealNonce,
        bridgeMinted
      );
      await AssetContractAsMinter.mint(owner.address, tokenId, 1, '0x');

      expect(await AssetContractAsMinter.isBridged(tokenId)).to.equal(
        bridgeMinted
      );
    });
    it('should return correct tier from asset for a token', async function () {
      const {AssetContractAsMinter, generateAssetId, owner} =
        await runAssetSetup();

      const tier = 4;
      const revealNonce = 1;
      const creatorNonce = 1;
      const bridgeMinted = false;

      const tokenId = generateAssetId(
        owner.address,
        tier,
        creatorNonce,
        revealNonce,
        bridgeMinted
      );

      await AssetContractAsMinter.mint(owner.address, tokenId, 1, '0x');

      expect(await AssetContractAsMinter.getTier(tokenId)).to.equal(tier);
    });
    it('should return correct revealed information from asset for a token', async function () {
      const {AssetContractAsMinter, generateAssetId, owner} =
        await runAssetSetup();

      const tier = 4;
      const revealNonce = 1;
      const creatorNonce = 1;
      const bridgeMinted = false;

      const tokenId = generateAssetId(
        owner.address,
        tier,
        creatorNonce,
        revealNonce,
        bridgeMinted
      );

      await AssetContractAsMinter.mint(owner.address, tokenId, 1, '0x');

      expect(await AssetContractAsMinter.isRevealed(tokenId)).to.equal(true);
      expect(await AssetContractAsMinter.getRevealNonce(tokenId)).to.equal(
        revealNonce
      );
    });
    it('should return correct creator nonce from asset for a token', async function () {
      const {AssetContractAsMinter, generateAssetId, owner} =
        await runAssetSetup();

      const tier = 4;
      const revealNonce = 1;
      const creatorNonce = 1;
      const bridgeMinted = false;

      const tokenId = generateAssetId(
        owner.address,
        tier,
        creatorNonce,
        revealNonce,
        bridgeMinted
      );

      await AssetContractAsMinter.mint(owner.address, tokenId, 1, '0x');
      expect(await AssetContractAsMinter.getCreatorNonce(tokenId)).to.equal(
        creatorNonce
      );
    });
  });
  describe('OperatorFilterer', function () {
    describe('common subscription setup', function () {
      it('should be registered', async function () {
        const {operatorFilterRegistry, Asset} = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isRegistered(Asset.address)
        ).to.be.equal(true);
      });
      it('should set registry and subscribe to common subscription', async function () {
        const {
          operatorFilterRegistry,
          assetAdmin,
          TrustedForwarder,
          assetOperatorFilterSubscription,
          RoyaltyManagerContract,
        } = await setupOperatorFilter();
        const AssetFactory = await ethers.getContractFactory('Asset');
        const Asset = await upgrades.deployProxy(
          AssetFactory,
          [
            TrustedForwarder.address,
            assetAdmin.address,
            'ipfs://',
            assetOperatorFilterSubscription.address,
            RoyaltyManagerContract.address,
          ],
          {
            initializer: 'initialize',
          }
        );

        await Asset.connect(assetAdmin).setOperatorRegistry(
          operatorFilterRegistry.address
        );
        expect(await Asset.getOperatorFilterRegistry()).to.be.equals(
          operatorFilterRegistry.address
        );

        await Asset.connect(assetAdmin).registerAndSubscribe(
          assetOperatorFilterSubscription.address,
          true
        );

        expect(
          await operatorFilterRegistry.isRegistered(Asset.address)
        ).to.be.equals(true);

        expect(
          await operatorFilterRegistry.subscriptionOf(Asset.address)
        ).to.be.equals(assetOperatorFilterSubscription.address);
      });

      it('should revert when registry is set zero and subscription is set zero', async function () {
        const {
          assetAdmin,
          TrustedForwarder,
          assetOperatorFilterSubscription,
          RoyaltyManagerContract,
        } = await setupOperatorFilter();
        const AssetFactory = await ethers.getContractFactory('Asset');
        const Asset = await upgrades.deployProxy(
          AssetFactory,
          [
            TrustedForwarder.address,
            assetAdmin.address,
            'ipfs://',
            assetOperatorFilterSubscription.address,
            RoyaltyManagerContract.address,
          ],
          {
            initializer: 'initialize',
          }
        );

        await expect(
          Asset.connect(assetAdmin).setOperatorRegistry(zeroAddress)
        ).to.be.revertedWith('Asset: Zero address');

        await expect(
          Asset.connect(assetAdmin).registerAndSubscribe(zeroAddress, true)
        ).to.be.revertedWith('Asset: Zero address');
      });

      it('should revert when registry is set and subscription is set by non-admin', async function () {
        const {
          assetAdmin,
          TrustedForwarder,
          assetOperatorFilterSubscription,
          RoyaltyManagerContract,
          operatorFilterRegistry,
          defaultAdminRole,
          user1,
        } = await setupOperatorFilter();
        const AssetFactory = await ethers.getContractFactory('Asset');
        const Asset = await upgrades.deployProxy(
          AssetFactory,
          [
            TrustedForwarder.address,
            assetAdmin.address,
            'ipfs://',
            assetOperatorFilterSubscription.address,
            RoyaltyManagerContract.address,
          ],
          {
            initializer: 'initialize',
          }
        );

        await expect(
          Asset.connect(user1).setOperatorRegistry(
            operatorFilterRegistry.address
          )
        ).to.be.revertedWith(
          `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${defaultAdminRole}`
        );

        await expect(
          Asset.connect(user1).registerAndSubscribe(
            assetOperatorFilterSubscription.address,
            true
          )
        ).to.be.revertedWith(
          `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${defaultAdminRole}`
        );
      });
      it('should not revert when registry is set and subscription is set by admin through trusted forwarder', async function () {
        const {
          assetAdmin,
          TrustedForwarder,
          assetOperatorFilterSubscription,
          RoyaltyManagerContract,
          operatorFilterRegistry,
        } = await setupOperatorFilter();
        const AssetFactory = await ethers.getContractFactory('Asset');
        const Asset = await upgrades.deployProxy(
          AssetFactory,
          [
            TrustedForwarder.address,
            assetAdmin.address,
            'ipfs://',
            assetOperatorFilterSubscription.address,
            RoyaltyManagerContract.address,
          ],
          {
            initializer: 'initialize',
          }
        );

        const setOperatorRequest = {
          from: assetAdmin.address,
          to: Asset.address,
          value: 0,
          gasLimit: 1000000,
          data: Asset.interface.encodeFunctionData('setOperatorRegistry', [
            operatorFilterRegistry.address,
          ]),
        };
        // expect the call to not revert
        await expect(TrustedForwarder.execute(setOperatorRequest)).to.not.be
          .reverted;

        const registerAndSubscribeRequest = {
          from: assetAdmin.address,
          to: Asset.address,
          value: 0,
          gasLimit: 1000000,
          data: Asset.interface.encodeFunctionData('registerAndSubscribe', [
            assetOperatorFilterSubscription.address,
            true,
          ]),
        };

        // expect the call to not revert
        await expect(TrustedForwarder.execute(registerAndSubscribeRequest)).to
          .not.be.reverted;

        expect(await Asset.getOperatorFilterRegistry()).to.be.equals(
          operatorFilterRegistry.address
        );
      });

      it('should be subscribed to common subscription', async function () {
        const {operatorFilterRegistry, Asset, assetOperatorFilterSubscription} =
          await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.subscriptionOf(Asset.address)
        ).to.be.equal(assetOperatorFilterSubscription.address);
      });

      it('default subscription should blacklist Mock Market places 1, 2 and not 3, 4', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          DEFAULT_SUBSCRIPTION,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it('common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it('Asset should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it("removing market places from common subscription's blacklist should reflect on asset's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          assetOperatorFilterSubscription,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash,
          false
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);
      });

      it("adding market places to common subscription's blacklist should reflect on asset's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace3,
          assetOperatorFilterSubscription,
          Asset,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);
        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash,
          true
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Asset.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Asset.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetOperatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetOperatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);
      });
    });

    describe('asset transfer and approval ', function () {
      it('should be able to safe transfer asset if from is the owner of token', async function () {
        const {Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.safeTransferFrom(
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('should be able to safe batch transfer asset if from is the owner of token', async function () {
        const {Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('should be able to safe transfer asset if from is the owner of asset and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.safeTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
          1
        );
      });

      it('should be able to safe batch transfer assets if from is the owner of assets and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.safeBatchTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(mockMarketPlace1.address, 1)).to.be.equal(
          1
        );
        expect(await Asset.balanceOf(mockMarketPlace1.address, 2)).to.be.equal(
          1
        );
      });

      it('it should not setApprovalForAll blacklisted market places', async function () {
        const {mockMarketPlace1, users} = await setupOperatorFilter();

        await expect(
          users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.reverted;
      });

      it('it should setApprovalForAll non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);
        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to setApprovalForAll non blacklisted marketplaces after they are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          Asset,
          users,
        } = await setupOperatorFilter();
        await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.reverted;
      });

      it('it should not be able to setApprovalForAll non blacklisted marketplaces after their codeHashes are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          Asset,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);

        await users[0].Asset.setApprovalForAll(mockMarketPlace3.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].Asset.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.reverted;
      });

      it('it should not be able to setApprovalForAll trusted forwarder if black listed', async function () {
        const {
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          users,
          TrustedForwarder,
        } = await setupOperatorFilter();

        const TrustedForwarderCodeHash =
          await operatorFilterRegistry.codeHashOf(TrustedForwarder.address);

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          TrustedForwarderCodeHash,
          true
        );

        await expect(
          users[1].Asset.setApprovalForAll(TrustedForwarder.address, true)
        ).to.be.reverted;
      });

      it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          Asset,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);

        await expect(
          users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.reverted;

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await users[0].Asset.setApprovalForAll(mockMarketPlace1.address, true);

        expect(
          await Asset.isApprovedForAll(
            users[0].address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.reverted;
      });

      it('it should not be able to transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.reverted;
      });

      it('it should be able to transfer through trusted forwarder after it is blacklisted', async function () {
        const {
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          TrustedForwarder,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          TrustedForwarder.address,
          true
        );

        const data = await Asset.connect(
          users[0].Asset.signer
        ).populateTransaction[
          'safeTransferFrom(address,address,uint256,uint256,bytes)'
        ](users[0].address, users[1].address, 1, 1, '0x');

        await TrustedForwarder.execute({...data, value: BigNumber.from(0)});

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to transfer through trusted forwarder after if sender is blacklisted', async function () {
        const {Asset, users, TrustedForwarder, mockMarketPlace1} =
          await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        const data = await Asset.connect(
          ethers.provider.getSigner(mockMarketPlace1.address)
        ).populateTransaction[
          'safeTransferFrom(address,address,uint256,uint256,bytes)'
        ](users[0].address, users[1].address, 1, 1, '0x');

        await expect(
          TrustedForwarder.execute({...data, value: BigNumber.from(0)})
        ).to.be.revertedWith('Call execution failed');
      });

      it('it should be able to transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.reverted;
      });

      it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.reverted;

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.transferTokenForERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.reverted;
      });

      it('it should not be able to batch transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);

        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.reverted;
      });

      it('it should be able to batch transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Asset, users} = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        await Asset.mintWithoutMinterRole(users[0].address, 1, 2);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Asset.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.batchTransferTokenERC1155(
          Asset.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });
      it('should be able to batch transfer through trusted forwarder if it is black listed', async function () {
        const {
          Asset,
          users,
          operatorFilterRegistry,
          assetOperatorFilterSubscription,
          TrustedForwarder,
        } = await setupOperatorFilter();
        const TrustedForwarderCodeHash =
          await operatorFilterRegistry.codeHashOf(TrustedForwarder.address);
        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await operatorFilterRegistry.updateCodeHash(
          assetOperatorFilterSubscription.address,
          TrustedForwarderCodeHash,
          true
        );

        await operatorFilterRegistry.updateOperator(
          assetOperatorFilterSubscription.address,
          TrustedForwarder.address,
          true
        );
        const data = await Asset.connect(
          users[0].Asset.signer
        ).populateTransaction[
          'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
        ](users[0].address, users[1].address, [1, 2], [1, 1], '0x');

        await TrustedForwarder.execute({...data, value: BigNumber.from(0)});
        expect(await Asset.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Asset.balanceOf(users[1].address, 2)).to.be.equal(1);
      });
      it('should not be able to batch transfer through trusted forwarder if the sender is black listed', async function () {
        const {Asset, users, TrustedForwarder, mockMarketPlace1} =
          await setupOperatorFilter();

        await Asset.mintWithoutMinterRole(users[0].address, 1, 1);
        await Asset.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Asset.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        const data = await Asset.connect(
          ethers.provider.getSigner(mockMarketPlace1.address)
        ).populateTransaction[
          'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
        ](users[0].address, users[1].address, [1, 2], [1, 1], '0x');

        await expect(
          TrustedForwarder.execute({...data, value: BigNumber.from(0)})
        ).to.be.revertedWith('Call execution failed');
      });
    });
  });
  describe('AssetV2', function () {
    it('successfully upgrades to AssetV2', async function () {
      const {AssetContract} = await runAssetSetup();
      const AssetV2 = await ethers.getContractFactory('AssetV2');
      expect(await upgrades.upgradeProxy(AssetContract.address, AssetV2)).to.not
        .be.reverted;
    });
    it('successfully reinitializes', async function () {
      const {AssetContract} = await runAssetSetup();
      const AssetV2 = await ethers.getContractFactory('AssetV2');
      const AsetV2Contract = await upgrades.upgradeProxy(
        AssetContract.address,
        AssetV2
      );
      expect(await AsetV2Contract.reinitialize()).to.not.be.reverted;
    });
    it('correctly returns the contract owner', async function () {
      const {AssetContract, deployer} = await runAssetSetup();
      const AssetV2 = await ethers.getContractFactory('AssetV2');
      const AssetV2Contract = await upgrades.upgradeProxy(
        AssetContract.address,
        AssetV2
      );
      await AssetV2Contract.reinitialize();
      expect(await AssetV2Contract.owner()).to.be.equals(deployer.address);
    });
    it('allows owner to transfer the ownership', async function () {
      const {AssetContract, assetAdmin} = await runAssetSetup();
      const AssetV2 = await ethers.getContractFactory('AssetV2');
      const AssetV2Contract = await upgrades.upgradeProxy(
        AssetContract.address,
        AssetV2
      );
      await AssetV2Contract.reinitialize();
      await AssetV2Contract.transferOwnership(assetAdmin.address);
      expect(await AssetV2Contract.owner()).to.be.equals(assetAdmin.address);
    });
    it('does not allow non-owner to transfer the ownership', async function () {
      const {AssetContract, assetAdmin} = await runAssetSetup();
      const AssetV2 = await ethers.getContractFactory('AssetV2');
      const AssetV2Contract = await upgrades.upgradeProxy(
        AssetContract.address,
        AssetV2
      );
      await AssetV2Contract.reinitialize();
      await expect(
        AssetV2Contract.connect(assetAdmin).transferOwnership(
          assetAdmin.address
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
