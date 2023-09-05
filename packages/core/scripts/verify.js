const {spawn} = require('child_process');

const args = process.argv.slice(2);
const [network, deploymentName] = args;

(async () => {
  const deployment = require(`../deployments/${network}/${deploymentName}.json`);
  const metadata = JSON.parse(deployment.metadata || '{}');
  const compilationTarget = Object.keys(metadata.settings.compilationTarget)[0];
  const contractName = metadata.settings.compilationTarget[compilationTarget];
  console.log(compilationTarget);
  spawn(
    `npx hardhat verify --network ${network} --contract ${compilationTarget}:${contractName} ${
      deployment.address
    } ${(deployment.args || []).join(' ')}`,
    {
      stdio: 'inherit',
      shell: true,
    }
  ).on('exit', (code) => process.exit(code));
})();
