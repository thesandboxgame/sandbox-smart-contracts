# TransferManager

## Introduction

After an exchange has been validated between two parties, the
[Exchange](Exchange.md) contract relies on the
[TransferManager](../contracts/TransferManager.sol) contract to handle the
preparation of the fees, royalties and asset transfers of the two orders of the
exchange.

## Features

### Transfers

The main functionality of this contract is to prepare the transfers of 2 orders.
The contract is not responsible for the accuracy of the assets traded, it also
trusts the inputs to apply the fees to one side.

### Fees & Royalties

One side can be declared as the fee (and royalties) payer.

The contract supports the
[IRoyaltyUGC](../../dependency-royalty-management/contracts/interfaces/IRoyaltyUGC.sol)
interface in order to define the protocol [fee](Exchange.md#fees) (primary
market or secondary).

The contract delegates the retrieval of the royalties to the
[RoyaltiesRegistry](RoyaltiesRegistry.md) contract.

Once the calculations of the fees are done, the contract calls the
[TransferManager](../contracts/TransferManager.sol) contract to execute the
transfers. The TransferExecutor contract is responsible for calling the tokens
contract to transfer the assets accordingly to the type of token (supports
ERC20, ERC1155, ERC721).

### Payouts

In the same fashion, once fees & royalties deducted, the
[payouts](Exchange.md#payouts) are transferred to their respectives receivers
through the TransferExecutor contract.

### Upgradeable

The TransferManager contract is using initializers & gaps to provide
upgradability.
