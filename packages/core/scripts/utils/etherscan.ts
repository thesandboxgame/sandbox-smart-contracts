import axios from 'axios';

export type EtherscanTransaction = {
  hash: string;
  input: string;
  gasUsed: string;
  gasPrice: string;
  from: string;
  isError: string;
};

const offset = 1000;

export class Etherscan {
  constructor(private apiKey: string) {}

  async transactionsFrom(
    contractAddress: string,
    fromBlockNumber = 0,
    toBlockNumber = 99999999
  ): Promise<EtherscanTransaction[]> {
    const txs = [];
    let page = 1;
    let more = true;
    let startBlock = fromBlockNumber;
    const endBlock = toBlockNumber;
    let lastTransaction;
    let fromTransactionIndex = 0;
    while (more) {
      const response = await axios.get(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}`
      );
      const transactions = response.data.result;
      if (transactions) {
        for (const tx of transactions) {
          if (fromTransactionIndex > 0) {
            if (tx.transactionIndex < fromTransactionIndex) {
              continue;
            }
          }
          txs.push(tx);
        }
        const numTransactions = transactions.length;
        more = numTransactions > 0; // TODO max
        page++;
        lastTransaction = transactions[numTransactions - 1];
        fromTransactionIndex = 0;
      } else {
        if (
          response.data &&
          response.data.status === '0' &&
          response.data.message ===
            'Result window is too large, PageNo x Offset size must be less than or equal to 10000'
        ) {
          startBlock = lastTransaction.blockNumber;
          fromTransactionIndex = lastTransaction.transactionIndex + 1;
        } else {
          if (response.data) {
            console.error(response.data);
          } else {
            console.error(response.statusText);
          }

          more = false;
        }
      }
    }
    return txs;
  }
}
