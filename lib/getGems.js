const {findEvents} = require("./findEvents.js");

async function getGems(_receipt, _catalyst, _catalystRegistry) {
  const catalystAppliedEvent = await findEvents(_catalystRegistry, "CatalystApplied", _receipt.blockHash);
  const gemsAddedEvent = await findEvents(_catalystRegistry, "GemsAdded", _receipt.blockHash);
  const catalystId = catalystAppliedEvent[0].args[1];
  const appliedGems = catalystAppliedEvent[0].args[3].length;

  let totalGems;
  if (gemsAddedEvent.length === 0) {
    totalGems = appliedGems;
  } else {
    const addedGems = gemsAddedEvent[0].args[3].length;
    totalGems = appliedGems + addedGems;
  }

  const mintData = await _catalyst.getMintData(catalystId);
  const maxGemsConfigured = mintData[0];
  return {
    totalGems,
    maxGemsConfigured,
  };
}

// TODO :
async function getValues({assetId, originalAssetId, fromBlockHash, catalystRegistry}) {
  if (!originalAssetId) {
    originalAssetId = assetId;
  }
  const catalystAppliedEvents = await catalystRegistry.queryFilter(
    catalystRegistry.filters.CatalystApplied(), // TODO filter on originalAssetId (did not work, not sure why)?
    fromBlockHash
  );
  const lastCatalystEvent = catalystAppliedEvents[catalystAppliedEvents.length - 1];

  const catalystId = lastCatalystEvent.args.catalystId;
  const seed = lastCatalystEvent.args.seed;
  let gemIds = [...lastCatalystEvent.args.gemIds];
  let blockNumbers = gemIds.map(() => lastCatalystEvent.args.blockNumber);

  const gemsAddedEvents = await catalystRegistry.queryFilter(
    catalystRegistry.filters.GemsAdded(assetId),
    lastCatalystEvent.blockNumber
  );

  for (const gemsAddedEvent of gemsAddedEvents) {
    const newGems = [...gemsAddedEvent.args.gemIds];
    const newBlockNumbers = newGems.map(() => gemsAddedEvent.args.blockNumber);
    gemIds = gemIds.concat(newGems);
    blockNumbers = blockNumbers.concat(newBlockNumbers);
  }

  const blockHashes = [];
  for (const blockNumber of blockNumbers) {
    const block = await catalystRegistry.provider.getBlock(blockNumber.toNumber()); // TODO cache
    blockHashes.push(block.hash);
  }
  return catalystRegistry.callStatic.getValues(catalystId, seed, gemIds, blockHashes);
}

module.exports = {
  getGems,
  getValues,
};
