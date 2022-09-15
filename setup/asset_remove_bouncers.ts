import hre from 'hardhat';

void (async () => {
  const {deployments, ethers} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const Asset = await ethers.getContract('Asset');
  const network = process.env.HARDHAT_FORK
    ? process.env.HARDHAT_FORK
    : hre.network.name;
  const fromBlock = (await import(`../deployments/${network}/Asset.json`))
    .receipt.blockNumber;
  const events = await Asset.queryFilter(
    Asset.filters.Bouncer(),
    fromBlock,
    'latest'
  );
  const bouncers = events
    .filter((e) => e.args?.enabled)
    .map((e) => e.args?.bouncer);
  console.log({bouncers: bouncers.length});
  const bouncerAdmin = await read('Asset', 'getBouncerAdmin');
  for (const bouncer of bouncers) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: bouncerAdmin, log: true},
        'setBouncer',
        bouncer,
        false
      )
    );
  }
})();
