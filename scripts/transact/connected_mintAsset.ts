import {getNamedAccounts, ethers, network} from 'hardhat';

(async () => {
  if (network.name !== 'rinkeby') {
    throw new Error('only for rinkeby');
  }
  const {genesisMinter} = await getNamedAccounts();

  const genesisBouncer = await ethers.getContract(
    'GenesisBouncer',
    genesisMinter
  );
  await genesisBouncer.mintFor(
    '0x60927eB036621b801491B6c5e9A60A8d2dEeD75A',
    1,
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    20000,
    0,
    '0x60927eB036621b801491B6c5e9A60A8d2dEeD75A'
  );
})();
