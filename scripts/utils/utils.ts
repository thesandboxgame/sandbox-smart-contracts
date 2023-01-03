import {ContractReceipt, ContractTransaction} from 'ethers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {ArgumentParser} = require('argparse');

export function waitFor(
  p: Promise<ContractTransaction>
): Promise<ContractReceipt> {
  return p.then((tx) => tx.wait());
}

export function getBlockArgs(index = 0): number {
  const args = process.argv.slice(2);
  let blockNumber;
  const blockNumberString = args[index];
  if (blockNumberString && blockNumberString !== '') {
    blockNumber = parseInt(blockNumberString);
  }
  if (!blockNumber || isNaN(blockNumber)) {
    throw new Error(
      `This script needs a blockNumber to query at, to ensure reliable information provide a blockNumber confirmed by at least 12 confirmations`
    );
  }
  return blockNumber;
}

// TODO: Upgrade the library and add types.
/* eslint-disable  @typescript-eslint/no-explicit-any */
export function getArgParser(opts?: {
  description: string;
}): {
  addArgument(arg: string | string[], options?: any): void;
  addFlag(arg: string | string[], options?: any): void;
  parseArgs(args?: string[], ns?: any): any;
} {
  const parser = new ArgumentParser(opts);
  parser.exit = (status: number, msg: string) => {
    throw new Error(msg);
  };
  parser.addFlag = (arg: string | string[], options?: any) => {
    parser.addArgument(arg, {
      ...options,
      action: 'storeConst',
      constant: true,
      default: false,
    });
  };
  return parser;
}

/* eslint-enable  @typescript-eslint/no-explicit-any */
