import {getNamedAccounts, ethers, deployments} from 'hardhat';

const {rawTx} = deployments;

// this script allow to stop pending transaction
(async () => {
  const {deployer} = await getNamedAccounts();
  console.log("Fetching nonce for account:", deployer);
  const nonce = await ethers.provider.getTransactionCount(deployer, 'latest');
  console.log("Nonce:", nonce);
  await rawTx({from: deployer, to: deployer, nonce});
})();
