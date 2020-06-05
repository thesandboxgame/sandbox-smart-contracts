const {deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {execute} = deployments;

const args = process.argv.slice(2);
(async () => {
  const {deployer, landAdmin} = await getNamedAccounts();
  await execute("Land", {from: landAdmin}, "setMinter", deployer, true);
  await execute("Land", {from: deployer}, "mintQuad", args[0], args[1], args[2], args[3], "0x");
})();
