import { BigNumber } from '@ethersproject/bignumber';
function sandWei(amount: number) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

export =[
  {
    name: "Common",
    symbol: "COMMON",
    sandMintingFee: sandWei(1),
    sandUpdateFee: sandWei(1),
    maxGems: 1,
    quantityRange: [4000, 20000],
  },
  {
    name: "Rare",
    symbol: "RARE",
    sandMintingFee: sandWei(4),
    sandUpdateFee: sandWei(4),
    maxGems: 2,
    quantityRange: [1500, 4000],
  },
  {
    name: "Epic",
    symbol: "EPIC",
    sandMintingFee: sandWei(10),
    sandUpdateFee: sandWei(10),
    maxGems: 3,
    quantityRange: [200, 1500],
  },
  {
    name: "Legendary",
    symbol: "LEGENDARY",
    sandMintingFee: sandWei(200),
    sandUpdateFee: sandWei(200),
    maxGems: 4,
    quantityRange: [1, 200],
  },
];
