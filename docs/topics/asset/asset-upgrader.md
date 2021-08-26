---
description: AssetUpgrader
---

# AssetUpgrader

## Introduction

The primary function of the Asset upgrader is to upgrade an **asset** with new **Gems** and/or a **catalyst**. It could also transfer ownership. It uses the function exposed by [AssetAttributesRegistry](./asset-attributes-registry.md) and [GemsCatalystsRegistry](../catalyst/catalyst.md) in order to do it.

## Model

| Feature           | Link                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contract          | [AssetUpgrader.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetUpgrader.sol) |
| ERC2771 (Meta-Tx) | [OpenZeppelin contract](https://docs.openzeppelin.com/contracts/4.x/api/metatx#ERC2771Context)                                  |

### Class diagram

```plantuml
title class diagram

class ERC2771Context{}
interface IAssetUpgrader {}
class Sand {}

class AssetUpgrader {
    + extractAndSetCatalyst(...)
    + changeCatalyst(...)
    + addGems(...)

}
class GemsCatalystsRegistry {}


ERC2771Context <|-- AssetUpgrader
IAssetUpgrader <|..AssetUpgrader
AssetAttributesRegistry -- AssetUpgrader
IAssetToken -- AssetUpgrader
GemsCatalystsRegistry -- AssetUpgrader
Sand -- AssetUpgrader
```

### Change every Gem and catalyst of an ERC20 asset and change owner

The asset will be converted to an NFT(ERC721) and then be filled with a new LEGENDARY catalyst, a gem DEFENSE and a gem POWER. **In order to have gems and a catalyst, an Asset must be an NFT**.

Remember catalystId for LEGENDARY catalyst is **4** and gemsId for gem DEFENSE and gem POWER is **1** and **2** respectively. We use a fictional Asset with an Id of **42**.

```plantuml
entity AssetUpgrader
entity AssetV2
entity Sand
entity GemsCatalystsRegistry
entity AssetAttributesRegistry
->AssetUpgrader:extractAndSetCatalyst(...,asset=42,catalyst=4, gems=[1, 2],...)
AssetUpgrader->AssetV2:extractERC721From(from,42,from)
AssetV2-->AssetUpgrader:tokenId

AssetUpgrader->Gemscatalystregistry:burnCatalyst(from, Id=4, num=1)
AssetUpgrader->Gemscatalystregistry:burnDifferentGems(from, [1,2], num=1)
AssetUpgrader->Sand:transferFrom(from, feeRecipient, sandFee)
AssetUpgrader->AssetAttributesRegistry:SetCatalyst(tokenId,4, [1,2])
AssetUpgrader<- AssetAttributesRegistry:emit event **CatalystApplied**(tokenId, 4, [1,2])
AssetUpgrader->AssetV2:safeTransferFrom(from, to, tokenId)

```

### Add new Gems to an existing NFT asset

We will add a gem DEFENSE and a gem POWER. We don't change ownership so `from` = `to`.

Remember id for gem DEFENSE and gem POWER is **1** and **2** respectively. We use a fictional Asset with an Id of **42**.

```plantuml
entity AssetUpgrader
entity AssetV2
entity Sand
entity GemsCatalystsRegistry
entity AssetAttributesRegistry
->AssetUpgrader:addGems(...,asset=42,gems=[1, 2],...)

AssetUpgrader->Gemscatalystregistry:burnDifferentGems(from, [1,2], ...)
AssetUpgrader->Sand:transferFrom(from, feeRecipient, sandFee)
AssetUpgrader->AssetAttributesRegistry:addGems(42,[1,2])
AssetUpgrader<- AssetAttributesRegistry:emit event **GemsAdded**(42,[1,2])
AssetUpgrader->AssetV2:safeTransferFrom(from, to, tokenId)

```
