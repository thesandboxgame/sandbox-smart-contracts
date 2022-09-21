import {Contract, EventFilter} from 'ethers';
import fs from 'fs-extra';
import {ethers,getNamedAccounts} from 'hardhat';

const args = process.argv.slice(2);
const landTunnel = args[0];
const startBlock = parseInt(args[1]);

const withdrawEventSignature = [
  'event Withdraw(address indexed user, uint256 size, uint256 x, uint256 y, bytes data)',
];

void (async () => {
  const tokensSnapshotL1 = JSON.parse(
    fs.readFileSync('./tunnel_mainnet.json').toString()
  );
  const tokensSnapshotL2 = JSON.parse(
    fs.readFileSync('./tunnel-polygon.json').toString()
  );
  const {deployer} = await getNamedAccounts();

  const PolygonLandTunnelMigration = await ethers.getContract(
    'PolygonLandTunnelMigration'
  );
  const PolygonLandTunnelMigrationAsAdmin = PolygonLandTunnelMigration.connect(ethers.provider.getSigner(deployer));
  const endBlock = await ethers.provider.getBlockNumber();

  // fetch common IDs
  function getCommonElement(arr1: any, arr2: any) {
    let pointer = 0;
    const output = [];
    for (let i = 0; i < arr1.length; ++i) {
      for (let j = pointer; j < arr2.length; ++j) {
        if (arr1[i].id == arr2[j].id) {
          pointer = j;
          output.push(parseInt(arr1[i].id));
        }
      }
    }
    return output;
  }

  const commonIds = getCommonElement(tokensSnapshotL1, tokensSnapshotL2);

  // fetches owner from events
  async function queryAndReturnOwnerOnL1(tokenId: any) {
    const Land = await ethers.getContract('PolygonLand');
    const singleTransferEvents = await queryEvents(
      Land,
      Land.filters.Transfer(null, landTunnel, tokenId),
      startBlock,
      endBlock
    );

    const transactionHash =
      singleTransferEvents[singleTransferEvents.length - 1].transactionHash;

    const transaction = await ethers.provider.getTransactionReceipt(
      transactionHash
    );

    const iface = new ethers.utils.Interface(withdrawEventSignature);
    const length = transaction.logs.length;
    const withDrawLog = iface.parseLog(transaction.logs[length - 3]);

    return withDrawLog.args[0];
  }

  async function migrateLandToTunnel(arr: any) {
    await PolygonLandTunnelMigrationAsAdmin.migrateToTunnel(arr);
  }

  interface ownerWithLandID {
    owner: string;
    ids: Array<number>;
  }

  async function migrateLandToTunnelWithWithdraw(
    ownerWithLandIdsArray: Array<ownerWithLandID>
  ) {
    await PolygonLandTunnelMigrationAsAdmin.migrateToTunnelWithWithdraw(
      ownerWithLandIdsArray
    );
  }

  async function queryEvents(
    contract: Contract,
    filter: EventFilter,
    startBlock: number,
    endBlock: number
  ) {
    let consecutiveSuccess = 0;
    const successes: Record<number, boolean> = {};
    const failures: Record<number, boolean> = {};
    const events = [];
    let blockRange = 25600000;
    let fromBlock = startBlock;
    let toBlock = Math.min(fromBlock + blockRange, endBlock);
    while (fromBlock <= endBlock) {
      try {
        const moreEvents = await contract.queryFilter(
          filter,
          fromBlock,
          toBlock
        );

        console.log({fromBlock, toBlock, numEvents: moreEvents.length});
        successes[blockRange] = true;
        consecutiveSuccess++;
        if (consecutiveSuccess > 6) {
          const newBlockRange = blockRange * 2;
          if (!failures[newBlockRange] || successes[newBlockRange]) {
            blockRange = newBlockRange;
            console.log({blockRange});
          }
        }

        fromBlock = toBlock + 1;
        toBlock = Math.min(fromBlock + blockRange, endBlock);
        events.push(...moreEvents);
      } catch (e) {
        failures[blockRange] = true;
        consecutiveSuccess = 0;
        blockRange /= 2;
        toBlock = Math.min(fromBlock + blockRange, endBlock);

        console.log({fromBlock, toBlock, numEvents: 'ERROR'});
        console.error(e);
      }
    }
    return events;
  }

  console.log('Fetching owner of LandIds');
  let ownerOfLands: any = {};

  for (let i = 0; i < commonIds.length; i++) {
    const owner = await queryAndReturnOwnerOnL1(
      ethers.utils.hexlify(commonIds[i])
    );
    let flag = true;
    Object.keys(ownerOfLands).forEach((key) => {
      if (key == owner) {
        ownerOfLands[key].push(commonIds[i]);
        flag = false;
      }
    });
    if (flag) {
      ownerOfLands = {...ownerOfLands, [owner]: [commonIds[i]]};
    }
  }

  let remainingTokenOnL2 = [];
  for (let i = 0; i < tokensSnapshotL2.length; i++) {
    remainingTokenOnL2.push(parseInt(tokensSnapshotL2[i].id));
  }
  for (let i = 0; i < commonIds.length; i++) {
    remainingTokenOnL2 = remainingTokenOnL2.filter(
      (element: any) => element != commonIds[i]
    );
  }

  let index = 0;
  const maxIdInTransaction = 20;
  const remainingTokenOnL2Length = remainingTokenOnL2.length;
  const numberOfCalls =
    remainingTokenOnL2Length / 20 == 0
      ? remainingTokenOnL2Length / 20
      : remainingTokenOnL2Length / 20 + 1;
  for (let i = 0; i < numberOfCalls; i++) {
    const argument = remainingTokenOnL2.slice(
      index,
      index + maxIdInTransaction
    );
    index = index + maxIdInTransaction;
    await migrateLandToTunnel(argument);
  }

  const owners = Object.keys(ownerOfLands);
  const ownerWithLandIdsArr = [];
  for (let i = 0; i < owners.length; i++) {
    const ids = ownerOfLands[owners[i]];
    const owner = owners[i];
    const ownerWithLandIdsObject = {owner, ids};
    ownerWithLandIdsArr.push(ownerWithLandIdsObject);
  }
  await migrateLandToTunnelWithWithdraw(ownerWithLandIdsArr);
})();
