const {assert} = require("local-chai");
const {BigNumber} = require("@ethersproject/bignumber");
const {keccak256} = require("@ethersproject/solidity");
const {ethers} = require("@nomiclabs/buidler");

function getValue(_minValue, _maxValue, assetTokenId, gemId, slotIndex, blockHash) {
  const range = _maxValue - _minValue;
  return (
    _minValue +
    BigNumber.from(keccak256(["bytes32", "uint256", "uint32", "uint256"], [blockHash, assetTokenId, gemId, slotIndex]))
      .mod(range)
      .toNumber()
  );
}

async function assertValidAttributes({catalystRegistry, tokenId, originalTokenId, gemIds, range}) {
  const blockNumbers = await catalystRegistry.getGemBlockNumbers(tokenId);
  const blocks = await Promise.all(blockNumbers.map((b) => ethers.provider.getBlock(b.toNumber())));
  const blockHashes = blocks.map((b) => b.hash);
  const attributes = await catalystRegistry.getAttributes(tokenId, blockHashes);

  for (let i = 0; i < gemIds.length; i++) {
    const expectedGemId = gemIds[i];
    const blockHash = blockHashes[i];
    const expectedValue = getValue(range[0], range[1], originalTokenId || tokenId, expectedGemId, i, blockHash);
    assert.equal(attributes[i].gemId, expectedGemId);
    assert.equal(attributes[i].value, expectedValue);
  }
}

module.exports = {
  assertValidAttributes,
};
