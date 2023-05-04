---
breaks: false

description: Bundle Sand Sale contract description

---

# [Bundle Sand Sale Smart contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/bundleSandSale/PolygonBundleSandSale.sol)

## Introduction

This contract is used to sell *packs* of *collectibles* plus *sand* in one transaction.

There is only one seller (named receiving wallet in the smart contact) that is defined during the contract deployment
and can only be changed by the admin of the contract.

The seller must deposit the packs to sell in the smart contract by transferring enough *collectibles* and *sand*. Each
deposit can create a bunch of *packs* in batch.

After that buyers can buy the packs paying in ETH or DAI.

## Model

|                     Feature | Description                                                                  |
|----------------------------:|:-----------------------------------------------------------------------------|
|     ERC-1155 Token Receiver | https://eips.ethereum.org/EIPS/eip-1155#erc-1155-token-receiver              |
|                 Upgradeable | No                                                                           |
|                   WithAdmin | [eip-173](https://eips.ethereum.org/EIPS/eip-173) like                       |

### Participants

- Seller: The user that wants to sell *packs*
- Buyer: Users that want to buy *packs*
- Admin: The deployer and owner of the contract.

### Assets

- Collectibles: ERC1155ERC721 ([ERC721](https://eips.ethereum.org/EIPS/eip-721)
  and [ERC1155](https://eips.ethereum.org/EIPS/eip-1155)) assets that are NFTs or fungible tokens. This kind of assets
  represent collectible items inside the game.
- Sand: This is a fungible token ([ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible) that is used in the platform to pay for assets and transactions.
- DAI: This represents a stable coin that is pegged one to one with the USD dollar.

### External agents

- SandSC: This is the [ERC20](https://eips.ethereum.org/EIPS/eip-20) smart contract that do the accounting of the Sand token.
- AssetSC: This is the smart contract do the accounting of the ERC1155ERC721 collectibles.
- DaiSC: This is the [ERC20](https://eips.ethereum.org/EIPS/eip-20) smart contract that do the accounting of the DAI token.
- MedianizerSC: A [Maker Dao compatible](https://etherscan.io/address/0x729D19f657BD0614b4985Cf1D82531c67569197B#code)
  smart contract used to get the price relationship between USD and ETH.

### Sale

Each sale in the smart contract represents a set of packs that can be sold. Each pack contains Collectibles and Sand.
All the packs inside the same Sale are equal but each one can be bought separately until the sale is empty and has no
more packs.

```plantuml
class Sale {
saleID
==
ids
amounts
__
sandAmount
__
priceUSD
__
numPacksLeft
}
entity Packs {
numPacks
}
entity Collectibles {
id
amount
}
entity Sand {
amount
}

Sale "1" *-- "many" Packs
Packs "1" *-- "many" Collectibles
Packs "1" *-- "many" Sand
```

## Process

### Seller deposits the packs

The seller must start by approving a transfer of *sand* (in the *sand smart contract*) and then calling the *asset smart
contract* to transfer the corresponding *collectibles* to the *bundle sand sale smart contract*.

In the transfer call the data field must have (abi encoded) three important parameters:

- ***numPacks***: Number of packs to build. The ***value*** field of the transfer, the amount of *collectibles*
  transferred, will be divided by numPacks, so it must be divisible without any remainder.
- ***sandAmountPerPack***: The amount of sand that will be sold with each pack. All the packs created in each deposit
  will have the same amount of *sand* assigned to it. The seller must approve a transfer of enough *sand* from his
  wallet to the address of the *bundle sand sale smart contract* (aka: `numPacks * sandAmountPerPack`).
- ***priceUSDPerPack***: This is the price in USDs for each pack. The user can buy directly with DAI in which case the
  contract assume a one to one relationship between DAI with USD or with ETH in which case a Chainlink compatible
  medianizer is used to get the USD/ETH price.

```plantuml
actor Seller
participant SandSC
participant AssetSC
participant BundleSandSaleSC
collections Packs

"Seller" -> "SandSC": allow the withdrawal of sand to BundleSandSaleSC  
"Seller" -> "AssetSC": transfer his collectibles to BundleSandSaleSC
"AssetSC" -> "BundleSandSaleSC": gets the collectibles and a call to onERC1155Received()
activate BundleSandSaleSC
"BundleSandSaleSC" -> "SandSC": transferFrom()
"SandSC" -> "BundleSandSaleSC": send the Sand
"BundleSandSaleSC" -> "Packs": Packs are created and ready to sell
deactivate BundleSandSaleSC
```

### User buys a pack with DAI

To buy packs with DAI a user must start by approving the transfer of DAI in the *DaiSC* from his wallet to the
*BundleSandSale smart contract* and then call the `buyBundleWithDai` function choosing which pack to buy with the sellId
parameter, the quantity of packs and the destination address (a user can buy for somebody else).

```plantuml
actor Buyer
actor Seller
participant DaiSC
participant BundleSandSaleSC
collections Packs

"Buyer" -> "DaiSC": allow the withdrawal of DAI to BundleSandSaleSC  
"Buyer" -> "BundleSandSaleSC": call buyBundleWithDai()
activate BundleSandSaleSC
note over BundleSandSaleSC: check availability and balances
"BundleSandSaleSC" <-> "Packs": Discount the packs
"BundleSandSaleSC" -> "DaiSC": transferFrom()
"DaiSC" -> "Seller": seller gets the DAI
"BundleSandSaleSC" -> "Buyer": buyer gets his sand and collectibles
deactivate BundleSandSaleSC
```

### User buys a pack with ETH

The process of buying with ETH is pretty similar to the process of buying with DAI the differences are the buyer sends
directly the ETH to the *bundle sand sale smart contract* and the price of ETH is converted to usd using the
*medianizer*.

```plantuml
actor Buyer
actor Seller
participant DaiSC
participant Medianizer
participant BundleSandSaleSC
collections Packs

"Buyer" -> "BundleSandSaleSC": call buyBundleWithETH() sending the ETH in the transaction
activate BundleSandSaleSC
"BundleSandSaleSC" -> "Medianizer": Ask for the price of ETH in USD
"Medianizer" -> "BundleSandSaleSC": Return the price of ETH in USD
note over BundleSandSaleSC: check availability and balances
"BundleSandSaleSC" <-> "Packs": Discount the packs
"BundleSandSaleSC" -> "Seller": seller gets the ETH
"BundleSandSaleSC" -> "Buyer": buyer gets his sand and collectibles
deactivate BundleSandSaleSC
```

### Admin withdrawn

The *admin* can decide to withdraw a sale and send it to any destination at any moment. All the packs inside the
withdrawn sale can not be sold anymore.

```plantuml
actor Admin
actor Recipient
participant BundleSandSaleSC

"Admin" -> "BundleSandSaleSC": call withdrawSale()
note over BundleSandSaleSC: check permission and availability
"BundleSandSaleSC" -> "Recipient": The destination address gets the Sand and Assets
```
