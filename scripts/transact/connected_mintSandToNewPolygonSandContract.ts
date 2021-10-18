import {getNamedAccounts, ethers, network, deployments} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs-extra';
import 'dotenv/config';

const {read} = deployments;
const args = process.argv.slice(2);

(async () => {
  // Only for minting tokens through deposit method on Mumbai or Matic network
  if (network.name !== 'matic' && network.name !== 'mumbai') {
    throw new Error('only for matic/mumbai');
  }

  /*
    Four arguments are required by the script
    1) Path to csv file containing holder details (downloaded from the Fake Sand Contract on etherscan)
    2) Address of the minter contract
    3) Address of the fake PolygonSand contract
    4) Address of the our PolygonSand contract
    5) Blocknumber to reading balance
  */
  if (args.length != 5) {
    throw new Error('wrong number of arguments passed');
  }

  // Fetching holder addresses from CSV
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

  // Fetching other parameters
  const minterContractAddress = args[1];
  const oldContractAddress = args[2];
  const newContractAddress = args[3];
  const blockTag = parseInt(args[4]);

  // User for contract interactions
  const {deployer} = await getNamedAccounts();
  console.log('Running task with signer', deployer);

  // Fetching and storing current childProxy locally
  const childChainManagerProxy = await read(
    'PolygonSand',
    'childChainManagerProxy'
  );

  // Get contract instance
  const Contract = await ethers.getContractFactory('PolygonSand');
  const oldContract = Contract.attach(oldContractAddress);
  const newContract = Contract.attach(newContractAddress);

  const MinterContract = await ethers.getContractFactory(
    'PolygonSandBatchDeposit'
  );
  const minterContract = MinterContract.attach(minterContractAddress);

  // Update childChainManagerProxy to allow deposit on contract
  if (childChainManagerProxy != minterContractAddress) {
    const updateProxyManagerTx = await newContract.updateChildChainManager(
      minterContractAddress
    );

    console.log(
      'Child Chain Manager Proxy changed to',
      minterContract.address,
      'with transaction',
      updateProxyManagerTx.hash
    );

    await updateProxyManagerTx.wait();
  }

  // Method to mint sand tokens on new contract
  const mintBatch = async (batch: string[], values: BigNumber[]) => {
    const tx = await minterContract.batchMint(batch, values);
    await tx.wait();
  };

  // Iterating through every holder to fetch balances on both contract and mint the difference on new contract batch-wise
  let batch = [];
  let values = [];
  for (const holder of holders) {
    const balanceOnOldContract = await oldContract.balanceOf(holder, {
      blockTag: blockTag,
    });
    const balanceOnNewContract = await newContract.balanceOf(holder, {
      blockTag: blockTag,
    });

    const balanceDifference = BigNumber.from(
      (balanceOnNewContract - balanceOnOldContract).toString()
    );

    if (balanceDifference < BigNumber.from('0')) {
      console.log('Balance Error');
    } else if (balanceDifference == BigNumber.from('0')) {
      console.log('Balance Consistent on both Contracts');
    } else {
      batch.push(holder);
      values.push(balanceDifference);
    }

    if (batch.length == 1000) {
      console.log('Minting batch on new contract');
      await mintBatch(batch, values);
      batch = [];
      values = [];
    }
  }

  if (batch.length > 0) {
    console.log('Minting batch on new contract');
    await mintBatch(batch, values);
  }

  // Fetching childChainManagerProxy address
  const envChildChainManagerProxy =
    process.env[`CHILD_CHAIN_MANAGER_PROXY_${network.name.toUpperCase()}`];
  const childChainManagerProxyAddress = envChildChainManagerProxy
    ? envChildChainManagerProxy
    : childChainManagerProxy;

  // Reset childChainManagerProxy on the new PolygonSand contract
  if (deployer != childChainManagerProxyAddress) {
    const resetProxyManagerTx = await newContract.updateChildChainManager(
      childChainManagerProxyAddress
    );
    await resetProxyManagerTx.wait();
    console.log(
      'Child Proxy Manager reset with transaction',
      resetProxyManagerTx.hash
    );
  } else {
    console.log('ChildChainManagerProxy not set');
  }
})();
