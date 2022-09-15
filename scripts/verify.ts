/**
 * Verify a single contract running: yarn execute <network> ./scripts/verify.ts <contract>
 */
import hre from 'hardhat';

const args = process.argv.slice(2);
const contractName = args[0];

void (async () => {
  const deployment = await hre.deployments.get(contractName);
  console.log('Verifying contract:', contractName);
  console.log('Address:', deployment.address);
  console.log('Args:', deployment.args);
  await hre.run('verify:verify', {
    address: deployment.address,
    constructorArguments: deployment.args,
  });
})();
