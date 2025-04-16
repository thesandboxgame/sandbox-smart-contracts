# How to run the transactions.

- Save the list in `enabled_claims_denied_users.csv` must have the column: `blockchainclaimid`
- Run `yarn ts-node scripts/claimRevoke/split.ts`
- Run `yarn hardhat run --network <NETWORK> scripts/claimRevoke/claimRevoke.ts`

  This script needs the `RELAYER_API_KEY` and `RELAYER_API_SECRET` `.env` vars

# Verification

- Run `yarn ts-node scripts/claimRevoke/saveTxs.ts` to get the txs from defender

  This script needs the `RELAYER_API_KEY` and `RELAYER_API_SECRET` `.env` vars
- Run `yarn hardhat run --network <NETWORK> scripts/claimRevoke/parseTxs.ts` to verify, expect an empty array as
  response