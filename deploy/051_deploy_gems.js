const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;
  const {deployer, gemCoreAdmin, gemCoreMinter} = await getNamedAccounts(); // TODO gemCoreAdmin

  const gemCore = await deployIfDifferent(
    ["data"],
    "GemCore",
    {from: deployer, gas: 300000},
    "GemCore",
    deployer,
    deployer
  );
  if (gemCore.newlyDeployed) {
    log(` - GemCore deployed at :  ${gemCore.address} for gas: ${gemCore.receipt.gasUsed}`);
  } else {
    log(`reusing GemCore at ${gemCore.address}`);
  }

  const gemCoreContract = await ethers.getContract("GemCore");
  const currentMinter = await gemCoreContract.callStatic.getMinter();
  const currentAdmin = await gemCoreContract.callStatic.getAdmin();
  const gemCoreContractAsMinter = gemCoreContract.connect(gemCoreContract.provider.getSigner(currentMinter));
  const gemCoreContractAsAdmin = gemCoreContract.connect(gemCoreContract.provider.getSigner(currentAdmin));

  async function deployGem(name, {tokenName, tokenSymbol}) {
    const gemToken = await deployIfDifferent(
      ["data"],
      name,
      {from: deployer, gas: 300000},
      "Gem",
      tokenName,
      tokenSymbol,
      gemCoreAdmin // TODO different admin ?
    );
    if (gemToken.newlyDeployed) {
      log(` - ${name} deployed at :  ${gemToken.address} for gas: ${gemToken.receipt.gasUsed}`);
    } else {
      log(`reusing ${name} at ${gemToken.address}`);
    }
    return gemToken;
  }

  async function deployAndAddGem(name, {tokenName, tokenSymbol}) {
    const gem = await deployGem(name, {tokenName, tokenSymbol});
    await gemCoreContractAsMinter.addSubToken(gem.address).then((tx) => tx.wait());
  }

  await deployAndAddGem("Luck", {
    tokenName: "Sandbox's Luck GEM",
    tokenSymbol: "LUCK",
  });
  // TODO more

  if (currentMinter != gemCoreMinter) {
    await gemCoreContractAsAdmin.setMinter(gemCoreMinter).then((tx) => tx.wait());
  }
  if (currentAdmin != gemCoreAdmin) {
    await gemCoreContractAsAdmin.changeAdmin(gemCoreAdmin).then((tx) => tx.wait());
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
