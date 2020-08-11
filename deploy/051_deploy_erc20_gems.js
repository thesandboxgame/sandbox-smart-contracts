const {guard} = require("../lib");
const gemNames = require("../data/gems");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get("Sand");

  const gemGroup = await deploy("Gem", {
    contract: "ERC20GroupGem",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      deployer,
    ],
  });
  async function addGems(names) {
    const gems = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const contractName = `${name}Gem`;
      const tokenSymbol = name.toUpperCase();
      const result = await deploy(contractName, {
        contract: "ERC20SubToken",
        from: deployer,
        gas: 3000000,
        log: true,
        args: [gemGroup.address, i, `Sandbox's ${tokenSymbol} Gems`, tokenSymbol],
      });
      gems.push(result.address);
    }
    return execute("Gem", {from: deployer}, "addGems", gems);
  }
  await addGems(gemNames);
};
module.exports.skip = guard(["1", "4", "314159"], "Gem");
module.exports.tags = ["Gem"];
module.exports.dependencies = ["Sand"];
