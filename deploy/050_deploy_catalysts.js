const {BigNumber} = require("@ethersproject/bignumber");
const {guard} = require("../lib");

function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;
  const {deployer, catalystMinter} = await getNamedAccounts();

  async function deployCatalyst(
    name,
    {tokenName, tokenSymbol, rarity, maxGems, quantityRange, attributeRange, sandFee}
  ) {
    const catalystToken = await deployIfDifferent(
      ["data"],
      name,
      {from: deployer, gas: 3000000},
      "Catalyst",
      tokenName,
      tokenSymbol,
      deployer,
      catalystMinter, // set to catalystMinter later
      sandFee,
      rarity,
      maxGems,
      quantityRange,
      attributeRange
    );
    if (catalystToken.newlyDeployed) {
      log(` - ${name} deployed at :  ${catalystToken.address} for gas: ${catalystToken.receipt.gasUsed}`);
    } else {
      log(`reusing ${name} at ${catalystToken.address}`);
    }
  }

  await deployCatalyst("CommonCatalyst", {
    tokenName: "Sandbox's Common CATALYST",
    tokenSymbol: "COMMON",
    sandFee: sandWei(1),
    rarity: 0,
    maxGems: 1,
    quantityRange: [200, 1000],
    attributeRange: [1, 25],
  });
  await deployCatalyst("RareCatalyst", {
    tokenName: "Sandbox's Rare CATALYST",
    tokenSymbol: "RARE",
    sandFee: sandWei(4),
    rarity: 1,
    maxGems: 2,
    quantityRange: [50, 200],
    attributeRange: [26, 50],
  });
  await deployCatalyst("EpicCatalyst", {
    tokenName: "Sandbox's Epic CATALYST",
    tokenSymbol: "EPIC",
    sandFee: sandWei(10),
    rarity: 2,
    maxGems: 3,
    quantityRange: [10, 50],
    attributeRange: [51, 75],
  });
  await deployCatalyst("LegendaryCatalyst", {
    tokenName: "Sandbox's Legendary CATALYST",
    tokenSymbol: "LEGENDARY",
    sandFee: sandWei(200),
    rarity: 3,
    maxGems: 4,
    quantityRange: [1, 10],
    attributeRange: [76, 100],
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
