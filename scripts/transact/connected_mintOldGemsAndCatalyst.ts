import {getNamedAccounts, ethers, network} from 'hardhat';

const args = process.argv.slice(2);

(async () => {
  if (network.name !== 'rinkeby') {
    throw new Error('only for rinkeby');
  }
  const {deployer, gemMinter, catalystMinter} = await getNamedAccounts();

  let to = deployer;
  if (args.length > 0) {
    to = args[0];
  }

  const gems = await ethers.getContract('Gem', gemMinter);

  let tx = await gems.batchMint(to, [0, 1, 2, 3, 4], [100, 100, 100, 100, 100]);

  console.log({txHash: tx.hash});

  await tx.wait();

  const catalysts = await ethers.getContract('Catalyst', catalystMinter);

  tx = await catalysts.batchMint(to, [0, 1, 2, 3], [100, 100, 100, 100]);

  console.log({txHash: tx.hash});

  await tx.wait();
})();
