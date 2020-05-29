---
title: Smart Contract Reference

language_tabs: # must be one of https://git.io/vQNgJ
- javascript

toc_footers:
- <a href='https://github.com/thesandboxgame/sandbox-smart-contracts'>Smart Contract repository</a>

# includes:
# - errors

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

The example shown here can be executed from a clone of this repo :
https://github.com/thesandboxgame/sandbox-smart-contracts

# Executing scripts

> this will execute the script against mainnet.

```
yarn run:mainnet
<script file>
  ```

The repo contains all address and abi information to all our deployed contract.
Our scripts uses buidler and buidler-deploy to fetch that info automatically.

# Examples

```javascript
  const { ethers } = require("@nomiclabs/buidler");
  (async () => {
    const Land = await ethers.getContract("Land");
    const contractName = await Land.callStatic.name();
    console.log({ contractName });
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
    landTokens(where: { x: 142, y: 245 }) {
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


# Contracts ABI


































## CatalystMinter
Gateway to mint Asset with Catalyst, Gems and Sand
### Functions
### mint(address from, uint40 packId, bytes32 metadataHash, contract CatalystToken catalystToken, uint256[] gemIds, uint256 quantity, address to, bytes data)
mint common Asset token by paying the Sand fee

#### Parameters
**from:** address creating the Asset, need to be the tx sender or meta tx signer

**packId:** unused packId that will let you predict the resulting tokenId

**metadataHash:** cidv1 ipfs hash of the folder where 0.json file contains the metadata

**catalystToken:** address of the Catalyst ERC20 token to burn

**gemIds:** list of gem ids to burn in the catalyst

**to:** address receiving the minted tokens

**data:** extra data


### Events
















## EstateSale
This contract mananges the sale of our lands as Estates
### Functions
### isDAIEnabled()
return whether DAI payments are enabled

#### Returns
**whether:** DAI payments are enabled
### setETHEnabled(bool enabled)
enable/disable ETH payment for Lands

#### Parameters
**enabled:** whether to enable or disable
### isETHEnabled()
return whether ETH payments are enabled

#### Returns
**whether:** ETH payments are enabled
### isSANDEnabled()
return whether the specific SAND payments are enabled

#### Returns
**whether:** the specific SAND payments are enabled
### buyLandWithSand(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with SAND using the merkle proof associated with it

#### Parameters
**buyer:** address that perform the payment

**to:** address that will own the purchased Land

**reserved:** the reserved address (if any)

**x:** x coordinate of the Land

**y:** y coordinate of the Land

**size:** size of the pack of Land to purchase

**priceInSand:** price in SAND to purchase that Land

**proof:** merkleProof for that particular Land
### buyLandWithETH(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with ETH using the merkle proof associated with it

#### Parameters
**buyer:** address that perform the payment

**to:** address that will own the purchased Land

**reserved:** the reserved address (if any)

**x:** x coordinate of the Land

**y:** y coordinate of the Land

**size:** size of the pack of Land to purchase

**priceInSand:** price in SAND to purchase that Land

**proof:** merkleProof for that particular Land

**referral:** the referral used by the buyer
### buyLandWithDAI(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with DAI using the merkle proof associated with it

#### Parameters
**buyer:** address that perform the payment

**to:** address that will own the purchased Land

**reserved:** the reserved address (if any)

**x:** x coordinate of the Land

**y:** y coordinate of the Land

**size:** size of the pack of Land to purchase

**priceInSand:** price in SAND to purchase that Land

**proof:** merkleProof for that particular Land
### getExpiryTime()
Gets the expiry time for the current sale

#### Returns
**The:** expiry time, as a unix epoch
### merkleRoot()
Gets the Merkle root associated with the current sale

#### Returns
**The:** Merkle root, as a bytes32 hash
### getEtherAmountWithSAND(uint256 sandAmount)
Returns the amount of ETH for a specific amount of SAND

#### Parameters
**sandAmount:** An amount of SAND

#### Returns
**The:** amount of ETH
### getMaxCommisionRate()
the max commision rate

#### Returns
**the:** maximum commision rate that a referral can give
### isReferralValid(bytes signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate)
Check if a referral is valid

#### Parameters
**signature:** The signature to check (signed referral)

**referrer:** The address of the referrer

**referee:** The address of the referee

**expiryTime:** The expiry time of the referral

**commissionRate:** The commissionRate of the referral

#### Returns
**True:** if the referral is valid


### Events
























































































































































































































