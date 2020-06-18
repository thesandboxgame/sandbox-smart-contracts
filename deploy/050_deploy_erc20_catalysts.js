const {guard} = require("../lib");
const catalysts = require("../data/catalysts");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, deploy} = deployments;
  const {deployer, catalystMinter} = await getNamedAccounts();

  const sand = await deployments.get("Sand");

  const catalystGroup = await deploy("Catalyst", {
    contractName: "ERC20GroupCatalyst",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      catalystMinter,
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
        contractName: "ERC20SubToken",
        from: deployer,
        gas: 3000000,
        log: true,
        args: [catalystGroup.address, i, catalyst.name, tokenSymbol],
      });
      erc20s.push(result.address);
      data.push({
        sandFee: catalyst.sandFee,
        minQuantity: catalyst.quantityRange[0],
        maxQuantity: catalyst.quantityRange[1],
        minValue: catalyst.attributeRange[0],
        maxValue: catalyst.attributeRange[1],
        rarity: catalyst.rarity,
        maxGems: catalyst.maxGems,
      });
    }
    return execute("Catalyst", {from: deployer}, "addCatalysts", erc20s, data);
  }
  await addCatalysts(catalysts);
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
