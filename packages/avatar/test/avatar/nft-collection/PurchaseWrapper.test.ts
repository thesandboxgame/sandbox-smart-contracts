import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe.only('PurchaseWrapper', function () {
  async function setupPurchaseWrapperFixture() {
    // Get the NFT collection fixture first
    const nftCollectionFixture = await setupNFTCollectionContract();
    const {collectionContract} = nftCollectionFixture;

    // Deploy PurchaseWrapper
    const PurchaseWrapperFactory = await ethers.getContractFactory(
      'PurchaseWrapper'
    );
    const sandContractAddress =
      await nftCollectionFixture.sandContract.getAddress();

    const purchaseWrapper = await PurchaseWrapperFactory.connect(
      nftCollectionFixture.deployer
    ).deploy(sandContractAddress);

    return {
      ...nftCollectionFixture,
      purchaseWrapper,
      purchaseWrapperAsRandomWallet: purchaseWrapper.connect(
        nftCollectionFixture.randomWallet
      ),
      purchaseWrapperAsRandomWallet2: purchaseWrapper.connect(
        nftCollectionFixture.randomWallet2
      ),
    };
  }

  describe('confirmPurchase', function () {
    it('should allow user A to purchase and deliver NFT to user B', async function () {
      const {
        collectionContractAsOwner: contract,
        waveMintSign,
        sandContract,
        randomWallet: userA,
        randomWallet2: userB,
        purchaseWrapper,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
      } = await loadFixture(setupPurchaseWrapperFixture);

      // Set up a wave for minting
      const tokenAmount = 1;
      const unitPrice = 100;
      const totalPrice = unitPrice * tokenAmount;
      const waveIndex = 0;
      const signatureId = 222;

      // Set up the wave in the NFT Collection contract
      await contract.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        unitPrice
      );

      console.log('sandContract TST', await sandContract.getAddress());

      // Give userA some SAND tokens to pay for the purchase
      await sandContract.donateTo(userA, totalPrice);
      expect(await sandContract.balanceOf(userA)).to.be.eq(totalPrice);

      // Generate signature for minting
      const purchaseWrapperAddress = await purchaseWrapper.getAddress();
      const signature = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId
      );

      // Prepare the data for calling confirmPurchase on PurchaseWrapper
      const confirmPurchaseData = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          await userA.getAddress(),
          await contract.getAddress(),
          totalPrice,
          await userB.getAddress(),
          waveIndex,
          tokenAmount,
          signatureId,
          signature,
        ]
      );

      // UserA calls approveAndCall on sandContract to initiate the purchase
      await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapper, totalPrice, confirmPurchaseData);

      // Verify userB received the NFT
      const transferFilter = contract.filters.Transfer(
        undefined,
        await userB.getAddress()
      );
      const transferEvents = await contract.queryFilter(transferFilter);
      expect(transferEvents.length).to.be.gt(
        0,
        'No transfer events found to User B'
      );

      const mintedTokenId =
        transferEvents[transferEvents.length - 1].args.tokenId;

      // Check ownership of the token
      expect(await contract.ownerOf(mintedTokenId)).to.be.eq(
        await userB.getAddress()
      );

      // Verify token counts
      expect(await contract.waveTotalMinted(waveIndex)).to.be.eq(tokenAmount);
      expect(await contract.totalSupply()).to.be.eq(tokenAmount);
    });
  });
});
