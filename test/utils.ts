/* eslint-disable mocha/no-exports */
import {BigNumber} from '@ethersproject/bignumber';
import {ethers} from 'hardhat';

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

// TODO: correct types
type Contract = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryFilter: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any;
};

// TODO: correct types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findEvents(
  contract: Contract,
  event: string,
  blockHash: string
): Promise<any[]> {
  const filter = contract.filters[event]();
  const events = await contract.queryFilter(filter, blockHash);
  return events;
}
