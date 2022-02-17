import {BigNumber} from 'ethers';

function cbrt3(a: BigNumber) {
  a = BigNumber.from(a);
  a = a.mul('1000000000');
  let tmp = a.add(2).div(3);
  let c = BigNumber.from(a);
  while (tmp.lt(c)) {
    c = BigNumber.from(tmp);
    const tmpSquare = tmp.pow(2);
    tmp = a.div(tmpSquare).add(tmp.mul(2)).div(3);
  }
  return c;
}

const MIDPOINT_9 = BigNumber.from('500000000');
const NFT_FACTOR_6 = BigNumber.from('10000');
const NFT_CONSTANT_3 = BigNumber.from('9000');
const ROOT3_FACTOR = BigNumber.from(697);
const DECIMALS_9 = BigNumber.from('1000000000');

export const contribution = function (
  amountStaked: BigNumber,
  numLands: BigNumber
): BigNumber {
  amountStaked = BigNumber.from(amountStaked);
  numLands = BigNumber.from(numLands);
  if (numLands.eq(0)) {
    return amountStaked;
  }
  let nftContrib = NFT_FACTOR_6.mul(
    NFT_CONSTANT_3.add(cbrt3(numLands.sub(1).mul(ROOT3_FACTOR).add(1)))
  );
  if (nftContrib.gt(MIDPOINT_9)) {
    nftContrib = MIDPOINT_9.add(nftContrib.sub(MIDPOINT_9).div(10));
  }
  return amountStaked.add(amountStaked.mul(nftContrib).div(DECIMALS_9));
};
