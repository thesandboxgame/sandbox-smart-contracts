/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/transact/migrateTunnelLandOnL2.ts <ADDRESS OF POLYGON LAND TUNNEL> <BLOCKNUMBER OF POLYGON LAND TUNNEL CREATION>
 */
import {Contract, EventFilter} from 'ethers';
import fs from 'fs-extra';
import {ethers, getNamedAccounts} from 'hardhat';

const args = process.argv.slice(2);
const landTunnel = args[0];
const startBlock = parseInt(args[1]);

const withdrawEventSignature = [
  'event Withdraw(address indexed user,uint256 size,uint256 x,uint256 y,bytes data)',
];

void (async () => {
  const commonIds = JSON.parse(
    fs.readFileSync('./tunnel_land_common_ids.json').toString()
  );

  const endBlock = await ethers.provider.getBlockNumber();

  const PolygonLandTunnelMigration = await ethers.getContract(
    'PolygonLandTunnelMigration'
  );

  const {deployer} = await getNamedAccounts();
  const PolygonLandTunnelMigrationAsAdmin = PolygonLandTunnelMigration.connect(
    ethers.provider.getSigner(deployer)
  );

  console.log('Fetching owner of LandIds');

  let withdrawEventArgsOfTransaction: any = {};

  // fetch the intended owners on L1 for common Lands on both L1 and L2
  for (let i = 0; i < commonIds.length; i++) {
    await queryAndSaveWithdrawEventArguments(
      ethers.utils.hexlify(commonIds[i])
    );
  }

  const transactions = Object.keys(withdrawEventArgsOfTransaction);
  const ownerWithQuadSizeAndCoordinatesArr = [];

  const sizes = [];
  const x = [];
  const y = [];
  for (let j = 0; j < transactions.length; j++) {
    const owner = withdrawEventArgsOfTransaction[transactions[j]].to;
    sizes.push(withdrawEventArgsOfTransaction[transactions[j]].size);
    x.push(withdrawEventArgsOfTransaction[transactions[j]].x);
    y.push(withdrawEventArgsOfTransaction[transactions[j]].y);
    const ownerWithLandIdsObject = {owner, sizes, x, y};
    ownerWithQuadSizeAndCoordinatesArr.push(ownerWithLandIdsObject);
  }

  // function call to migrate and withdraw Land on L2
  await migrateLandToTunnelWithWithdraw(ownerWithQuadSizeAndCoordinatesArr);

  // function to get the owner of Land @tokenId
  async function queryAndSaveWithdrawEventArguments(tokenId: string) {
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
    saveWithDrawEventArguments(transactionHash, withDrawLog);
  }

  // function to save withdraw event argument for a transaction
  function saveWithDrawEventArguments(
    transactionHash: string,
    withDrawLog: any
  ) {
    withdrawEventArgsOfTransaction = {
      ...withdrawEventArgsOfTransaction,
      [transactionHash]: {
        to: withDrawLog.args[0],
        size: parseInt(withDrawLog.args[1]._hex),
        x: parseInt(withDrawLog.args[2]._hex),
        y: parseInt(withDrawLog.args[3]._hex),
      },
    };
  }

  // function to query event from startBlock to endBlock
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
    let blockRange = 2560000000;
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

  interface ownerWithLandID {
    owner: string;
    sizes: Array<number>;
    x: Array<number>;
    y: Array<number>;
  }

  // function to migrate and withdraw common Lands through Land migration contract on L2
  async function migrateLandToTunnelWithWithdraw(
    ownerWithLandIdsArray: Array<ownerWithLandID>
  ) {
    await PolygonLandTunnelMigrationAsAdmin.migrateToTunnelWithWithdraw(
      ownerWithLandIdsArray
    );
  }
})();
