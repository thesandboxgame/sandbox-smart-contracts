# Audience

Documentation is oriented for auditors, internal developers and external developer contributors.

# Features

The "MisteryBox" contract allows the contract owner to perform multiple safe transfers of ERC721 and ERC1155 tokens.

# Methods

Contract functions should respect [order-of-functions solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html#order-of-functions)

----

```Solidity
function safeBatchTransferFrom(
    TransferData[] memory transfers
) external onlyOwner
```
The safeBatchTransferFrom() function is designed to be executed only by the contract owner to perform multiple safe transfers. Within the function, it iterates through all transfers in the array and validates the sender and receiver addresses and the contract type. If the contract type is ERC721, it requires the amount to be one and uses the safeTransferFrom() function of the ERC721 contract to perform the transfer. If the contract type is ERC1155, it requires the amount to be greater than or equal to 1 and uses the safeTransferFrom() function of the ERC1155 contract to perform the transfer.
* `transfers`: an array of "TransferData" data structures. Each "TransferData" structure contains information about the token transfer, including the contract type (ERC721 or ERC1155), the contract address, the sender and receiver addresses, the token ID, and the transfer amount.

# Links

Deployment scripts for contracts extending `MisteryBox.sol` are found in [deploy/](../../../deploy/) (anything with `*_mistery_box_*` in the name).

Testing scripts are found, for each extending contract, in [test/misteryBox/](../../../test/misteryBox/) 
