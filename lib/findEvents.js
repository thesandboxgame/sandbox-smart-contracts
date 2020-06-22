async function findEvents(contract, event, blockHash) {
  const filter = contract.filters[event]();
  const events = await contract.queryFilter(filter, blockHash);
  return events;
}

module.exports = {
  findEvents,
};
