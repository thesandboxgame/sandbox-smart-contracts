const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupPermit = deployments.createFixture(async () => {
  const {sandAdmin, others} = await getNamedAccounts();
  await deployments.fixture();

  const sandAsAdmin = await ethers.getContract("Sand", sandAdmin);
  const sandContract = await ethers.getContract("Sand");
  const permitContract = await ethers.getContract("Permit");

  await sandAsAdmin.setSuperOperator(permitContract.address, true);

  return {
    permitContract,
    sandContract,
    others,
  };
});
