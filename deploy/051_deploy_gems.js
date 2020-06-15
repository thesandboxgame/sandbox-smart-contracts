const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments, ethers}) => {
  const {deploy} = deployments;
  const {deployer, gemAdmin, gemMinter} = await getNamedAccounts();

  const sand = await deployments.get("Sand");
  await deploy("Gem", {
    contractName: "ERC1155Gem",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [sand.address, gemAdmin, gemMinter, ["Power", "Defense", "Speed", "Magic", "Luck"]],
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
