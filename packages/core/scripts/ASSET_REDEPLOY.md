1. check if no batchTransfer to self has already been performed

```sh
yarn mainnet:run scripts/gathering/connected_assetTransfers.ts
yarn ts-node scripts/analysis/transferToSelf.ts
```

2. gather data at a specific block

```sh
yarn ts-node scripts/gathering/getAssets.ts <blockNumber>
yarn ts-node scripts/gathering/getAssetCollections.ts <blockNumber>
yarn ts-node scripts/gathering/getAssetClaims.ts <blockNumber>
```

3. setup regeneration:

```sh
yarn ts-node scripts/gathering/assets_regeneration_tx.ts
```

4. cache contract addresses that own Assets

```sh
yarn mainnet:run scripts/gathering/connected_contract_addresses.ts
```

PERFORM REGENERATION

5. deploy contracts (this can be done earlier in the step process. can be useful to give marketplace the new contract address ahwad of time)

```sh
yarn mainnet:deploy
```

6. mint

```sh
yarn mainnet:run setup/asset_regenerate.ts
```

7. distribute

```sh
rm -Rf tmp/transfer_executed_<networkName>.json
yarn mainnet:run setup/asset_distribute.ts
```

8. deploy contract that depends on Asset:

```sh
yarn mainnet:run setup/deploy/deploy_asset_signed_auction.ts
yarn mainnet:run setup/deploy/deploy_catalyst_minter.ts
```
