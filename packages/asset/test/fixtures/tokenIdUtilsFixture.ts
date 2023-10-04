import {ethers} from 'hardhat';

export async function runTokenIdUtilsSetup() {
  const TokenIdUtils = await ethers.getContractFactory('TokenIdUtilsWrapped');
  const tokenIdUtils = await TokenIdUtils.deploy();
  await tokenIdUtils.deployed();
  const [minter] = await ethers.getSigners();

  const generateTokenId = async (
    creator = minter.address,
    tier = 1,
    creatorNonce = 1,
    revealNonce = 0,
    bridged = false
  ) => {
    const tokenId = await tokenIdUtils.generateTokenId(
      creator,
      tier,
      creatorNonce,
      revealNonce,
      bridged
    );
    return tokenId;
  };

  const TIER_MASK = await tokenIdUtils.TIER_MASK();
  const TIER_SHIFT = (await tokenIdUtils.TIER_SHIFT()).toNumber();
  const NONCE_MASK = await tokenIdUtils.NONCE_MASK();
  const NONCE_SHIFT = (await tokenIdUtils.NONCE_SHIFT()).toNumber();
  const REVEAL_NONCE_MASK = await tokenIdUtils.REVEAL_NONCE_MASK();
  const REVEAL_NONCE_SHIFT = (
    await tokenIdUtils.REVEAL_NONCE_SHIFT()
  ).toNumber();
  const BRIDGED_MASK = await tokenIdUtils.BRIDGED_MASK();
  const BRIDGED_SHIFT = (await tokenIdUtils.BRIDGED_SHIFT()).toNumber();

  return {
    TIER_MASK,
    TIER_SHIFT,
    NONCE_MASK,
    NONCE_SHIFT,
    REVEAL_NONCE_MASK,
    REVEAL_NONCE_SHIFT,
    BRIDGED_MASK,
    BRIDGED_SHIFT,
    address: minter.address,
    tokenIdUtils,
    generateTokenId,
  };
}
