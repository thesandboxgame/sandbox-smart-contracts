---
description: Bundle Sand Sale contract description
---

# Glossary

## Assets

The smart contract manage two kind of Assets:

- ERC1155ERC721 assets that are NFTs or fungible tokens that are scarce (at least in this context). Basically this kind
  of Assets represent ***collectibles***, items inside the game. In this document they will be called ***collectibles***

- Sand: This is a fungible token (ERC20 compatible) that is used in the platform to pay for Assets and transactions.

## Sale

Each sale in the smart contract represent a set of packs that can be sold. Each pack contains ***collectibles*** and ***
Sand***. All the packs inside the same Sale are equal but each one can be bought separately until the sale is empty and
has no more packs.

# The BundleSandSale.sol and PolygonBundleSandSale.sol smart contracts

The BundleSandSale smart contract is used to sell packs of ***collectibles*** plus ***Sand*** in one transaction.

There is only one seller (named receiving wallet in the smart contact) that is defined during the contract deployment
and can only be changed by the admin of the contract.

The seller must deposit the packs to sell in the smart contract by transferring enough ***collectibles*** and ***Sand***
. Each deposit can create a bunch of packs in batch.

The seller must start by approving a transfer of ***Sands*** (in the *Sand smart contract*) and then calling the *Asset
smart contract* to transfer the corresponding ***collectibles***.

In the transfer call the data field must have (abi encoded) three important parameters:

- ***numPacks***: Number of packs to build. The ***value*** field of the transfer (the amount of ***collectibles***
  transferred)
  will be divided by this number, so it must be divisible by numPacks.
- ***sandAmountPerPack***: The amount of sand that will be sold with each pack. All the packs created in each deposit
  will have the same amount of ***Sand*** assigned to it. The seller must approve a transfer of enough ***Sand*** from
  his wallet to the address of the BundleSandSale smart contract (aka: numPacks * sandAmountPerPack).
- ***priceUSDPerPack***: This is the price in USDs for each pack. The user can buy directly with DAI in which case the
  contract assumes a one to one relationship between DAI with USD or with ETH in which case a Chainlink compatible
  medianizer is used to get the USD/ETH price.

After the creation of the packs (called Sale in the smart contract) they can be bought by buyers or withdrawn by the
admin of the smart contract.
