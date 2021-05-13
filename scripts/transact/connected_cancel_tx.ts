import {getNamedAccounts, ethers, deployments} from 'hardhat';

const {rawTx} = deployments;

// this script allow to stop pending transaction
(async () => {
  const {deployer} = await getNamedAccounts();
  const nonce = await ethers.provider.getTransactionCount(deployer, 'latest');
  await rawTx({from: deployer, to: deployer, nonce});
})();
