# OrderValidator

## Introduction

The [OrderValidator](../contracts/OrderValidator.sol) contract is the central
security component of the exchange. It checks the validity of the orders being
traded:

- makers validity
- expiration dates
- whitelisted tokens

## Features

### Makers validity

Since anybody can execute a match between 2 orders, it's essential to check that
the makers allow this exchange, that can be done in two ways:

- if the sender is the maker, the order is considered safe
- the order has to be signed by the maker and the sender has to provide the
  signature when matching the orders

Note that the maker always has to be defined and different from address 0.

### EIP712

The contract follows the EIP712 to validate the signatures. Users must sign its
orders using the
[eth_signTypedDataV4](https://docs.metamask.io/wallet/how-to/sign-data/#use-eth_signtypeddata_v4)
function.

### ERC1271

By supporting the ERC1271, the contract allows contracts to sign orders (ie
Gnosis).

### Dates validation

A user can decide to add an expiration date to its order. That order will be
stale after the specified date.

Also a user can decide to add a starting date to its order. That order cannot be
executed before the specified date.

### Whitelists

The tokens allowed to be traded on the exchange can be whitelisted.

2 kind of whitelists exist:

- whitelist of the payment tokens (ERC20)
- whitelist of collections (ERC1155 or ERC721). Two lists are available (Sandbox
  and Partners), only one is sufficient for a collection to be allowed.

Non-ERC20 whitelists can be enable or disable separately or globally. The
whitelisting is based on the Open Zeppelin Access Control component.

### Access Control

The contract is based on Access Control to handle the whitelists with 3 roles:

- `TSB_ROLE` is the role representing the permission for a Sandbox collection to
  be traded
- `PARTNER_ROLE` is the role representing the permission for a partner
  collection to be traded
- `ERC20_ROLE` is the role representing the permission for a payment token
  (ERC20) to be traded

### Upgradeable

The OrderValidator contract is using initializers & gaps to provide
upgradability.
