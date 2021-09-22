import hre from 'hardhat';

exports.mochaGlobalSetup = async function () {
  console.log('Mocha taking initial snapshot');
  await hre.deployments.fixture([], {
    fallbackToGlobal: false,
    keepExistingDeployments: true,
  });
};
