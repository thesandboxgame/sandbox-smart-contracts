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

async function getValues({assetId, originalAssetId, fromBlock, catalystRegistry}) {
  if (!originalAssetId) {
    originalAssetId = assetId;
  }
  const catalystAppliedEvents = await catalystRegistry.queryFilter(
    catalystRegistry.filters.CatalystApplied(), // TODO filter on originalAssetId (did not work, not sure why)?
    fromBlock
  );
  const lastCatalystEvent = catalystAppliedEvents[catalystAppliedEvents.length - 1];

  const events = [];

  const catalystId = lastCatalystEvent.args.catalystId;
  const seed = lastCatalystEvent.args.seed;
  events.push({gemIds: lastCatalystEvent.args.gemIds, blockNumber: lastCatalystEvent.args.blockNumber});

  const gemsAddedEvents = await catalystRegistry.queryFilter(
    catalystRegistry.filters.GemsAdded(assetId),
    lastCatalystEvent.blockNumber
  );

  for (const gemsAddedEvent of gemsAddedEvents) {
    events.push({gemIds: gemsAddedEvent.args.gemIds, blockNumber: gemsAddedEvent.args.blockNumber});
  }

  for (const event of events) {
    const block = await catalystRegistry.provider.getBlock(event.blockNumber.toNumber()); // TODO cache
    event.blockHash = block.hash;
    delete event.blockNumber;
  }
  return catalystRegistry.callStatic.getValues(catalystId, seed, events, 5);
}

module.exports = {
  getGems,
  getValues,
};
