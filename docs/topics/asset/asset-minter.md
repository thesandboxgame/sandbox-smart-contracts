---
description: AssetMinter
---

# AssetMinter

## Introduction

The primary function of AssetMinter is to mint a new **asset** with [Gems and a catalyst](../catalyst/catalyst.md) bound to it. It uses the function exposed by the [Asset registry](./asset-attributes-registry.md) in order to do it.

## Model

| Feature           | Link                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Contract          | [AssetMinter.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetMinter.sol) |
| ERC2771 (Meta-Tx) | [OpenZeppelin contract](https://docs.openzeppelin.com/contracts/4.x/api/metatx#ERC2771Context)                              |
| WithAdmin         | Yes                                                                                                                         |

### Class diagram

```plantuml
title class diagram
class WithAdmin {}
class ERC2771Context{}
interface IAssetMinter {}

class AssetMinter {

}
class GemsCatalystsRegistry {}


WithAdmin <|-- AssetMinter
ERC2771Context <|-- AssetMinter
IAssetMinter <|..AssetMinter
AssetAttributesRegistry -- AssetMinter
IAssetToken -- AssetMinter
GemsCatalystsRegistry -- AssetMinter
```

### Mint a new asset with one LEGENDARY catalyst containing one gem DEFENSE and one gem POWER

Remember catalystId for LEGENDARY catalyst is **4** and gemsId for gem DEFENSE and gem POWER is **1** and **2** respectively.

```plantuml
entity AssetMinter
entity AssetV2

entity GemsCatalystsRegistry
entity AssetAttributesRegistry
->AssetMinter:mint(...,catalyst=4, gems=[1, 2],...)
AssetMinter->AssetV2:mint(metadata, quantity...)
AssetMinter <-- AssetV2:assetId
AssetMinter->Gemscatalystregistry:burnCatalyst(from, Id=4, num=1)
AssetMinter->Gemscatalystregistry:burnDifferentGems(from, [1,2], num=1)
AssetMinter->AssetAttributesRegistry:SetCatalyst(assetId,4, [1,2])
AssetMinter<- AssetAttributesRegistry:emit event **CatalystApplied**(assetId, 4, [1,2])

```
