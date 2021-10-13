import {getNamedAccounts, ethers, network, deployments} from 'hardhat';
import fs from 'fs-extra';
import 'dotenv/config';

const {read} = deployments;
const args = process.argv.slice(2);

(async () => {
  if (network.name !== 'matic' && network.name !== 'mumbai') {
    throw new Error('only for matic/mumbai');
  }

  if (args.length != 4) {
    throw new Error('wrong number of arguments passed');
  }

  console.log('Loading Token Holders');
  const path = args[0];
  const csv = fs.readFileSync(path, 'utf-8');
  const data = csv.split('\n').slice(1);
  const holders: Array<string> = [];
  for (const row of data) {
    const address = row.split(',')[0].slice(1, -1);
    if (address) {
      holders.push(address);
    }
  }

  const oldContractAddress = args[1];
  const newContractAddress = args[2];
  const blockTag = parseInt(args[3]);

  const {deployer} = await getNamedAccounts();

  const childChainManagerProxy = await read(
    'PolygonSand',
    'childChainManagerProxy'
  );

  const childSand = await ethers.getContract('PolygonSand', deployer);
  if (childChainManagerProxy != deployer) {
    const updateProxyManagerTx = await childSand.updateChildChainManager(
      deployer
    );

    console.log(
      'Child Proxy Manager changed to',
      deployer,
      'with transaction',
      updateProxyManagerTx.hash
    );

    await updateProxyManagerTx.wait();
  }

  const Contract = await ethers.getContractFactory('PolygonSand');
  const oldContract = Contract.attach(oldContractAddress);
  const newContract = Contract.attach(newContractAddress);

  const getBalance = async (contract: any, holder: string) => {
    const balance = await contract.balanceOf(holder, {blockTag: blockTag});
    return balance.toString();
  };

  const abiCoder = ethers.utils.defaultAbiCoder;
  const mintSand = async (holder: string, amount: string) => {
    const encodedAmount = abiCoder.encode(['uint256'], [amount]);
    const tx = await childSand.deposit(holder, encodedAmount);
    await tx.wait();
  };

  for (const holder of holders) {
    console.log('Minting SAND for holder ', holder);
    const balanceOnOldContract = await getBalance(oldContract, holder);
    const balanceOnNewContract = await getBalance(newContract, holder);
    const balanceDifference = balanceOnOldContract - balanceOnNewContract;
    if (balanceDifference < 0) {
      console.log('Balance Error');
    } else if (balanceDifference == 0) {
      console.log('Balance Consistent on both Contracts');
    } else {
      console.log('Minting', balanceDifference, 'SAND on new contract');
      await mintSand(holder, balanceDifference.toString());
    }
  }

  const envChildChainManagerProxy =
    process.env[`CHILD_CHAIN_MANAGER_PROXY_${network.name.toUpperCase()}`];
  const childChainManagerProxyAddress = envChildChainManagerProxy
    ? envChildChainManagerProxy
    : childChainManagerProxy;

  if (deployer != childChainManagerProxyAddress) {
    const resetProxyManagerTx = await childSand.updateChildChainManager(
      childChainManagerProxyAddress
    );
    console.log(
      'Child Proxy Manager reset with transaction',
      resetProxyManagerTx.hash
    );
    await resetProxyManagerTx.wait();
  } else {
    console.log('ChildChainManagerProxy not set');
  }
})();
