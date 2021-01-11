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

5. deploy contracts:

```sh
yarn mainnet:deploy
```

6. mint

```sh
yarn mainnet:run setup/asset_regenerate.ts
```

7. distribute

```sh
yarn mainnet:run setup/asset_distribute.ts
```
