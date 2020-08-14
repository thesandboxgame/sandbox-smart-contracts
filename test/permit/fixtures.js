const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupPermit = deployments.createFixture(async () => {
  const {deployer, sandAdmin} = await getNamedAccounts();
  await deployments.fixture();

  const sandAsAdmin = await ethers.getContract("Sand", sandAdmin);
  const permitContract = await ethers.getContract("Permit");

  await sandAsAdmin.setSuperOperator(permitContract.address, true);

  return {
    permitContract,
  };
});
