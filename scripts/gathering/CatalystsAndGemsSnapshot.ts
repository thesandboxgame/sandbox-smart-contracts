import {outputJsonSync} from 'fs-extra';
import {ethers} from 'hardhat';
const fromBlock = 0;

void (async () => {
  console.log(
    'Current block',
    (await ethers.provider.getBlock('latest')).number
  );
  await listEvents([
    {
      contractName: 'OldCatalystRegistry',
      eventNames: ['CatalystApplied', 'GemsAdded'],
      toBlock: 7370475,
    },
    // {contractName: "Asset", eventNames: ["TransferBatch", "TransferSingle", "Transfer"], toBlock: 7370475},
  ]);
})();

async function listEvents(
  contracts: {contractName: string; eventNames: string[]; toBlock?: number}[]
) {
  for (const {contractName, eventNames} of contracts) {
    const Contract = await ethers.getContract(contractName);
    console.log(contractName, Contract.address);
    for (const eventName of eventNames) {
      if (!Contract.filters[eventName]) {
        console.log(eventName, 'not found');
        continue;
      }
      const events = await Contract.queryFilter(
        Contract.filters[eventName](),
        fromBlock,
        'latest'
      );
      console.log(eventName, events.length);
      outputJsonSync(
        `tmp/snapshot-cat-gem-${contractName}-${eventName}.json`,
        events.map((e) => {
          const args = e.args || [];
          return args.map((a) => a.toString());
        })
      );
    }
  }
}
