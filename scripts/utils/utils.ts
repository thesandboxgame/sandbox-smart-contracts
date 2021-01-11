import {ContractReceipt, ContractTransaction} from 'ethers';

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
