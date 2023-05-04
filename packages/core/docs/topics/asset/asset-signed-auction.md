---
description: AssetSignedAuction
---

# AssetSignedAuction

## Introduction

The primary function of the Asset Signer Auction is to allow user to claim auction offers. Users can claim the offers with native tokens or custom ERC20 tokens. Different types of signatures are supported.

## Process

- Seller mints an asset
- Seller creates an auction of the minted asset
- Seller should Approve AssetSignedAuction's contract address in the Asset's contract.
- Buyer won the auction and receives the asset
- Seller claims his offer

```plantuml
title sequence diagram

actor Seller
actor Buyer
entity Backend
entity AssetSignedAuctionAuth
entity ERC1155ERC721
entity AssetV2
entity IERC20
entity ERC1271
entity ERC1654

== Mint Asset ==
Seller -> Backend : Create a new asset
Backend -> ERC1155ERC721 : Mint()

== Create and Run the Auction ==
Seller -> Backend: Create auction
Buyer -> Backend: Bid
Buyer <- Backend: Had the winning bid

== Claim the seller offer ==
Seller -> Backend: Claim the seller offer
Backend -> ERC1155ERC721:setApprovalForAll(auctioncontractaddress, true)
Backend -> AssetSignedAuctionAuth:claimSellerOffer(..., auctionData, ...)
AssetSignedAuctionAuth -> ERC1271:isValidSignature(data,signature)
AssetSignedAuctionAuth -> ERC1654:isValidSignature(data,signature)
AssetSignedAuctionAuth -> IERC20:transferFrom(buyer,seller,offer)
AssetSignedAuctionAuth -> AssetV2:safeBatchTransferFrom(...)
Backend<-AssetSignedAuctionAuth:emit event **OfferClaimed**(..., auctionData, purchase, ...)

```

## Model

### 1. Set Fee

Only admin can set fee parameters. Admin is determined while deploying the contract.

### 2. Claim Seller Offer

Claim offer using EIP712. The other claim functions are used to claim the offer with different types of signatures.

### 3. Cancel Seller Offer

Cancel a offer previously signed. New offers will need to use a id not used yet.

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

## Feature of the contract

| Feature                 | Link                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                | [AssetSignedAuctionAuth.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/asset/AssetSignedAuctionWithAuth.sol) |
| MetaTransactionReceiver | Yes                                                                                                                                               |

