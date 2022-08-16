/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/connected_asset_transfers.ts [TOKEN_ID [TO_WALLET [START_BLOCK [END_BLOCK]]]]
 */
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import {queryEvents} from '../utils/query-events';

const args = process.argv.slice(2);
const tokenId =
  args[0] ||
  '55464657044963196816950587289035428064568320970692304673817341489687899934721';
const toWallet = args[1] || '0x7a9fe22691c811ea339d9b73150e6911a5343dca';
const startBlock = args[2] ? parseInt(args[2]) : 12065169;
const endBlock = args[3] ? parseInt(args[3]) : undefined;

void (async () => {
  const Asset = await ethers.getContract('Asset');
  const singleTransferEvents = (
    await queryEvents(
      Asset,
      Asset.filters.TransferSingle(null, null, toWallet),
      startBlock,
      endBlock
    )
  )
    .map((ev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args: {[key: string]: any} = {...ev.args} || {};
      for (const key in args) {
        const element = args[key];
        if (BigNumber.isBigNumber(element)) {
          args[key] = element.toString();
        }
      }
      return {...ev, args};
    })
    .filter((ev) => ev.args.id === tokenId);

  console.log('SINGLE TRANSFERS', singleTransferEvents.length);

  const totals: {[address: string]: BigNumber} = {};
  singleTransferEvents.forEach((ev) => {
    if (!totals[ev.args.from]) {
      totals[ev.args.from] = BigNumber.from(0);
    }
    totals[ev.args.from] = totals[ev.args.from].add(
      BigNumber.from(ev.args.value)
    );
  });

  const totalsMapped: {[address: string]: string} = {};
  for (const key in totals) {
    totalsMapped[key] = totals[key].toString();
  }

  fs.outputJSONSync('tmp/asset_transfers.json', singleTransferEvents);
  fs.outputJSONSync('tmp/asset_transfers_totals.json', totalsMapped);
})();
