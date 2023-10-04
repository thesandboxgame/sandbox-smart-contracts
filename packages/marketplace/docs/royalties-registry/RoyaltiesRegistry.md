# RoyaltiesRegistry

The job of the [RoyaltiesRegistry](../../contracts/royalties-registry/RoyaltiesRegistry.sol) contract is to retreive the royalties information for a given token necessary for the [TransferManager](../transfer-manager/TransferManager.md) to pay the royalties and complete the exchange.

The contract supports 3 types of royalties:
- ERC2981
- External provider
- Royalties By Token

Note that the royalties types will be checked in that order.

## Features

### ERC2981

The contract supports the ERC2981 standard as a main type of royalties.

### Multi Recipients

By default, the ERC2981 only handles one receiver for the royalties.
If the ERC2981 is enabled for a token, this contract will also check if the token contract supports the [multi recipient interface](../../contracts/royalties-registry/IMultiRoyaltyRecipients.sol). It means that the royalties are splitted (equally or not) among several receivers.

### External provider

By defining an external provider, the contract is able to query an external address to get the royalties information for each token. This external provider must follow the interface [IRoyaltiesProvider](../../contracts/interfaces/IRoyaltiesProvider.sol).

### Royalties By Token

The royalties for a given token contract address can be setup by the owner (Ownable) of that contract or the owner of the RoyaltiesRegistry contract and saved into the contract.

### Upgradeable

The TransferManager contract is using initializers & gaps to provide upgradability.