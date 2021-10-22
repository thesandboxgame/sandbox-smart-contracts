import {getNamedAccounts, ethers, network, deployments} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import 'dotenv/config';

const {read} = deployments;
const args = process.argv.slice(2);

(async () => {
  // Only for minting tokens through deposit method on Mumbai or Matic network
  if (network.name !== 'polygon' && network.name !== 'mumbai') {
    throw new Error('only for polygon/mumbai');
  }

  /*
    Four arguments are required by the script
    1) Address of the claim contract
    2) Address of the fake PolygonSand contract
    3) Address of the our PolygonSand contract
    4) Boolean flag for minting
  */
  if (args.length != 4) {
    throw new Error('wrong number of arguments passed');
  }

  // Fetching parameters
  const claimsContractAddress = args[0];
  const oldSandContractAddress = args[1];
  const newSandContractAddress = args[2];
  const mintTokens = args[3] == 'true' ? true : false;

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
  const oldSandContract = Contract.attach(oldSandContractAddress);
  const newSandContract = Contract.attach(newSandContractAddress);

  // Update childChainManagerProxy to allow deposit on contract
  if (childChainManagerProxy != deployer && mintTokens) {
    const updateProxyManagerTx = await newSandContract.updateChildChainManager(
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

  const totalFakeSand = BigNumber.from(await oldSandContract.totalSupply());
  console.log('Total Supply of Fake Sand', totalFakeSand.toString());
  const balanceOfClaimContract = BigNumber.from(
    await newSandContract.balanceOf(claimsContractAddress)
  );
  console.log(
    'Sand balance of Claim contract',
    balanceOfClaimContract.toString()
  );

  let mintAmount = BigNumber.from('0');

  if (balanceOfClaimContract == BigNumber.from('0')) {
    mintAmount = totalFakeSand;
  } else if (balanceOfClaimContract <= totalFakeSand) {
    mintAmount = totalFakeSand.sub(balanceOfClaimContract);
  } else {
    console.log('Balance Error');
  }

  console.log('Total mint amount', mintAmount.toString());

  if (mintTokens && mintAmount > BigNumber.from('0')) {
    console.log('Minting tokens to PolygonSandClaim contract');
    const abiCoder = ethers.utils.defaultAbiCoder;
    const encodedAmount = abiCoder.encode(['uint256'], [mintAmount.toString()]);
    const tx = await newSandContract.deposit(
      claimsContractAddress,
      encodedAmount
    );
    await tx.wait();
    console.log('Successfully minted', mintAmount.toString(), 'tokens');
  }

  if (mintTokens) {
    // Fetching childChainManagerProxy address
    const envChildChainManagerProxy =
      process.env[`CHILD_CHAIN_MANAGER_PROXY_${network.name.toUpperCase()}`];
    const childChainManagerProxyAddress = envChildChainManagerProxy
      ? envChildChainManagerProxy
      : childChainManagerProxy;

    // Reset childChainManagerProxy on the new PolygonSand contract
    if (deployer != childChainManagerProxyAddress) {
      console.log('Resetting childChainManagerProxy');
      const resetProxyManagerTx = await newSandContract.updateChildChainManager(
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
  }
})();
