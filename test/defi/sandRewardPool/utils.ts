import {getTime, setNextBlockTime} from '../../utils';

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
