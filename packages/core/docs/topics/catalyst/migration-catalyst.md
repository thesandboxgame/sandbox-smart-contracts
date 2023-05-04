---
description: CollectionCatalystMigrations
---

# CollectionCatalystMigrations

## Introduction

The primary goal of this contract is to migrate the old catalyst and gem data, to the [new version](./catalyst.md). Only the administrator of the contract is able to do a migration.

Roughly, it gets the old catalystId associate with an asset, iterates through the gems associated with this catalyst and adds all of them and the catalyst in the new [AssetAttributesRegistry](../asset/asset-attributes-registry.md).

## Model

| Feature   | Link                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract  | [CollectionCatalystMigrations.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/catalyst/CollectionCatalystMigrations.sol) |
| WithAdmin | Yes                                                                                                                                                              |

### CatalystRegistry

This contract has a reference to [CatalystRegistry](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.6/CatalystRegistry.sol). This is the old contract that track catalyst and gems. This contract is not intended to be upgraded to a new solidity compiler version. it will stay in the 0.6 directory.

### Class diagram

```plantuml
title class diagram

interface IOldCatalystRegistry
class CatalystRegistry
interface IAssetAttributesRegistry
class AssetAttributesRegistry
interface IAssetToken
class CollectionCatalystMigrations {
    + migrate(...)
    + batchMigrate(...)
    +  setAssetAttributesRegistryMigrationContract(...)
}
class WithAdmin {}
interface ICollectionCatalystMigrations

ICollectionCatalystMigrations<|..CollectionCatalystMigrations
WithAdmin<|--CollectionCatalystMigrations
IOldCatalystRegistry--CollectionCatalystMigrations

IOldCatalystRegistry<..CatalystRegistry
IAssetAttributesRegistry<..AssetAttributesRegistry
IAssetAttributesRegistry--CollectionCatalystMigrations
IAssetToken<..AssetV2
IAssetToken--CollectionCatalystMigrations
```

## Processes

### Migrate gems and catalyst in an asset

User wants to migrate the catalyst and all the gems associated with an asset.
This process can only be done by the **administrator**. The contract has to add one to each index because **all previous index were 0-based and all new are 1-based**.

```plantuml
title Migrate

actor "Contract client" as c
entity CollectionCatalystMigration as coll #green
entity OldRegistry
entity AssetAttributeRegistry
entity AssetV2



c -> coll: Migrate(assetId, oldGemIds[], blockNumber)
== Verify old catalyst exist  ==
coll -> OldRegistry:getCatalyst(assetId)
coll <-- OldRegistry:(oldExists, oldCatalystId)
== Verify old catalyst not already migrated ==
coll -> AssetAttributeRegistry:getRecord(assetId)
coll <-- AssetAttributeRegistry:exists

== Migrate ==
coll -> coll: Correct catalyst index
coll->AssetV2:collectionOf(assetId)
coll <-- AssetV2:collId
coll -> coll:Correct every gem index
coll -> AssetAttributeRegistry:setCatalystWithBlockNumber(assetId, oldCatalystId, oldGemIds, blockNumber)



```

### Results

You could find a migration [transaction](https://goerli.etherscan.io/tx/0x982a2c935af9aef364e5d03ff62a864319b3ae5d44cd2dc5331aa93b306c2b77) on goerli testnet.

You will notice that the attributes associated with the old catalyst will be different from the migrated catalyst. The reason is that the ID will change. If you use the old Id you will have the same result.

You could test your newly gems and catalyst by requesting the G&C datas in the [AssetAttributesRegistry](../asset/asset-attributes-registry.md) using the `getRecord` function with an assetId (remember that the result Ids will be incremented by 1).
