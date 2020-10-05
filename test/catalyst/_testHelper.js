const {assert, expect} = require("local-chai");
const {BigNumber} = require("@ethersproject/bignumber");
const {keccak256} = require("@ethersproject/solidity");
const {ethers} = require("@nomiclabs/buidler");

function getValue(_minValue, _maxValue, gemId, assetId, blockHash, slotIndex) {
  const seed = BigNumber.from(keccak256(["uint256"], [assetId])).mod(BigNumber.from(2).pow(96));
  const range = _maxValue - _minValue;
  // console.log({
  //   gemId,
  //   seed: seed.toHexString(),
  //   blockHash,
  //   slotIndex,
  // });
  return (
    _minValue +
    BigNumber.from(keccak256(["uint32", "uint96", "bytes32", "uint256"], [gemId, seed, blockHash, slotIndex]))
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
    const expectedValue = getValue(range[0], range[1], expectedGemId, originalTokenId || tokenId, blockHash, i);
    assert.equal(attributes[i].gemId, expectedGemId);
    assert.equal(attributes[i].value, expectedValue);
  }
}

function expectGemValues(values, expectedValues, options) {
  options = options || {};
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (expectedValues[i]) {
      if (Array.isArray(expectedValues[i])) {
        expect(v).to.be.within(expectedValues[i][0], expectedValues[i][1]);
      } else {
        expect(v).to.equal(expectedValues[i]);
      }
    } else {
      if (v !== 0) {
        console.log({values, expectedValues});
      }
      expect(v, `gemId ${i} not expected`).to.equal(0);
    }
  }
  if (!options.ignoreMissing) {
    for (const key of Object.keys(expectedValues)) {
      if (parseInt(key) >= values.length) {
        throw new Error(`no value for gemId ${key}`);
      }
    }
  }
}

module.exports = {
  expectGemValues,
  assertValidAttributes,
};
