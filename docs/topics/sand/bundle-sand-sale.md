---
breaks: false

description: Bundle Sand Sale contract description

---

# Bundle Sand Sale

## Introduction

This contract is used to sell *packs* of *collectibles* plus *sand* in one transaction.

There is only one seller (named receiving wallet in the smart contact) that is defined during the contract deployment
and can only be changed by the admin of the contract.

The seller must deposit the packs to sell in the smart contract by transferring enough *collectibles* and *sand*. Each
deposit can create a bunch of *packs* in batch.

After that buyers can buy the packs paying in ETH or DAI.

## Model

### Participants

- Seller: The user thats want to sell *packs*
- Buyer: Users that want to buy *packs*
- Admin: The deployer and owner of the contract.

### Assets

- Collectibles: ERC1155ERC721 assets that are NFTs or fungible tokens. This kind of assets represent collectible items
  inside the game.
- Sand: This is a fungible token (ERC20 compatible) that is used in the platform to pay for ssets and transactions.
- DAI: This represents a stable coin that is pegged one to one with the U$S dollar.

### External agents

- SandSC: This is the ERC20 smart contract that do the accounting of the Sand token.
- AssetSC: This is the smart contract do the accounting of the ERC1155ERC721 collectibles.
- DaiSC: This is the ERC20 smart contract that do the accounting of the DAI token.
- MedianizerSC: A Chainlink compatible smart contract used to get the price relationship between U$S and ETH.

### Sale

Each sale in the smart contract represent a set of packs that can be sold. Each pack contains Collectibles and Sand. All
the packs inside the same Sale are equal but each one can be bought separately until the sale is empty and has no more
packs.

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
participant BundleSansSaleSC
collections Packs

"Seller" -> "SandSC": allow the withdrawal of sand to BundleSansSaleSC  
"Seller" -> "AssetSC": transfer his collectibles to BundleSansSaleSC
"AssetSC" -> "BundleSansSaleSC": gets the collectibles and a call to onERC1155Received()
activate BundleSansSaleSC
"BundleSansSaleSC" -> "SandSC": transferFrom()
"SandSC" -> "BundleSansSaleSC": send the Sand
"BundleSansSaleSC" -> "Packs": Packs are created and ready to sell
deactivate BundleSansSaleSC
```

### User buys a pack with DAI

To buy packs with DAI a user must start by aproving the transfer of DAI in the *DaiSC* from his wallet to the *
bundleSandSale smart contract* and then call the `buyBundleWithDai` function choosing which pack to buy with the sellId
parameter, the quantity of packs and the destination address (a user can buy for somebody else).

```plantuml
actor Buyer
actor Seller
participant DaiSC
participant BundleSansSaleSC
collections Packs

"Buyer" -> "DaiSC": allow the withdrawal of DAI to BundleSansSaleSC  
"Buyer" -> "BundleSansSaleSC": call buyBundleWithDai()
activate BundleSansSaleSC
note over BundleSansSaleSC: check availability and balances
"BundleSansSaleSC" <-> "Packs": Discount the packs
"BundleSansSaleSC" -> "DaiSC": transferFrom()
"DaiSC" -> "Seller": seller gets the DAI
"BundleSansSaleSC" -> "Buyer": buyer gets his sand and collectibles
deactivate BundleSansSaleSC
```

### User buys a pack with ETH

The process of buying with ETH is pretty similar to the process of buying with DAI the differences are the buyer sends
directly the ETH to the *bundle sand sale smart contract* and the price of ETH is converted to u$s using the *
medianizer*.

```plantuml
actor Buyer
actor Seller
participant DaiSC
participant Medianizer
participant BundleSansSaleSC
collections Packs

"Buyer" -> "BundleSansSaleSC": call buyBundleWithETH() sending the ETH in the transaction
activate BundleSansSaleSC
"BundleSansSaleSC" -> "Medianizer": Ask for the price of ETH in U$S
"Medianizer" -> "BundleSansSaleSC": Return the price of ETH in U$S
note over BundleSansSaleSC: check availability and balances
"BundleSansSaleSC" <-> "Packs": Discount the packs
"BundleSansSaleSC" -> "Seller": seller gets the ETH
"BundleSansSaleSC" -> "Buyer": buyer gets his sand and collectibles
deactivate BundleSansSaleSC
```

### Admin withdrawn

The *admin* can decide to withdraw a sale and send it to any destination at any moment. All the packs inside the
withdrawn sale can not be sold anymore.

```plantuml
actor Admin
actor SomeDestinatioAddress
participant BundleSansSaleSC

"Admin" -> "BundleSansSaleSC": call withdrawSale()
note over BundleSansSaleSC: check permission and availability
"BundleSansSaleSC" -> "SomeDestinatioAddress": The destination address gets the Sand and Assets
```
