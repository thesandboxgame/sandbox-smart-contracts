---
description: AssetSignedAuction
---

# AssetSignedAuction

## Introduction

The primary function of the Asset Signer Auction is to allow user to claim auction offers. Users can claim the offers with native tokens or custom ERC20 tokens. Different types of signatures are supported.

## Model

| Feature                 | Link                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                | [AssetSignedAuctionAuth.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetSignedAuctionAuth.sol) |
| MetaTransactionReceiver | Yes                                                                                                                                               |

### Class diagram

```plantuml
title class diagram
class MetaTransactionReceiver {}
class AssetV2 {}
class ERC1155ERC721 {}
interface IERC20 {}
interface ERC1271{}
interface ERC1654 {}
class AssetSignedAuctionAuth {
    + setFee(...)
    + claimSellerOffer(...)
    + claimSellerOfferViaEIP1271(...)
    + claimSellerOfferViaEIP1654(...)
    + claimSellerOfferUsingBasicSig(...)
    + claimSellerOfferUsingBasicSigViaEIP1271(...)
    + claimSellerOfferUsingBasicSigViaEIP1654(...)
    + cancelSellerOffer(...)
}


MetaTransactionReceiver <|-- AssetSignedAuctionAuth
AssetV2 <|-- AssetSignedAuctionAuth
ERC1155ERC721 <|..AssetSignedAuctionAuth
IERC20 <|-- AssetSignedAuctionAuth
ERC1271 <|-- AssetSignedAuctionAuth
ERC1654 <|-- AssetSignedAuctionAuth
```

## Claiming a seller Offer

```plantuml
entity ERC1155ERC721
entity AssetSignedAuctionAuth
entity AssetV2
entity IERC20
entity ERC1271
entity ERC1654


->ERC1155ERC721:mint(..., packId=1, supply=20, rarity=0, ...)
->ERC1155ERC721:setApprovalForAll(auctioncontractaddress, true)
->AssetSignedAuctionAuth:claimSellerOffer(..., auctionData, ...)
AssetSignedAuctionAuth->ERC1271:isValidSignature(data,signature)
AssetSignedAuctionAuth->ERC1654:isValidSignature(data,signature)
AssetSignedAuctionAuth->IERC20:transferFrom(buyer,seller,offer)
AssetSignedAuctionAuth->AssetV2:safeBatchTransferFrom(...)
<-AssetSignedAuctionAuth:emit event **OfferClaimed**(..., auctionData, purchase, ...)

```
