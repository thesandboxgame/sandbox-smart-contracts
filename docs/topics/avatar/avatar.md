---
breaks: false

description: Avatar design

---

# Avatar:

This document covers the following contracts:

- [Avatar Smart contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/avatar/Avatar.sol)
- [Avatar Sale contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/avatar/AvatarSale.sol)
- [Polygon Avatar contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/avatar/Avatar.sol)

## Introduction

Avatar is an ERC721 standard NFT without metadata (the url has a fixed part + token Id). All the metadata information is
stored in our servers.|

Avatars can only be minted (sold) on polygon (L2) via an eip2771 compatible message signed by a whitelisted set of
signers (usually our backend). The sellers are also whitelisted and the buyer must pay the Avatar in Sand.

On ethereum (L1)  the avatar NFT contract exists but the only way to send an avatar to L1 is to transfer it from polygon
via the matic bridge.

## Model

|                     Feature | Description                                                                  |
|----------------------------:|:-----------------------------------------------------------------------------|
|                 ERC-721 NFT | https://eips.ethereum.org/EIPS/eip-721                                       |
|                 Upgradeable | Yes                                                                          |
|                      MetaTX | https://eips.ethereum.org/EIPS/eip-2771                                      |

### Participants

- Seller: The user that creates an avatar and want to sell it.
- Buyer: A user that wants to buy an avatar.
- Signer: Usually our backed or any authorized agent that can sign sell messages

### Assets

- Avatar: NFT representing the ownership of an Avatar in the system.
- Sand: This is a fungible token ([ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible) that is used in the
  platform to pay for avatars.

### External agents

- Sand Token SC: This is the [ERC20](https://eips.ethereum.org/EIPS/eip-20) smart contract that do the accounting of the
  Sand token.

## Process

### Sale

The seller creates the avatar in the backend: drawings, properties, etc. When a buyer wants to buy the avatar he
connects to the backend and asks for a buying authorization. The backend respond with a signed message that contains the
following:

```plantuml
class BuyMessage {
  address signer,
  address buyer,
  uint256 id,
  address seller,
  uint256 price
  -- signature --
  uint8 v,
  bytes32 r,
  bytes32 s
}

```

The buyer then calls the execute method of the AvatarSale smart contract. If everything is right the avatar is minted.

```plantuml
title Avatar Sale

actor Seller
actor Buyer
actor "TSB backend"
participant SandToken
participant AvatarSaleSC
participant AvatarSC

"Seller" -> "TSB backend": Creates an avatar Image, etc
note over "TSB backend": Generate an avata uinique Id.

"Buyer" -> "TSB backend": wants to by an Avatar, ask for a buy message
"TSB backend" -> "Buyer": return the signed buy message
"Buyer" -> "SandToken": approve a transfer from the avatar sale SC
"Buyer" -> "AvatarSaleSC": call execute()
activate AvatarSaleSC
note over AvatarSaleSC: verify signature
"AvatarSaleSC" -> "SandToken": call transferFrom(from:Buyer, to:AvatarSaleSC)
"AvatarSaleSC" -> "Seller": Send the sand
"AvatarSaleSC" -> "AvatarSC": mint the avatar
"AvatarSC" -> "Buyer": gets the avatar in his wallet
deactivate AvatarSaleSC

```

# Emitted Events Pos Bridge

```plantuml
title Avatar Emitted events
skinparam participant {
BackgroundColor<<L1>> Gold
BackgroundColor<<L2>>  LimeGreen
BackgroundColor<<PL1>> Yellow
BackgroundColor<<PL2>> YellowGreen
}


actor User
participant AvatarSale <<L2>>
participant AvatarL2 <<L2>>
participant AvatarL1 <<L1>>
participant RootChainManager <<PL1>>
participant RootChain <<PL1>>
participant ChildChainManager <<PL2>>
participant StateReceiver <<PL2>>
participant MintableERC721Predicate <<PL1>>

group Mint
User -> AvatarSale: execute()
AvatarSale -> AvatarL2: batchMint()
hnote over AvatarL2 #lime: MintedBatch(to, tokenIds)
end

group Move from L2 to L1
User -> AvatarL2: withdraw()
hnote over AvatarL2 #lime: Withdrawn(user, tokenId)
AvatarL2 -> AvatarL2: burn return txHash
PolygonServer -> RootChain: submitHeaderBlock(data,sigs)
hnote over RootChain: NewHeaderBlock(start, end)
User -> RootChainManager: exit(txHash)
RootChainManager -> MintableERC721Predicate: exitTokens(sender,rootToken,logRLPList)
MintableERC721Predicate -> AvatarL1: mint(user, tokenId) 
hnote over AvatarL1 #lime: Transfer(address(0), to, tokenId);
end

group Move from L1 to L2
User -> AvatarL1: approve()
User -> RootChainManager: depositFor(user,rootToken,depositData)
RootChainManager -> MintableERC721Predicate: lockTokens(depositor,depositReceiver,rootToken,depositData)
hnote over MintableERC721Predicate: LockedMintableERC721(depositor, depositReceiver, rootToken, tokenId)
hnote over MintableERC721Predicate: LockedMintableERC721Batch(depositor, depositReceiver, rootToken, tokenIds)
MintableERC721Predicate -> AvatarL1: transfer(user, MintableERC721Predicate, tokenId)
hnote over AvatarL1 #lime: Transfer(user, polygonPredicate, tokenId);
MintableERC721Predicate -> RootChainManager
hnote over RootChainManager:  StateSynced(id,contractAddress,data)
PolygonServer -> StateReceiver: commitState(syncTime,recordBytes)
StateReceiver -> ChildChainManager: onStateReceive(_, data)
ChildChainManager -> AvatarL2: deposit(user, depositData)
hnote over AvatarL2 #lime: Deposit(from, tokenId);
end

```
