---
description: AssetAttributesRegistry
---

# AssetAttributesRegistry

## Introduction

Asset are entities which are designed with the intention to provide content to games (NPC, animals, weapons...) [More information on Asset](./asset.md).

The primary function of Asset registry is to store links between an asset and [gems and catalysts](../catalyst/catalyst.md). It has a reference to the GemsCatalystsRegistry in order to handle gems and catalysts part.
It can add a catalyst and gems or update a list of gems for an asset.

It uses a mapping variable called `_records` which uses an assetId as index and returns a struct with catalyst and an array of gems.

AssetAttributesRegistry emits **CatalystApplied** or **GemsAdded** events used by GemsCatalystsRegistry to handle attributes. See [catalyst doc](../catalyst/catalyst.md).

## Model

| Feature      | Link                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract     | [AssetAttributesRegistry.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetAttributesRegistry.sol) |
| WithUpgrader | Yes                                                                                                                                                 |
| WithMinter   | Yes                                                                                                                                                 |
| WithAdmin    | Yes                                                                                                                                                 |

### Class diagram

```plantuml
title class diagram
class WithAdmin {}
class WithMinter {}
class WithUpgrader {}
interface IAssetAttributesRegistry {}
class AssetAttributesRegistry {
    + getRecord(catalystId)
    + getAttributes(...)
    + setCatalyst(...)
    + addGems(...)
}
class GemsCatalystsRegistry {}


WithMinter <|-- AssetAttributesRegistry
WithUpgrader <|-- AssetAttributesRegistry
IAssetAttributesRegistry <|..AssetAttributesRegistry
GemsCatalystsRegistry -- AssetAttributesRegistry

WithAdmin<|-- WithMinter
WithAdmin<|--WithUpgrader
```
