---
description: Claiming an ASSET
---

# How to claim an ASSET

## Requirements

If you haven't done it, follow the [getting started](../intro/index.md) tutorial first.

## Obtaining the ASSET to claim

There are two ways to obtain the ASSET, one is creating a genesis assets through the command line

```shell
yarn execute rinkeby scripts/transact/connected_mintGenesisAsset.ts
```

The script will output a json where you can find the token id

```json
{
  "from": "0x0000000000000000000000000000000000000000",
  "to": "0xa4519D601F43D0b8f167842a367465681F652252",
  "id": "74323507945526641635977002777803291354030065309481262884217564584542581295104",
  "quantity": "20000"
}
```

And the other one is minting an ASSET using the dashboard

- upload and mint an asset using VE
- copy the token id

## Obtaining the addresses

### Rinkeby

For testing purposes, ask the addresses to whoever is going to test it.

### Mainnet

For mainnet, The list of addresses should come from the output of a certain reward requirements

## Deploying the contract

Once we have the pre-proof generated with the tokenId and addresses, we can deploy the contract
