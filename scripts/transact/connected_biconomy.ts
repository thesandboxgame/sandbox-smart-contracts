import {getNamedAccounts, ethers} from 'hardhat';
import * as bico from '@biconomy/mexa';
import {Transaction} from '@ethersproject/transactions';

/**
 *  Testing Biconomy
 *  yarn execute mumbai ./scripts/transact/connected_biconomy.ts
 * */
(async () => {
  const biconomy = new bico.Biconomy(ethers.provider, {
    apiKey: process.env.BICONOMY_API_KEY,
    debug: true,
  });

  new ethers.providers.Web3Provider(biconomy);

  const {deployer, sandAdmin} = await getNamedAccounts();

  biconomy
    .onEvent(biconomy.READY, async () => {
      // Initialize Constants
      const sandContract = await ethers.getContract(
        'PolygonSand',
        biconomy.getSignerByAddress(deployer)
      );

      // Create your target method signature.. here we are calling setQuote() method of our contract
      const {data} = await sandContract.populateTransaction.transfer(
        sandAdmin,
        10
      );
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
        signatureType: 'EIP712_SIGN', // Or omit this because by default mexa will consider personal sign
      };

      const tx = await provider.send('eth_sendTransaction', [txParams]);
      console.log('Transaction hash : ', tx);

      //event emitter methods
      provider.once(tx, (transaction: Transaction) => {
        // Emitted when the transaction has been mined
        //show success message
        console.log(transaction);
        //do something with transaction hash
      });
    })
    .onEvent(biconomy.ERROR, (error: string, message: string) => {
      // Handle error while initializing mexa
      console.log(message);
      console.log(error);
    });
})();
