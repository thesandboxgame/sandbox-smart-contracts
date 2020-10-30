const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  const sandContract = await deployments.get("Sand"); // TODO should support all tokens unless issue, but at least ETH

  const twelveMonths = 12 * 30 * 24 * 60 * 60;
  await deploy("TreasuryTimeVault", {
    contract: "FeeTimeVault",
    from: deployer,
    gas: 3000000,
    log: true,
    args: [twelveMonths, sandContract.address, deployer], // TODO lock period
  });
};
module.exports.tags = ["TreasuryTimeVault"];
module.exports.skip = guard(["1", "4"]); // TODO, "TreasuryTimeVault");
