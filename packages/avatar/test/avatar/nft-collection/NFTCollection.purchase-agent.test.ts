import {SignerWithAddress} from '@nomicfoundation/hardhat-ethers/signers';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

type NFTCollectionFixture = {
  collectionContract: any;
  collectionContractAsOwner: any;
  collectionContractAsRandomWallet: any;
  randomWallet: SignerWithAddress;
  randomWallet2: SignerWithAddress;
  collectionOwner: SignerWithAddress;
  deployer: SignerWithAddress;
  mint: (amount: number, wallet?: SignerWithAddress) => Promise<any[]>;
};

describe.only('NFTCollection purchaseAgent', function () {
  let fixtures: NFTCollectionFixture;

  beforeEach(async function () {
    fixtures = (await loadFixture(
      setupNFTCollectionContract
    )) as NFTCollectionFixture;
  });

  describe('Configuration', function () {
    it('should allow the owner to set the purchase agent', async function () {
      const {collectionContractAsOwner, randomWallet, collectionOwner} =
        fixtures;
      await expect(
        collectionContractAsOwner.setPurchaseAgent(randomWallet.address)
      )
        .to.emit(collectionContractAsOwner, 'PurchaseAgentSet')
        .withArgs(collectionOwner.address, randomWallet.address);

      expect(await collectionContractAsOwner.purchaseAgent()).to.equal(
        randomWallet.address
      );
    });

    it('should not allow a non-owner to set the purchase agent', async function () {
      const {collectionContractAsRandomWallet, randomWallet, randomWallet2} =
        fixtures;
      await expect(
        collectionContractAsRandomWallet.setPurchaseAgent(randomWallet2.address)
      )
        .to.be.revertedWithCustomError(
          collectionContractAsRandomWallet,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(randomWallet.address);
    });

    it('should allow the owner to set wallets as agent-controlled', async function () {
      const {collectionContractAsOwner, randomWallet, randomWallet2} = fixtures;
      const wallets = [randomWallet.address, randomWallet2.address];
      const flags = [true, false];
      const tx = await collectionContractAsOwner.setBatchAgentControlled(
        wallets,
        flags
      );

      await expect(tx)
        .to.emit(collectionContractAsOwner, 'AgentControlledSet')
        .withArgs(fixtures.collectionOwner.address, wallets[0], flags[0]);

      await expect(tx)
        .to.emit(collectionContractAsOwner, 'AgentControlledSet')
        .withArgs(fixtures.collectionOwner.address, wallets[1], flags[1]);

      expect(await collectionContractAsOwner.isAgentControlled(wallets[0])).to
        .be.true;
      expect(await collectionContractAsOwner.isAgentControlled(wallets[1])).to
        .be.false;
    });

    it('should not allow a non-owner to set wallets as agent-controlled', async function () {
      const {collectionContractAsRandomWallet, randomWallet} = fixtures;
      const wallets = [randomWallet.address];
      const flags = [true];
      await expect(
        collectionContractAsRandomWallet.setBatchAgentControlled(wallets, flags)
      )
        .to.be.revertedWithCustomError(
          collectionContractAsRandomWallet,
          'OwnableUnauthorizedAccount'
        )
        .withArgs(randomWallet.address);
    });

    it('should revert when setting agent-controlled with mismatched array lengths', async function () {
      const {collectionContractAsOwner, randomWallet} = fixtures;
      const wallets = [randomWallet.address];
      const flags = [true, false]; // Mismatched length
      await expect(
        collectionContractAsOwner.setBatchAgentControlled(wallets, flags)
      ).to.be.revertedWithCustomError(
        collectionContractAsOwner,
        'InvalidBatchData'
      );
    });
  });

  describe('Transfer Logic', function () {
    let purchaseAgent: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let tokenId: any;

    beforeEach(async function () {
      const {
        collectionContractAsOwner,
        randomWallet, // will be token owner
        randomWallet2, // will be purchase agent
        mint,
      } = fixtures;

      tokenOwner = randomWallet;
      purchaseAgent = randomWallet2;

      // Set the purchase agent
      await collectionContractAsOwner.setPurchaseAgent(purchaseAgent.address);

      // Mint a token for the tokenOwner
      const tokenIds = await mint(1, tokenOwner);
      tokenId = tokenIds[0];
    });

    it('should allow purchase agent to transfer from an agent-controlled wallet', async function () {
      const {collectionContractAsOwner, collectionContract, deployer} =
        fixtures;

      // Mark the token owner's wallet as agent-controlled
      await collectionContractAsOwner.setBatchAgentControlled(
        [tokenOwner.address],
        [true]
      );

      const contractAsPurchaseAgent = collectionContract.connect(purchaseAgent);

      await expect(
        contractAsPurchaseAgent.safeTransferFrom(
          tokenOwner.address,
          deployer.address,
          tokenId
        )
      ).to.not.be.reverted;

      expect(await collectionContract.ownerOf(tokenId)).to.equal(
        deployer.address
      );
    });

    it('should NOT allow purchase agent to transfer from a non-agent-controlled wallet', async function () {
      const {collectionContract, deployer} = fixtures;

      // Ensure the wallet is NOT agent-controlled
      const {collectionContractAsOwner} = fixtures;
      await collectionContractAsOwner.setBatchAgentControlled(
        [tokenOwner.address],
        [false]
      );

      const contractAsPurchaseAgent = collectionContract.connect(purchaseAgent);

      await expect(
        contractAsPurchaseAgent.transferFrom(
          tokenOwner.address,
          deployer.address,
          tokenId
        )
      )
        .to.be.revertedWithCustomError(
          collectionContract,
          'ERC721InsufficientApproval'
        )
        .withArgs(purchaseAgent.address, tokenId);
    });

    it('should NOT allow a random address to transfer from an agent-controlled wallet', async function () {
      const {collectionContractAsOwner, collectionContract, deployer} =
        fixtures;

      // Mark the token owner's wallet as agent-controlled
      await collectionContractAsOwner.setBatchAgentControlled(
        [tokenOwner.address],
        [true]
      );

      const contractAsRandomAddress = collectionContract.connect(deployer);

      await expect(
        contractAsRandomAddress.transferFrom(
          tokenOwner.address,
          deployer.address,
          tokenId
        )
      )
        .to.be.revertedWithCustomError(
          collectionContract,
          'ERC721InsufficientApproval'
        )
        .withArgs(deployer.address, tokenId);
    });

    it('should still allow the token owner to transfer their own token', async function () {
      const {collectionContractAsOwner, collectionContract, deployer} =
        fixtures;

      // Mark the token owner's wallet as agent-controlled
      await collectionContractAsOwner.setBatchAgentControlled(
        [tokenOwner.address],
        [true]
      );

      const contractAsTokenOwner = collectionContract.connect(tokenOwner);

      await expect(
        contractAsTokenOwner.transferFrom(
          tokenOwner.address,
          deployer.address,
          tokenId
        )
      ).to.not.be.reverted;

      expect(await collectionContract.ownerOf(tokenId)).to.equal(
        deployer.address
      );
    });

    it('should still allow an approved operator to transfer the token', async function () {
      const {
        collectionContractAsOwner,
        collectionContract,
        deployer, // receiver
        randomWallet2, // operator
      } = fixtures;

      const operator = randomWallet2;

      // Mark the token owner's wallet as agent-controlled
      await collectionContractAsOwner.setBatchAgentControlled(
        [tokenOwner.address],
        [true]
      );

      const contractAsTokenOwner = collectionContract.connect(tokenOwner);
      await contractAsTokenOwner.setApprovalForAll(operator.address, true);

      const contractAsOperator = collectionContract.connect(operator);

      await expect(
        contractAsOperator.transferFrom(
          tokenOwner.address,
          deployer.address,
          tokenId
        )
      ).to.not.be.reverted;

      expect(await collectionContract.ownerOf(tokenId)).to.equal(
        deployer.address
      );
    });
  });
});
