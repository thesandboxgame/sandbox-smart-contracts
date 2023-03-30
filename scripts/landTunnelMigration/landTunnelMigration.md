# Land Tunnel migration

## Introduction

This migration is about moving from bugged version of fx-portal to a new version. We also added proxies to mitigate future fx-portal bugs. The following are the steps to migrate to the new tunnels

## Migration process

### Social media

Announce the tunnels pause on social media (+FE)

### Pause the old tunnels

- Pause the old tunnels on ethereum by calling the pause function on `0x03c545163bd114D756c65DDA1D97D37b89dA2236`

- Pause the old tunnels on polygon by calling the pause function on `0xCd1C7C85113b16A5B9e09576112d162281b5F860`

And wait for the all the current transfers to be checkpointed

### Deploy the operator filter subscription contract

- On ethereum
```shell
yarn deploy mainnet --tags OperatorFilterSubscription
```

- On polygon
```shell
yarn deploy polygon --tags OperatorFilterSubscription
```

### Upgrade land contracts

- On ethereum
```shell
yarn deploy mainnet --tags LandV3
```

- On polygon
```shell
yarn deploy polygon --tags PolygonLandV2
```

### Deploy new tunnels

- On ethereum
```shell
yarn deploy mainnet --tags LandTunnelV2
```

- On polygon
```shell
yarn deploy polygon --tags PolygonLandTunnelV2
```

### Deploy migration contracts

- On ethereum
```shell
yarn deploy mainnet --tags LandTunnelMigration
```

- On polygon
```shell
yarn deploy polygon --tags PolygonLandTunnelMigration
```

### Super operator roles

Call `setSuperOperator` to enable the role on the migration contract addresses on both ethereum & polygon

### Generate LAND snapshots

```
tunnel-mainnet.json
```

```
tunnel-polygon.json
```

### Split LAND IDs

```shell
npx ts-node ./scripts/utils/splitLandIdsForTunnelMigration.ts
```

### Load LandTunnelV2 contracts on the backend database with sync disabled

### Migrate the LANDs to the new tunnel on mainnet

This script takes the files containing Land ands quads on the old Land Tunnel on mainnet and transfers them to new Land Tunnel which we deployed on mainnet using migration contract.

```shell
yarn execute mainnet ./scripts/transact/migrateTunnelLandOnL1.ts
```

### Withdraw locked LANDs to their owners

This script takes the common Land on both polygon and mainnet the old Land Tunnels and migrate common Land on old polygon Land Tunnel and first migrate them to migration contract on polygon and with draw those Land back on mainnet to their designated owners. This is done through migration contract on polygon.

```shell
yarn execute polygon ./scripts/transact/migrateAndWithdrawTunnelLandOnL2.ts {Old land tunnel's address} {Block number when the old land tunnel was deployed}
```

### Migrate the LANDs to the new tunnel on polygon

This scripts Takes uinque Land and quads present on Old polygon Land Tunnel and migrate it to new polygon Land Tunnel using migration contract. Input file land id on tunnels config

```shell
yarn execute polygon ./scripts/transact/migrateTunnelLandOnL2.ts
```

### Remove minter role from the old tunnels

### Remove Super Operator role from migration contracts

### Migration validation

Validate that the old tunnels don't own any land anymore

### Change LandTunnelV2 createdAtBlock to a block after the migration

### Enable sync for LandTunnelV2 contract on the backend

### Enable feature flag (In case of release)
