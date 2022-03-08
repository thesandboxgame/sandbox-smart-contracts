import hre from 'hardhat';
(async () => {
  const deploys = await hre.deployments.all();
  console.log(Object.keys(deploys));
})();
