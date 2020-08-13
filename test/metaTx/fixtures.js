const {deployments} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async (bre) => {
  await deployments.fixture("MetaTxWrapper");
  const MetaTxWrapperContract = await bre.ethers.getContract("MetaTxWrapper");
  return {
    MetaTxWrapperContract,
  };
});
