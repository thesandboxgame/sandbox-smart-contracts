const {starterPackGems} = require("../data/starterPackv1");
module.exports = async ({deployments, getNamedAccounts}) => {
  const {execute} = deployments;
  const {gemMinter} = await getNamedAccounts();

  const starterPack = await deployments.get("StarterPackV1");

  await execute(
    "Gem",
    {from: gemMinter, skipUnknownSigner: true},
    "batchMint",
    starterPack.address,
    starterPackGems.ids,
    starterPackGems.quantities
  );
};
module.exports.skip = () => true;
