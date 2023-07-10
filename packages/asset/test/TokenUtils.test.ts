import {expect} from 'chai';
import {runTokenIdUtilsSetup} from './fixtures/tokenIdUtilsFixture';
import {ethers} from 'hardhat';

describe.only('TokenIdUtils (/packages/asset/contracts/libraries/TokenIdUtils.ts)', async () => {
  it('should generate a token id', async () => {
    const {generateTokenId} = await runTokenIdUtilsSetup();
    const tokenId = await generateTokenId();
    expect(tokenId).to.not.be.undefined;
    expect(tokenId.toHexString()).to.have.lengthOf(46);
  });
  describe("Creator's address", () => {
    it('should generate a token id with correct creator - manual extraction', async () => {
      const {generateTokenId, address} = await runTokenIdUtilsSetup();
      const tokenId = await generateTokenId();
      const creatorAddressBigNumber = tokenId.and(
        ethers.constants.MaxUint256.shr(96) // Create a mask for the last 160 bits
      );
      const creatorAddressPaddedHex = creatorAddressBigNumber.toHexString();
      const creatorAddressHex = creatorAddressPaddedHex;
      const creator = ethers.utils.getAddress(creatorAddressHex);
      expect(creator).equal(address);
    });
    it('should generate a token id with correct creator - using getter function', async () => {
      const {tokenIdUtils, generateTokenId, address} =
        await runTokenIdUtilsSetup();
      const tokenId = await generateTokenId();
      const tokenIdAddress = await tokenIdUtils.getCreatorAddress(tokenId);
      expect(tokenIdAddress).equal(address);
    });
  });
  describe('Tier', () => {
    it('should generate a token id with correct tier - using getter function', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const tier = 6;
      const tokenId = await generateTokenId(undefined, tier);
      const returnedTier = await tokenIdUtils.getTier(tokenId);
      expect(returnedTier).equal(tier);
    });
    it('should generate a token id with correct tier - manual extraction', async () => {
      const {generateTokenId, TIER_SHIFT, TIER_MASK} =
        await runTokenIdUtilsSetup();
      const tier = 6;
      const tokenId = await generateTokenId(undefined, tier);
      const returnedTier = tokenId.shr(TIER_SHIFT).and(TIER_MASK).toNumber();
      expect(returnedTier).equal(tier);
    });
  });
  describe('Creator nonce', () => {
    it('should generate a token id with correct creator nonce - using getter function', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const creatorNonce = 120;
      const tokenId = await generateTokenId(undefined, undefined, creatorNonce);
      const returnedNonce = await tokenIdUtils.getCreatorNonce(tokenId);
      expect(returnedNonce).equal(creatorNonce);
    });

    it('should generate a token id with correct creator nonce - manual extraction', async () => {
      const {generateTokenId, NONCE_SHIFT, NONCE_MASK} =
        await runTokenIdUtilsSetup();
      const creatorNonce = 120;
      const tokenId = await generateTokenId(undefined, undefined, creatorNonce);
      const returnedNonce = tokenId.shr(NONCE_SHIFT).and(NONCE_MASK).toNumber();
      expect(returnedNonce).equal(creatorNonce);
    });
  });
  describe('Reveal nonce', () => {
    it('should generate a token id with correct reveal nonce - using getter function', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const revealNonce = 777;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        revealNonce
      );
      const returnedRevealNonce = await tokenIdUtils.getRevealNonce(tokenId);
      expect(returnedRevealNonce).equal(revealNonce);
    });

    it('should generate a token id with correct reveal nonce - manual extraction', async () => {
      const {generateTokenId, REVEAL_NONCE_SHIFT, REVEAL_NONCE_MASK} =
        await runTokenIdUtilsSetup();
      const revealNonce = 777;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        revealNonce
      );
      const returnedRevealNonce = tokenId
        .shr(REVEAL_NONCE_SHIFT)
        .and(REVEAL_NONCE_MASK)
        .toNumber();
      expect(returnedRevealNonce).equal(revealNonce);
    });
    it('should return true if reveal nonce is non-zero', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const revealNonce = 777;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        revealNonce
      );
      const returnedRevealNonce = await tokenIdUtils.isRevealed(tokenId);
      expect(returnedRevealNonce).equal(true);
    });
    it('should return false if reveal nonce is zero', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const revealNonce = 0;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        revealNonce
      );
      const returnedRevealNonce = await tokenIdUtils.isRevealed(tokenId);
      expect(returnedRevealNonce).equal(false);
    });
  });

  describe('Bridged flag', () => {
    it('should generate a token id with correct bridged flag - using getter function', async () => {
      const {tokenIdUtils, generateTokenId} = await runTokenIdUtilsSetup();
      const bridged = true;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        undefined,
        bridged
      );
      const returnedBridged = await tokenIdUtils.isBridged(tokenId);
      expect(returnedBridged).equal(bridged);
    });

    it('should generate a token id with correct bridged flag - manual extraction', async () => {
      const {generateTokenId, BRIDGED_SHIFT, BRIDGED_MASK} =
        await runTokenIdUtilsSetup();
      const bridged = true;
      const tokenId = await generateTokenId(
        undefined,
        undefined,
        undefined,
        undefined,
        bridged
      );
      const returnedBridged =
        tokenId.shr(BRIDGED_SHIFT).and(BRIDGED_MASK).toNumber() === 1;
      expect(returnedBridged).equal(bridged);
    });
  });
  describe('Asset Data', () => {
    it('should return correct asset data', async () => {
      const {tokenIdUtils, generateTokenId, address} =
        await runTokenIdUtilsSetup();
      const creator = address;
      const tier = 6;
      const creatorNonce = 120;
      const revealNonce = 777;
      const bridged = true;
      const tokenId = await generateTokenId(
        creator,
        tier,
        creatorNonce,
        revealNonce,
        bridged
      );
      const returnedAssetData = await tokenIdUtils.getData(tokenId);
      expect(ethers.utils.getAddress(returnedAssetData.creator)).equal(creator);
      expect(returnedAssetData.tier).equal(tier);
      expect(returnedAssetData.creatorNonce).equal(creatorNonce);
      expect(returnedAssetData.revealed).equal(true);
      expect(returnedAssetData.bridged).equal(bridged);
    });
  });
});
