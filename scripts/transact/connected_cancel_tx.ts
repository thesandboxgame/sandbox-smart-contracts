import {deployments, ethers, getNamedAccounts} from 'hardhat';

const {rawTx} = deployments;

const args = process.argv.slice(2);
const txHash = args[0];

// this script allow to stop pending transaction
void (async () => {
  const {deployer} = await getNamedAccounts();
  console.log('Fetching nonce for account:', deployer);
  let nonce;
  if (txHash) {
    const tx = await ethers.provider.getTransaction(txHash);
    nonce = tx.nonce;
  }
  if (!nonce) {
    nonce = await ethers.provider.getTransactionCount(deployer, 'latest');
  }
  console.log('Nonce:', nonce);
  await rawTx({from: deployer, to: deployer, nonce, log: true});
})();
