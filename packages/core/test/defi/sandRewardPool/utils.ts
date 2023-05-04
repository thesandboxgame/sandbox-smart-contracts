import {getTime, setNextBlockTime} from '../../utils';
import {BigNumber, BigNumberish} from 'ethers';

export const setBlockTime = (time: number): Promise<void> =>
  setNextBlockTime(time, true);

export async function doOnNextBlock(
  todo: () => Promise<void>,
  nextTimestamp = 0
): Promise<number> {
  if (!nextTimestamp) {
    nextTimestamp = (await getTime()) + 10;
  }
  await setNextBlockTime(nextTimestamp);
  await todo();
  return nextTimestamp;
}

export function randomBigNumber(base: BigNumberish): BigNumber {
  return BigNumber.from(base)
    .mul(Math.floor(100000000 * Math.random()))
    .div(100000000);
}
