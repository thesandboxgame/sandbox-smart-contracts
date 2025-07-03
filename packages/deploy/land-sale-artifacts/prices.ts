import {BigNumber} from '@ethersproject/bignumber';
import {formatEther} from 'ethers';

function sandWeiScale(v: number) {
  return BigNumber.from(v)
    .mul('1000000000000000000')
    .div('2022')
    .mul('10')
    .toString();
}

// These are Mainnet prices based on 0.036367$ per SAND
const prices: {[priceId: string]: string} = {
  '1x1': sandWeiScale(1011),
  '3x3': sandWeiScale(8648),
  '6x6': sandWeiScale(32772),
  '12x12': sandWeiScale(123806),
  '24x24': sandWeiScale(466102),
  premium_1x1: sandWeiScale(4683),
};
console.log(
  '--------> Land prices',
  Object.keys(prices).reduce(
    (acc, val) => ({...acc, [val]: formatEther(prices[val])}),
    {}
  )
);
export default prices;
