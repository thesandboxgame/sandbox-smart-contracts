import {BigNumber} from '@ethersproject/bignumber';

function sandWei(v: number) {
  return BigNumber.from(v).mul("1000000000000000000").toString();
}

// These are Mainnet prices based on 0.036367$ per SAND
const prices: {[priceId: string]: string} =  {
  "1x1": sandWei(905), // 905.412
  "3x3": sandWei(7772), // 7772.602
  "6x6": sandWei(29487), // 29487.936
  "12x12": sandWei(111381), // 111381.762
  "24x24": sandWei(419302), // 419302.272
  premium_1x1: sandWei(2106), // 2106.5
};


export default prices;
