/* eslint-disable mocha/no-exports */
import { BigNumber } from '@ethersproject/bignumber';
import { ContractReceipt, Event, Contract, ContractTransaction } from 'ethers';
import { Result } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

export async function increaseTime(numSec: number): Promise<void> {
  await ethers.provider.send('evm_increaseTime', [numSec]);
}

export async function mine(): Promise<void> {
  await ethers.provider.send('evm_mine', []);
}

type Test = {
  title: string;
  subTests?: Test[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test: any;
};

export function recurseTests(test: Test): void {
  /* eslint-disable mocha/no-setup-in-describe */
  if (test.subTests) {
    describe(test.title, function () {
      if (test.subTests) {
        for (const subTest of test.subTests) {
          recurseTests(subTest);
        }
      }
    });
  } else {
    it(test.title, test.test);
  }
  /* eslint-enable mocha/no-setup-in-describe */
}

export function toWei(number: string | number | BigNumber): BigNumber {
  return BigNumber.from(number).mul('1000000000000000000');
}

export function cubeRoot6(bigNum: BigNumber): BigNumber {
  const DECIMALS_18 = BigNumber.from(1).mul('1000000000000000000');
  const a = bigNum.mul(DECIMALS_18);
  const base = BigNumber.from(2);
  const root = BigNumber.from(3);
  let tmp = a.add(base).div(root);
  let c = a;
  while (tmp.lt(c)) {
    c = tmp;
    const tmpSquare = tmp.mul(tmp);
    const numerator = a.div(tmpSquare).add(tmp.mul(base));
    tmp = numerator.div(root);
  }
  return c;
}

export async function findEvents(
  contract: Contract,
  event: string,
  blockHash: string
): Promise<Event[]> {
  const filter = contract.filters[event]();
  const events = await contract.queryFilter(filter, blockHash);
  return events;
}

export type EventWithArgs = Event & { args: Result };

export async function expectReceiptEventWithArgs(
  receipt: ContractReceipt,
  name: string
): Promise<EventWithArgs> {
  if (!receipt.events) {
    throw new Error('no events');
  }
  for (const event of receipt.events) {
    if (event.event === name) {
      if (!event.args) {
        throw new Error('event has no args');
      }
      return event as EventWithArgs;
    }
  }
  throw new Error('no matching events');
}

export async function expectEventWithArgs(
  contract: Contract,
  receipt: ContractReceipt,
  event: string
): Promise<EventWithArgs> {
  const events = await findEvents(contract, event, receipt.blockHash);
  if (events.length == 0) {
    throw new Error('no events');
  }
  if (!events[0].args) {
    throw new Error('event has no args');
  }
  return events[0] as EventWithArgs;
}

export function waitFor(
  p: Promise<ContractTransaction>
): Promise<ContractReceipt> {
  return p.then((tx) => tx.wait());
}

export declare const zeroAddress = "0x0000000000000000000000000000000000000000";
