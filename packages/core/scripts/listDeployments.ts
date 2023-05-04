import hre from 'hardhat';

void (async () => {
  const deploys = await hre.deployments.all();
  console.log(Object.keys(deploys));
})();
