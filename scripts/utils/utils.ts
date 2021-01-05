import {ContractReceipt, ContractTransaction} from 'ethers';

export function waitFor(
  p: Promise<ContractTransaction>
): Promise<ContractReceipt> {
  return p.then((tx) => tx.wait());
}
