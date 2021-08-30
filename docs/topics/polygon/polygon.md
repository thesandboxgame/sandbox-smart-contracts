---
description: Polygon at Sandbox
---

# Polygon at Sandbox

## Introduction

[Polygon](https://polygon.technology/) is the [layer 2 solution](https://ethereum.org/en/developers/docs/scaling/layer-2-rollups/) adopted by The Sandbox.
Polygon is a protocol and a framework for building and connecting Ethereum-compatible blockchain networks. Aggregating scalable solutions on Ethereum and supporting a multi-chain Ethereum ecosystem.

Learn more about [Polygon development](https://docs.matic.network/docs/develop/ethereum-matic/getting-started).

In this documentation, we'll focus on the [PoS bridge](https://docs.matic.network/docs/develop/ethereum-matic/pos/getting-started/). Keep in my mind that others bridges exist, e. g. [Plasma Bridge](https://docs.matic.network/docs/develop/ethereum-matic/plasma/getting-started).

## Glossary

| Concept                                                                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1                                                                                            | The layer 1 (L1) also called root chain refers to the Ethereum network.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| L2                                                                                            | The layer 2 (L2) also called child chain refers to the Polygon network.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Root chain                                                                                    | Also called L1, the root chain refers to the Ethereum network.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Child chain                                                                                   | Also called L2, the child chain refers to the Polygon network.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Bridge                                                                                        | A bridge is basically a set of contracts that help in moving assets from the root chain to the child chain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [PoS Bridge](https://docs.matic.network/docs/develop/ethereum-matic/pos/getting-started/)     | The Proof of Stake (PoS) bridge is based on the Proof of Stake & secured by a robust set of external validators.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Root token                                                                                    | The root token refers to the contract handling the token on L1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Child token                                                                                   | The child token refers to the contract handling the token on L2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [Mapping Request](https://docs.matic.network/docs/develop/ethereum-matic/pos/mapping-assets/) | In order to activate a bridge between a root and child token, a mapping has to be submitted to Polygon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Predicate                                                                                     | The predicate refers to the contract deployed on L1 that lock & release the token during the transfer between L1 and L2. Polygon provides predicates that supports [ETH](https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/eth), [ERC20](https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc20), [ERC721](https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc721) and [ERC1155](https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc1155) but it's also possible to build a custom predicate to handle your custom contracts. |
| Mintable Assets                                                                               | When a token minted on L2 is transferred to L1, the mintable predicates can handle the minting of new tokens on L1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RootChainManager                                                                              | The RootChainManager is a contract deployed by Polygon on L1. Its purpose is to trigger the state sync mechanism of polygon after depositing an asset on the predicate contract on L1.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ChildChainManager                                                                             | The ChildChainManager is a contract on L2 triggered by the a call on the RootChainManager on L1 through the state sync mechanism. Then, the ChildChainManager calls the deposit function of the child token contract to mint the tokens on L2.                                                                                                                                                                                                                                                                                                                                                                 |
| Checkpoint                                                                                    | All transactions that occur on L2 are check-pointed to L1 in frequent intervals of time by the validators.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| State sync mechanism                                                                          | The state sync is an internal mechanism of Polygon to trigger from a call to the RootChainManager on L1, the ChildChainManager contract on L2.                                                                     |

## Transferring assets from L1 to L2

When the owner of a token wants to send his token on L2 (Polygon chain), a process of locking tokens on a contract provided by Polygon on L1 called a predicate is necessary.  
After approving the transfer of the tokens, the user calls the RootChainManager contract to trigger the transfer of the tokens on L2.
The RootChainManager interacts with the ChildChainManager contract on L2 through a state sync mechanism internal to Polygon.  
Then, the ChildChainManager calls the child token contract on L2 to deposit the tokens (minting).

More information on the lifecycle of the [PoS bridge](https://docs.matic.network/docs/develop/ethereum-matic/pos/getting-started/#steps-to-use-the-pos-bridge).

```plantuml
title Transferring assets from L1 to L2

actor Owner as owner

box "Root chain (L1)"
entity "Root token" as rootToken
entity "Predicate" as predicate
entity "RootChainManager" as rootChainManager
end box

box "Child chain (L2)"
entity "ChildChainManager" as childChainManager
entity "Child token" as childToken
end box

owner -> rootToken: approve  an amount of tokens to the predicate
predicate -> rootToken: transfer from owner & lock the tokens
owner -> rootChainManager: deposit tokens
rootChainManager -> childChainManager: State Sync mechanism
childChainManager -> childToken: deposit the tokens
childToken -> childToken: mint tokens to the owner
```

## Transferring assets from L2 to L1

When an owner of a token wants to get his token back to L1, the process is slightly different. The owner has to withdraw the token by burning the token on the child token contract on L2 and saves the transaction hash of the burning.  
Internally, the validators of Polygon submits the checkpoint including the transaction hash of the burning to the Root chain.
In the meantime, the owner submits the proof (transaction hash) of the burn to the RootChainManager on L1 by calling the exit function.  
Once the proof validated (verifies the checkpoint inclusion), The RootChainManager contract releases & refunds (or mints if it's a token minted on L2 & the bridge uses a Mintable Assets predicate) the tokens on the Root token contract.

More information on the lifecycle of the [PoS bridge](https://docs.matic.network/docs/develop/ethereum-matic/pos/getting-started/#steps-to-use-the-pos-bridge).

```plantuml
title Transferring assets from L2 to L1

actor Owner as owner

box "Child chain (L2)"
entity "ChildChainManager" as childChainManager
entity "Child token" as childToken
entity "Validators" as validators
end box

box "Root chain (L1)"
entity "Root token" as rootToken
entity "Predicate" as predicate
entity "RootChainManager" as rootChainManager
entity "RootChain" as rootChain
end box

owner -> childToken: withdraw the tokens by burning
childToken -> owner: store the transaction hash
validators -> validators: create blocks
validators -> rootChain: submit checkpoint
owner -> rootChainManager: submit the proof of burn by calling exit
rootChainManager -> rootChainManager: verifies the checkpoint inclusion
alt Mintable assets
rootChainManager -> predicate: if any, releases the locked tokens
predicate -> rootToken: refunds or mints the tokens to the owner
```

## Deployment

In order to enable a bridge between L1 and L2, some offchain & onchain steps are necessary.

On L2, we have to deploy the Child token contract that needs to include 2 functionalities: 

- deposit (to mint, when coming from L1)
- withdraw (to burn when going to L1). 

The Child token contract can be autodeployed during the mapping request by choosing a standard (ERC20, ERC721, ERC1155).  

On L1, we have to deploy the Root token contract that will be mapped during the mapping request.  
Once all the contracts deployed, you have to submit a mapping request to Polygon through [their website](https://mapper.matic.today/) to enable the bridge between the root and child token.

## Custom bridge

When your root or child token contract is not following a standard supported by Polygon predicates or you want extra steps during the transfer, you have to use a custom predicate that handles your process.

### ChainExitERC1155Predicate

A [Predicate for ERC1155 Tokens](https://github.com/maticnetwork/pos-portal/pull/77/files) that allows tokens to be in some case irrevocably burnt on L2 (locked forever on L1) and in some other case burn to be transfered back on L1.

The predicate only considers the ChainExit event, which is as follow:

```solidity
event ChainExit(address to, uint256 tokenId, uint256 amount, bytes data);
```

It will only be emitted on L2 when the token is burnt with the intent of transfering the token to L1.

It will not be emitted if the token is burnt with the intent of being permanently burnt.

(There is no incentive to allow the burn to be actualised on L1 and allowing it to be burnt on L1 introduce some unecessary complexity regarding supply. An alternative would be to still emit the event on a permanent burn and set the `to` parameter to `address(0)` but then reject such exit on L1)

The predicate will consume the event as follow :

- if `to` == `address(0)` reject the exit
- else
  - call `Asset.fromL2(tokenId, data)`
  - if balance < amount, `mint(amount - balance)`
  - transfer amount to `to`
