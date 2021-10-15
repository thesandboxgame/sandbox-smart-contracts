import {getNamedAccounts, ethers, deployments, hre} from 'hardhat';
import * as bico from '@biconomy/mexa';

// this script allow to stop pending transaction
(async () => {
  console.log('DSFSDFDFDF');
  const biconomy = new bico.Biconomy(ethers.provider, {
    apiKey: 'TVWVnKizm.0d4d3808-c6ce-4612-bbe1-a6b85f47d892',
    debug: true,
  });
  console.log('LAALALLA');
  const ethersProvider = new ethers.providers.Web3Provider(biconomy);

  const {deployer, sandAdmin} = await getNamedAccounts();

  // Initialize Constants
  const sandContract = await ethers.getContract(
    'PolygonSand',
    biconomy.getSignerByAddress(deployer)
  );

  const balance = await sandContract.balanceOf(deployer);

  console.log(balance);

  // Create your target method signature.. here we are calling setQuote() method of our contract
  const {data} = await sandContract.populateTransaction.transfer(sandAdmin, 10);
  const provider = biconomy.getEthersProvider();

  const gasLimit = await provider.estimateGas({
    to: sandContract.address,
    from: deployer,
    data: data,
  });
  console.log('Gas limit : ', gasLimit);

  const txParams = {
    data: data,
    to: sandContract.address,
    from: deployer,
    gasLimit: gasLimit, // optional
    signatureType: 'PERSONAL_SIGN', // Or omit this because by default mexa will consider personal sign
  };

  const tx = await provider.send('eth_sendTransaction', [txParams]);
  console.log('Transaction hash : ', tx);

  //event emitter methods
  provider.once(tx, (transaction: any) => {
    // Emitted when the transaction has been mined
    //show success message
    console.log(transaction);
    //do something with transaction hash
  });
})();
