---
description: AssetAttributesRegistry
---

# AssetAttributesRegistry

## Introduction

The primary function of AssetAttributesRegistry is to store links between an asset and gems and catalyst. It has a reference to the GemsCatalystsRegistry in order to handle gems and catalysts part.
It can add a catalyst and gems or update a list of gems for an asset.

It use a mapping variable called `_records` which used an assetId as index and return a struct with catalyst and an array of gems.

AssetAttributesRegistry emit **CatalystApplied** or **GemsAdded** events used by GemsCatalystsRegistry to handle attributes. See catalyst doc.

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
