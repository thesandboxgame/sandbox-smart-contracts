const {BigNumber} = require("@ethersproject/bignumber");
const {guard} = require("../lib");

function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

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
  await addCatalysts([
    {
      name: "Common",
      symbol: "COMMON",
      sandFee: sandWei(1),
      rarity: 0,
      maxGems: 1,
      quantityRange: [200, 1000],
      attributeRange: [1, 25],
    },
    {
      name: "Rare",
      symbol: "RARE",
      sandFee: sandWei(4),
      rarity: 1,
      maxGems: 2,
      quantityRange: [50, 200],
      attributeRange: [26, 50],
    },
    {
      name: "Epic",
      symbol: "EPIC",
      sandFee: sandWei(10),
      rarity: 2,
      maxGems: 3,
      quantityRange: [10, 50],
      attributeRange: [51, 75],
    },
    {
      name: "Legendary",
      symbol: "LEGENDARY",
      sandFee: sandWei(200),
      rarity: 3,
      maxGems: 4,
      quantityRange: [1, 10],
      attributeRange: [76, 100],
    },
  ]);
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
