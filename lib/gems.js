async function getMintEventGems(_receipt, _catalyst, _catalystRegistry) {
  const catalystAppliedEvent = await findEvents(_catalystRegistry, "CatalystApplied", _receipt.blockHash);
  const catalystId = catalystAppliedEvent[0].args[1];
  const gems = catalystAppliedEvent[0].args[3].length;
  const mintData = await _catalyst.getMintData(catalystId);
  const maxGemsConfigured = mintData[0];
  return {
    gems,
    maxGemsConfigured,
  };
}

module.exports = getMintEventGems;
