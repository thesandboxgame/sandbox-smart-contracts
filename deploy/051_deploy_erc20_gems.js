const {BigNumber} = require("@ethersproject/bignumber");
const {guard} = require("../lib");
const gemNames = require("../data/gems");

function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute, deploy} = deployments;
  const {deployer, gemMinter} = await getNamedAccounts();

  const sand = await deployments.get("Sand");

  const gemGroup = await deploy("Gem", {
    contractName: "ERC20GroupGem",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      gemMinter,
    ],
  });
  async function addGems(names) {
    const gems = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const contractName = `${name}Gem`;
      const tokenSymbol = name.toUpperCase();
      const result = await deploy(contractName, {
        contractName: "ERC20SubToken",
        from: deployer,
        gas: 3000000,
        log: true,
        args: [gemGroup.address, i, name, tokenSymbol],
      });
      gems.push(result.address);
    }
    return execute("Gem", {from: deployer}, "addGems", gems);
  }
  await addGems(gemNames);
};
module.exports.skip = guard(["1", "4", "314159"], "Gem"); // TODO
