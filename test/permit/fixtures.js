const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupPermit = deployments.createFixture(async () => {
  const {sandAdmin, sandBeneficiary, others} = await getNamedAccounts();
  await deployments.fixture();

  const sandContract = await ethers.getContract("Sand");
  const permitContract = await ethers.getContract("Permit");

  return {
    permitContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    others,
  };
});
