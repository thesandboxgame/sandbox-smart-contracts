const {BigNumber} = require("ethers");
const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, treasury, exchangesAdmin, atariToken} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  // const atariContract = await deployments.get("ATARI"); //TODO
  atariContract = {
    address: atariToken,
  };

  const rate = BigNumber.from(1).mul("1000000000000000000"); // TODO

  await deploy("ATARI_SAND_Exchange", {
    from: deployer,
    contract: "ERC20FixedExchangeForwarder",
    args: [sandContract.address, atariContract.address, rate, treasury, exchangesAdmin],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO, "ATARI_SAND_Exchange");
module.exports.tags = ["ATARI_SAND_Exchange"];
module.exports.dependencies = ["Sand", "ATARI"];
