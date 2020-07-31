const {guard} = require("../lib");
const catalysts = require("../data/catalysts");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get("Sand");

  const catalystGroup = await deploy("Catalyst", {
    contract: "ERC20GroupCatalyst",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      deployer,
    ],
  });
  async function addCatalysts(catalystData) {
    const erc20s = [];
    const data = [];
    for (let i = 0; i < catalystData.length; i++) {
      const catalyst = catalystData[i];
      const contractName = `${catalyst.name}Catalyst`;
      const tokenSymbol = catalyst.symbol;
      const result = await deploy(contractName, {
        contract: "ERC20SubToken",
        from: deployer,
        gas: 3000000,
        log: true,
        args: [catalystGroup.address, i, `Sandbox's ${tokenSymbol} Catalysts`, tokenSymbol],
      });
      erc20s.push(result.address);
      data.push({
        sandMintingFee: catalyst.sandMintingFee,
        sandUpdateFee: catalyst.sandUpdateFee,
        minQuantity: catalyst.quantityRange[0],
        maxQuantity: catalyst.quantityRange[1],
        rarity: catalyst.rarity,
        maxGems: catalyst.maxGems,
      });
    }
    return execute("Catalyst", {from: deployer}, "addCatalysts", erc20s, data, []);
  }
  await addCatalysts(catalysts);
};
module.exports.skip = guard(["1", "4", "314159"], "Catalyst");
