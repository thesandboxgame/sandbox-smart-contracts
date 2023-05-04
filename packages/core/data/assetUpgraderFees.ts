import {BigNumber} from '@ethersproject/bignumber';

function sandWei(v: number) {
  return BigNumber.from(v).mul("1000000000000000000").toString();
}

export const upgradeFee = sandWei(300);
export const gemAdditionFee = sandWei(100);