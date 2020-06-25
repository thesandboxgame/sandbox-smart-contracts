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

module.exports = {
  getGems,
};
