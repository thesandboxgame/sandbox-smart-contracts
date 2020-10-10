const {guard} = require("../lib");
const {starterPackCatalysts} = require("../data/starterPackv1");
module.exports = async ({deployments, getNamedAccounts}) => {
  const {execute} = deployments;
  const {catalystMinter} = await getNamedAccounts();

  const starterPack = await deployments.get("StarterPackV1");

  await execute(
    "Catalyst",
    {from: catalystMinter},
    "batchMint",
    starterPack.address,
    starterPackCatalysts.ids,
    starterPackCatalysts.quantities
  );
  return true;
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
