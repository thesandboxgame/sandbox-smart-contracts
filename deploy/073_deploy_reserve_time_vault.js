const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  const sandContract = await deployments.get("Sand"); // TODO should support all tokens unless issue, but at least ETH

  await deploy("ReserveTimeVault", {
    contract: "FeeTimeVault",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [10, sandContract.address, deployer], // TODO lock period
  });
};
module.exports.tags = ["ReserveTimeVault"];
module.exports.skip = guard(["1", "4"], "ReserveTimeVault");
