---
description: Asset
---

# Asset

## Introduction

ASSET is a smart contract token implementation of both EIP-1155 (for limited editions tokens) and EIP-721 (for non fungible, unique tokens)

Each token represents the creations of our players. It is a permission-less implementation of EIP-1155 and EIP-721 where every user can mint their own token represented via metadata.

It implements both EIP-1155 and EIP-721 so player's creation lives in the same id space and can be treated equivalently by wallets or marketplaces that support both EIP. The ID contains all the data of the current token (Creator, is an NFT, number of token when minted, pack ID...).

The ERC1155ERC721 contract allow all the ERC20 and ERC721 main functions as get balance, get owner, burn, mint, batch burn, batch mint, approval...

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
