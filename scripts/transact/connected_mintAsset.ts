import {getNamedAccounts, ethers, network, deployments} from 'hardhat';

const {read} = deployments;

const args = process.argv.slice(2);

(async () => {
  if (network.name !== 'rinkeby') {
    throw new Error('only for rinkeby');
  }
  const {genesisMinter, deployer} = await getNamedAccounts();

  let to = deployer;
  if (args.length > 0) {
    to = args[0];
  }

  let packIdused = true;
  let packId = 0;
  while (packIdused) {
    packIdused = await read('Asset', 'isPackIdUsed', deployer, packId, 1);
    if (packIdused) {
      console.log(`packId ${packId} used, check next...`);
      packId++;
    }
  }

  const genesisBouncer = await ethers.getContract(
    'GenesisBouncer',
    genesisMinter
  );
  const tx = await genesisBouncer.mintFor(
    deployer,
    packId,
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    20000,
    0,
    to
  );

  console.log({txHash: tx.hash});

  const receipt = await tx.wait();

  const Asset = await ethers.getContract('Asset');
  const eventsMatching = await Asset.queryFilter(
    Asset.filters.TransferSingle(),
    receipt.blockNumber
  );

  const eventArgs = eventsMatching[0].args;
  console.log({
    from: eventArgs?.from,
    to: eventArgs?.to,
    id: eventArgs?.id.toString(),
    quantity: eventArgs?.value.toString(),
  });
})();
