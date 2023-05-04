---
description: Setting environment variables
---

# Setting environment variables

## Environment variables

Copy the .env.example file
```shell
cp -a .env.example .env
```

## Wallet

In order to communicate with the blockchain, a wallet is required.
A BIP39 Mnemonic, also called a seed phrase, is a 12-word combination that is used to manipulate your wallet.

The Sandbox uses 4 different networks depending on the environment and layer (L1 or L2). Learn more about layers in this [introduction of Polygon](../topics/polygon/polygon.md).

| Environment | Network | Layer |
|-------------|---------|-------|
| mainnet | Ethereum | L1 |
| mainnet | Polygon Mainnet | L2 |
| testnet | Rinkeby | L1 |
| testnet | Goërli | L1 |
| testnet | Mumbai Testnet | L2 |

As a developer, you only need a rinkeby, mumbai & goerli wallets. The blockchain team shares the same wallet (ask the blockchain team for the seed phrase).

then, set the seed phrase:

- Rinkeby:
```shell
MNEMONIC_RINKEBY=cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry
```

- Goërli:
```shell
MNEMONIC_GOERLI=cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry
```

- Mumbai:
```shell
MNEMONIC_MUMBAI=cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry cherry
```

For the mainnet, you'll have to set your personal seed phrase on `MNEMONIC_MAINNET`.

## Infura

[Infura](https://infura.io) provides an API to access the Ethereum network.

- [create an account](https://infura.io/register) on Infura
- go the `ETHEREUM` tab and create a new project
- on the `KEYS` section, select the ENDPOINTS `Mainnet`
- copy the https URL below the ENDPOINTS
- set the ETH_NODE_URI_MAINNET, ETH_NODE_URI_RINKEBY and ETH_NODE_URI_GOERLI variables in the `.env` file
```shell
ETH_NODE_URI_MAINNET=https://mainnet.infura.io/v3/xxxxxxxxxxxxxxxx
ETH_NODE_URI_RINKEBY=https://rinkeby.infura.io/v3/xxxxxxxxxxxxxxxx
ETH_NODE_URI_GOERLI=https://goerli.infura.io/v3/xxxxxxxxxxxxxxxx
```
- the mumbai network is not available freely on infura yet, so you can use this one instead
```shell
ETH_NODE_URI_MUMBAI=https://matic-mumbai.chainstacklabs.com
```

## Etherscan

[Etherscan](https://etherscan.io/) is a Block Explorer and Analytics Platform for Ethereum, a decentralized smart contracts platform.

- [create an account](https://etherscan.io/register) on Etherscan
- [create an API Key](https://etherscan.io/myapikey)
- copy your API Key
- set the ETHERSCAN_API_KEY variable in the `.env` file
```shell
ETHERSCAN_API_KEY=xxxxxxxxxxxxxxxx
```

## Polygonscan

[Polygonscan](https://polygonscan.com/) is a Block Explorer and Analytics Platform for Polygon, a decentralized smart contracts platform.

- [create an account](https://polygonscan.com/register) on Polygonscan
- [create an API Key](https://polygonscan.com/myapikey)
- copy your API Key
- set the ETHERSCAN_API_KEY variable in the `.env` file
```shell
ETHERSCAN_API_KEY=xxxxxxxxxxxxxxxx
```

Both Etherscan & Polygonscan use the same environment variable. So depending on the network you're working on (L1 or L2), you have to switch your ETHERSCAN_API_KEY variable.

Your next step is to [develop your first feature](../tutorials/developing-first-feature.md)
