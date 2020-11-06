import {BigNumber} from "ethers";

export type Tx = {
  hash: string,
  blockHash: string,
  blockNumber: number,
  transactionIndex: number,
  confirmations: number,
  from: string,
  gasPrice: BigNumber,
  gasLimit: BigNumber,
  to: string,
  value: BigNumber,
  nonce: number,
  data: string,
  r: string,
  s: string,
  v: number,
  creates: null,
  chainId: number,
  wait: () => void
}
