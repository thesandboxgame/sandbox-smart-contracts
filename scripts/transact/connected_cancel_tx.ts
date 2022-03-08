import {getNamedAccounts, ethers, deployments} from 'hardhat';

const {rawTx} = deployments;

const args = process.argv.slice(2);
const txHash = args[0];

// this script allow to stop pending transaction
(async () => {
  const {deployer} = await getNamedAccounts();
  console.log('Fetching nonce for account:', deployer);
  if (txHash) {
    const tx = await ethers.provider.getTransaction(txHash);
    console.log(tx);
  }
  const nonce = await ethers.provider.getTransactionCount(deployer, 'latest');
  console.log('Nonce:', nonce);
  await rawTx({from: deployer, to: deployer, nonce});
})();
