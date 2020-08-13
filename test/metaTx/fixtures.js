const {deployments} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async (bre) => {
  console.log(`fixture 1: ${Date.now()}`);
  await deployments.fixture();
  console.log(`fixture 2: ${Date.now()}`);
  const MetaTxWrapperContract = await bre.ethers.getContract("MetaTxWrapper");
  console.log(`fixture 3: ${Date.now()}`);
  return {
    MetaTxWrapperContract,
  };
});
