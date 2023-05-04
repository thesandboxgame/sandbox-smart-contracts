import {deployments, ethers, getNamedAccounts} from 'hardhat';

const {rawTx} = deployments;

const args = process.argv.slice(2);
const to = args[0]; // in Ethers
const value = args[1]; // in Ethers

// this script allow to stop pending transaction
void (async () => {
  const {deployer} = await getNamedAccounts();
  const balance = await ethers.provider.getBalance(deployer);
  const valueWei = ethers.utils.parseEther(value).toString();
  console.log('Balance:', ethers.utils.formatEther(balance));
  console.log('Value:', value);
  console.log('Value in wei:', valueWei);
  await rawTx({from: deployer, to, value: valueWei, log: true});
})();
