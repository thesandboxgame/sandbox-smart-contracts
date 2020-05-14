const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  return; // TODO
  const {deployIfDifferent, log} = deployments;
  const {deployer, gemCoreAdmin} = await getNamedAccounts(); // TODO gemCoreAdmin

  const gemCore = await deployIfDifferent(["data"], "GemCore", {from: deployer, gas: 300000}, "ERC20Group");
  if (gemCore.newlyDeployed) {
    log(` - GemCore deployed at :  ${gemCore.address} for gas: ${gemCore.receipt.gasUsed}`);
  } else {
    log(`reusing GemCore at ${gemCore.address}`);
  }

  async function deployGem(name, {tokenName, tokenSymbol}) {
    const gemToken = await deployIfDifferent(
      ["data"],
      name,
      {from: deployer, gas: 300000},
      "Gem",
      tokenName,
      tokenSymbol
    );
    if (gemToken.newlyDeployed) {
      log(` - ${name} deployed at :  ${gemToken.address} for gas: ${gemToken.receipt.gasUsed}`);
    } else {
      log(`reusing ${name} at ${gemToken.address}`);
    }
  }

  await deployGem("Luck", {
    tokenName: "Sandbox's Luck GEM",
    tokenSymbol: "LUCK",
  });
  // TODO more
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
