---
title: Smart Contract Reference

language_tabs: # must be one of https://git.io/vQNgJ
  - javascript

toc_footers:
  - <a href='https://github.com/thesandboxgame/sandbox-smart-contracts'>Smart Contract repository</a>

# includes:
#   - errors

search: true
---

# Introduction

Welcome to the Sandbox Smart contract documentation!

# Setting Up

> You can clone and setup the repo via the following:

```
git clone https://github.com/thesandboxgame/sandbox-smart-contracts
cd sandbox-smart-contracts
yarn
```

The example shown here can be executed from a clone of this repo : https://github.com/thesandboxgame/sandbox-smart-contracts

# Executing scripts

> this will execute the script against mainnet.

```
yarn run:mainnet <script file>
```

The repo contains all address and abi information to all our deployed contract.
Our scripts uses buidler and buidler-deploy to fetch that info automatically.

# Examples

```javascript
const {ethers} = require("@nomiclabs/buidler");
(async () => {
  const Land = await ethers.getContract("Land");
  const contractName = await Land.callStatic.name();
  console.log({contractName});
})();
```

Scripts can fetch info like shown here, but they can also write data assuming you have put your mnemonic in the `.mnemonic` file.

# GraphQL queries

```graphql
{
  alls(first: 5) {
    id
    numLands
    numLandsMinted
    numAssets
  }
  landTokens(first: 5) {
    id
    owner
    x
    y
  }
}
```

We also have examples for graphql queries against our subgraph : https://thegraph.com/explorer/subgraph/pixowl/the-sandbox

# Land GraphQL

> Get the first 5 lands

```graphql
{
  landTokens(first: 5) {
    id
    owner
    x
    y
  }
}
```

> The above command returns JSON structured like this:

```json
{
  "data": {
    "landTokens": [
      {
        "id": "100101",
        "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
        "x": 141,
        "y": 245
      },
      {
        "id": "100102",
        "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
        "x": 142,
        "y": 245
      },
      {
        "id": "100103",
        "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
        "x": 143,
        "y": 245
      },
      {
        "id": "100104",
        "owner": "0xb2299149cdd796ab78415e80e99269e3d23d9b89",
        "x": 144,
        "y": 245
      },
      {
        "id": "100105",
        "owner": "0xb2299149cdd796ab78415e80e99269e3d23d9b89",
        "x": 145,
        "y": 245
      }
    ]
  }
}
```

> Get a Specific Land via x and y

```graphql
{
  landTokens(where: {x: 142, y: 245}) {
    id
    owner
    x
    y
  }
}
```

> The above command returns JSON structured like this:

```json
{
  "data": {
    "landTokens": [
      {
        "id": "100102",
        "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
        "x": 142,
        "y": 245
      }
    ]
  }
}
```

Our GraphQL API is hosted on thegrah.com
