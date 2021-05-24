# Lottery Script

## Run the script

The script needs to have at the same path a json file with the same name (rouleth.ts would require a rouleth.json)

The json file will contain three things

1. blockNumber: the blocknumber we use for the snapshot
2. maxWinnerNumber: the maximum number of users that can win the lottery
3. tickets: an array of register eth address for the lottery

`yarn mainnet:run scripts/rouleth/rouleth.ts`

## How the script work

The script is divided in 4 main modules.

1. main() deal with the arguments, call the other modules
2. getAddressFromGraph() query the sandbox subgraph to get the 1. addresses that owned a land at the time of the snapshot and 2. the number of lands they had
3. getAddressFromBack() retrieve from the json the list of address that the back provides us and perform verification (validity and ens resolution)
4. lottery() will randomly select winners, weighting is function of how many lands each user owned at the time of the snapshot

The script is supposed to be easy to read, each function has a little comment that explain what it's doing and I did my best to name them properly.
If you need more information, better dig in the code, this readme is supposed to be a high lvl explaination on how to use it, how it works.
