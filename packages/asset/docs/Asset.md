# Asset Contract Documentation

This is the base Asset L2 contract that serves as an upgradeable, burnable
ERC1155 token that includes roles for minting, burning, and administration. It
includes extended functionality for managing base and token-specific URIs and
maintaining a mapping between IPFS metadata hashes and token IDs.

## IMPORTANT CONSIDERATIONS

- Asset contract allows for the reassignment of the metadata hash to a different
  token id. We rely on other contracts not to generate the same tokenId, it
  could be useful to decide whether such reassignment should be blocked directly
  in the Asset contract.
- In TokenIdUtils contract the reveal nonce is unnecessarily set to uint16 where
  uint8 would have been sufficient.

## When upgrading the contract

- There is an error in Asset documentation for burnFrom from function natspec
  documentation says “@dev Only the minter role can burn tokens“ but it should
  refer to the burner role.

## Roles in the Contract

1. **Minter**: This role can create new tokens using the `mint` or `mintBatch`
   functions.
2. **Burner**: This role can destroy tokens using the `burnFrom` or
   `burnBatchFrom` functions.
3. **Admin**: This role has broad administrative permissions including the
   ability to set URIs and change the trusted forwarder.
4. **Moderator**: This role has the ability to set URIs.

## Public Variables

1. `MINTER_ROLE` - A bytes32 value representing the role that can mint new
   tokens.
2. `BURNER_ROLE` - A bytes32 value representing the role that can burn tokens.
3. `MODERATOR_ROLE` - A bytes32 value representing the role that can set URIs.
4. `hashUsed` - A mapping from string metadata hashes to uint256 token IDs.

## Functions

### initialize

```solidity
function initialize(
    address forwarder,
    address assetAdmin,
    string memory baseUri
    address commonSubscription,
    address _manager
) external initializer
```

Initializes the contract with the specified parameters at the time of
deployment.

Parameters:

- `forwarder` - The trusted forwarder for meta-transactions.
- `assetAdmin` - The address that will be granted the DEFAULT_ADMIN_ROLE.
- `baseUri` - The base URI for the contract.
- `commonSubscription` - the address of the subscription for operator filter
- `_manager` - the address of royalty manager contract

### mint

```solidity
function mint(
    address to,
    uint256 id,
    uint256 amount,
    string memory metadataHash
) external onlyRole(MINTER_ROLE)
```

Creates a given amount of a new token with a specified ID and associates a
metadata hash with it.

Parameters:

- `to` - The address that will receive the newly minted tokens.
- `id` - The ID for the new tokens.
- `amount` - The number of new tokens to create.
- `metadataHash` - The IPFS metadata hash to associate with the new tokens.

### mintBatch

```solidity
function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    string[] memory metadataHashes
) external onlyRole(MINTER_ROLE)
```

Creates a batch of new tokens with the provided IDs and amounts and associates
metadata hashes with them.

Parameters:

- `to` - The address that will receive the newly minted tokens.
- `ids` - An array of IDs for the new tokens.
- `amounts` - An array of the number of new tokens to create for each ID.
- `metadataHashes` - An array of IPFS metadata hashes to associate with the new
  tokens.

### burnFrom

```solidity
function burnFrom(
    address account,
    uint256 id,
    uint256 amount
) external onlyRole(BURNER_ROLE)
```

Destroys a given amount of a specific token from an account.

Parameters:

- `account` - The account from which tokens will be burned.
- `id` - The ID of the token to be burned.
- `amount` - The number of tokens to burn.

### burnBatchFrom

```solidity
function burnBatchFrom(
    address account,
    uint256[] memory ids,
    uint256[] memory amounts
) external onlyRole(BURNER_ROLE)
```

Destroys a batch of tokens from an account.

Parameters:

- `account` - The account from which tokens will be burned.
- `ids` - An array of IDs for the tokens to be burned.
- `amounts` - An array of the number of tokens to burn for each ID.

### setTokenURI

```solidity
function setTokenURI(uint256 tokenId, string memory metadata) external
```

Sets a new URI for a specific token, only available to MODERATOR_ROLE.

Parameters:

- `tokenId` - The ID of the token to set the URI for.
- `metadata` - The new URI for the token's metadata.

### setBaseURI

```solidity
function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE)
```

Sets a new base URI for the contract.

Parameters:

- `baseURI` - The new base URI.

### uri

```solidity
function uri(uint256 tokenId) public view override returns (string memory)
```

Returns the full URI for a specific token, including the base URI and the
token-specific metadata URI.

Parameters:

- `tokenId` - The ID of the token to get the URI for.

### getTokenIdByMetadataHash

```solidity
function getTokenIdByMetadataHash(string memory metadataHash) public view returns (uint256)
```

Returns the token ID associated with a specific metadata hash.

Parameters:

- `metadataHash` - The metadata hash to query the token ID for.

### setTrustedForwarder

```solidity
function setTrustedForwarder(address trustedForwarder) external onlyRole(DEFAULT_ADMIN_ROLE)
```

Sets a new trusted forwarder for meta-transactions.

Parameters:

- `trustedForwarder` - The new trusted forwarder.

### setTokenRoyalties

```solidity
function setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
) external override onlyRole(DEFAULT_ADMIN_ROLE)
```

Sets token royalty i.e. the creator splitter address as EIP2981 royalty
recipient. deploys a splitter if there is none deployed for a creator. Only
admin can call it.

Parameters:

- `tokenId` - the id of the token for which the royalty is set.
- `recipient` - the royalty recipient wallet.
- `creator` - the creator of the token.

### getCreatorAddress

```solidity
function getCreatorAddress(uint256 tokenId) external pure returns (address creator)
```

Returns the creator for a token.

Parameters:

- `tokenId` - the id of the token.

### getTier

```solidity
function getTier(uint256 tokenId) external pure returns (uint8 tier)
```

Returns the tier for a token.

Parameters:

- `tokenId` - the id of the token.

### isRevealed

```solidity
function isRevealed(uint256 tokenId) external pure returns (bool)
```

Returns bool representing if the token has been revealed or not.

Parameters:

- `tokenId` - the id of the token.

### getCreatorNonce

```solidity
function getCreatorNonce(uint256 tokenId) external pure returns (uint16)
```

Returns the creator's nonce using which the token was minted.

Parameters:

- `tokenId` - the id of the token.

### getRevealNonce

```solidity
function getRevealNonce(uint256 tokenId) external pure returns (uint16)
```

Returns the reveal nonce of the token.

Parameters:

- `tokenId` - the id of the token.

### isBridged

```solidity
function isBridged(uint256 tokenId) external pure returns (bool)
```

Returns bool representing if the token has been bridged.

Parameters:

- `tokenId` - the id of the token.

### registerAndSubscribe

```solidity
function registerAndSubscribe(address subscriptionOrRegistrantToCopy, bool subscribe)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
```

Used to register and subscribe on the operator filter registry of OpenSea

Parameters:

- `subscriptionOrRegistrantToCopy` - the address of the subscription.
- `subscribe` - the bool value representing to subscribe or not.

### setOperatorRegistry

```solidity
function setOperatorRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE)
```

Used to the address of the operator filter registry

Parameters:

- `registry` - the address of the operator filter registry.

This document is essential for developers who need to understand or contribute
to the code in the future. Please make sure to keep it updated and as detailed
as possible.
