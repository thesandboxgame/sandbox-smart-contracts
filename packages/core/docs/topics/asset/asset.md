---
description: Asset
---

# Asset

## Introduction

Assets are entities designed to provide contents to [games](https://sandboxgame.gitbook.io/the-sandbox/games/designing-and-publishing-games) published by the community.
An asset can be NPC, animals, equipment, wearable, art...
Learn [more](https://sandboxgame.gitbook.io/the-sandbox/assets/what-are-assets) about Assets in The Sandbox.

Assets:
![](https://miro.medium.com/max/1050/1*v6OhiceA3tFNXXdbcMXd0w.png)

ASSET is a smart contract token implementation of both [EIP-1155](https://eips.ethereum.org/EIPS/eip-1155) (for limited editions tokens) and [EIP-721](https://eips.ethereum.org/EIPS/eip-721) (for non fungible, unique tokens). See [ERC155721](../token/ERC1155721.md).

Each token represents an asset created by a user of the community. It is a permission-less implementation of EIP-1155 and EIP-721 where every user can mint their own token represented via metadata.

## Model

| Feature            | Link                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract           | [AssetV2.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetV2.sol)                                     |
| ERC1155ERC721      | [ERC1155ERC721.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/ERC1155ERC721.sol)                         |
| ERC2771 (Meta-Tx)  | [Custom Sandbox contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/common/BaseWithStorage/ERC2771Handler.sol) |
| WithSuperOperators | Yes                                                                                                                                                     |

### Class diagram

```plantuml
title class diagram
class AssetV2 {
    + mintBatch(...)
}
class ERC1155ERC721 {
    +mint(...)
    +mintMultiple(...)
    +safeTransferFrom(...)
    +safeBatchTransferFrom(...)
    +setApprovalForAll(...)
    +burnFrom(...)
    +balanceOf(...)
    +ownerOf(...)
}
class WithSuperOperators {}
class WithAdmin {}
interface IERC1155 {}
interface IERC721{}
class ERC2771Handler {}

ERC1155ERC721 <|-- AssetV2
WithSuperOperators <|-- ERC1155ERC721
IERC1155 <|..ERC1155ERC721
IERC721 <|..ERC1155ERC721
ERC2771Handler<|-- ERC1155ERC721
WithAdmin<|--WithSuperOperators
```
