const {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} = require('hardhat');

module.exports.setupPermit = deployments.createFixture(async () => {
  const {sandAdmin, sandBeneficiary} = await getNamedAccounts();
  const others = await getUnnamedAccounts();
  await deployments.fixture('Permit');

  const sandContract = await ethers.getContract('Sand');
  const permitContract = await ethers.getContract('Permit');

  return {
    permitContract,
    sandContract,
    sandAdmin,
    sandBeneficiary,
    others,
  };
});
