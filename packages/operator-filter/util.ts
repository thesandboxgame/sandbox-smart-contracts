/* eslint-disable mocha/no-exports */
import {BigNumber} from '@ethersproject/bignumber';
import {
  Contract,
  ContractReceipt,
  ContractTransaction,
  Event,
  utils,
} from 'ethers';
import {Receipt} from 'hardhat-deploy/types';
import {Result} from 'ethers/lib/utils';
import {deployments, ethers, network} from 'hardhat';
import {FixtureFunc} from 'hardhat-deploy/dist/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export async function sequentially<S, T>(
  arr: Array<S>,
  callbackfn: (value: S, index: number, array: S[]) => Promise<T>
): Promise<T[]> {
  const ret = [];
  for (let i = 0; i < arr.length; i++) {
    ret.push(await callbackfn(arr[i], i, arr));
  }
  return ret;
}

export async function mine(): Promise<void> {
  await ethers.provider.send('evm_mine', []);
}

export async function increaseTime(
  numSec: number,
  callMine = true
): Promise<void> {
  // must do something (mine, send a tx) to move the time
  await ethers.provider.send('evm_increaseTime', [numSec]);
  if (callMine) await mine();
}

export async function getTime(): Promise<number> {
  const latestBlock = await ethers.provider.getBlock('latest');
  return latestBlock.timestamp;
}

export async function setNextBlockTime(
  time: number,
  callMine = false
): Promise<void> {
  // must do something (mine, send a tx) to move the time
  await ethers.provider.send('evm_setNextBlockTimestamp', [time]);
  if (callMine) await mine();
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
  return await contract.queryFilter(filter, blockHash);
}

export type EventWithArgs = Event & {args: Result};

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

export async function expectEventWithArgsFromReceipt(
  contract: Contract,
  receipt: Receipt,
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

type Contracts = Record<string, Contract>;

export async function setupUsers<T extends Contracts>(
  addresses: string[],
  contracts: T
): Promise<({address: string} & T)[]> {
  const users: ({address: string} & T)[] = [];
  for (const address of addresses) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = {address};
    for (const key of Object.keys(contracts)) {
      user[key] = contracts[key].connect(await ethers.getSigner(address));
    }
    users.push(user);
  }
  return users;
}

export async function setupUser<T extends Contracts>(
  address: string,
  contracts: T
): Promise<{address: string} & T> {
  const users = await setupUsers([address], contracts);
  return users[0];
}

export function getNftIndex(id: BigNumber): number {
  // js bitwise & operands are converted to 32-bit integers
  const idAsHexString = utils.hexValue(id);
  const slicedId = Number('0x' + idAsHexString.slice(48, 56));
  const SLICED_NFT_INDEX_MASK = Number('0x7F800000');
  return (slicedId & SLICED_NFT_INDEX_MASK) >>> 23;
}

export function getAssetChainIndex(id: BigNumber): number {
  // js bitwise & operands are converted to 32-bit integers
  const idAsHexString = utils.hexValue(id);
  const slicedId = Number('0x' + idAsHexString.slice(42, 50));
  const SLICED_CHAIN_INDEX_MASK = Number('0x7F800000');
  return (slicedId & SLICED_CHAIN_INDEX_MASK) >>> 23;
}

export async function evmRevertToInitialState(): Promise<void> {
  console.log('Revert to initial snapshot, calling reset');
  // This revert the evm state.
  await network.provider.request({
    method: 'hardhat_reset',
    params: [network.config],
  });
}

export function withSnapshot<T, O>(
  tags: string | string[] = [],
  func: FixtureFunc<T, O> = async () => {
    return <T>{};
  }
): (options?: O) => Promise<T> {
  return deployments.createFixture(
    async (env: HardhatRuntimeEnvironment, options?: O) => {
      // TODO: This has problems with solidity-coverage, when the fix that we can use it
      // TODO: We need a way to revert to initial state!!!
      //  await evmRevertToInitialState();
      await deployments.fixture(tags, {
        fallbackToGlobal: false,
        keepExistingDeployments: false,
      });
      return func(env, options);
    }
  );
}
