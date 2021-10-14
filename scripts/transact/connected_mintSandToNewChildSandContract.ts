import {getNamedAccounts, ethers, network, deployments} from 'hardhat';
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
    2) Address of the fake PolygonSand contract
    3) Address of the our PolygonSand contract
    4) Blocknumber to reading balance
  */
  if (args.length != 4) {
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
  const oldContractAddress = args[1];
  const newContractAddress = args[2];
  const blockTag = parseInt(args[3]);

  // User for contract interactions
  const {deployer} = await getNamedAccounts();

  // Fetching and storing current childProxy locally
  const childChainManagerProxy = await read(
    'PolygonSand',
    'childChainManagerProxy'
  );

  // Get contract instance
  const Contract = await ethers.getContractFactory('PolygonSand');
  const oldContract = Contract.attach(oldContractAddress);
  const newContract = Contract.attach(newContractAddress);

  // Update childChainManagerProxy to allow deposit on contract
  if (childChainManagerProxy != deployer) {
    const updateProxyManagerTx = await newContract.updateChildChainManager(
      deployer
    );

    console.log(
      'Child Chain Manager Proxy changed to',
      deployer,
      'with transaction',
      updateProxyManagerTx.hash
    );

    await updateProxyManagerTx.wait();
  }

  // Method to mint sand tokens on new contract
  const abiCoder = ethers.utils.defaultAbiCoder;
  const mintSand = async (holder: string, amount: string) => {
    const encodedAmount = abiCoder.encode(['uint256'], [amount]);
    const tx = await newContract.deposit(holder, encodedAmount);
    await tx.wait();
  };

  // Iterating through every holder to fetch balances on both contract and mint the difference on new contract
  for (const holder of holders) {
    console.log('Minting SAND for holder', holder);
    const balanceOnOldContract = await oldContract.balanceOf(holder, {
      blockTag: blockTag,
    });
    const balanceOnNewContract = await newContract.balanceOf(holder, {
      blockTag: blockTag,
    });

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
    console.log(
      'Child Proxy Manager reset with transaction',
      resetProxyManagerTx.hash
    );
    await resetProxyManagerTx.wait();
  } else {
    console.log('ChildChainManagerProxy not set');
  }
})();
