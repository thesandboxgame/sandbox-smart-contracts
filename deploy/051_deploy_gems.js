const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;
  const {deployer, gemCoreMinter} = await getNamedAccounts();

  const gemCore = await deployIfDifferent(
    ["data"],
    "GemCore",
    {from: deployer, gas: 3000000},
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
      {from: deployer, gas: 2000000},
      "Gem",
      tokenName,
      tokenSymbol,
      deployer // gemCoreAdmin is set later
    );
    if (gemToken.newlyDeployed) {
      log(` - ${name} deployed at :  ${gemToken.address} for gas: ${gemToken.receipt.gasUsed}`);
    } else {
      log(`reusing ${name} at ${gemToken.address}`);
    }
    return gemToken;
  }

  async function deployAndAddGem(name, {tokenName, tokenSymbol}) {
    const gem = await deployGem(`${name}Gem`, {tokenName, tokenSymbol});
    await gemCoreContractAsMinter.addSubToken(gem.address).then((tx) => tx.wait());
  }

  const gems = ["Power", "Defense", "Speed", "Magic", "Luck"];
  for (const gem of gems) {
    await deployAndAddGem(gem, {
      tokenName: `Sandbox's ${gem} GEM`,
      tokenSymbol: gem.toUpperCase(),
    });
  }

  if (currentMinter.toLowerCase() != gemCoreMinter.toLowerCase()) {
    await gemCoreContractAsAdmin.setMinter(gemCoreMinter).then((tx) => tx.wait());
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
