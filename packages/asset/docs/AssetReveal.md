# AssetReveal Contract Documentation

This is a solidity contract designed for managing the revealing of assets linked to previously hidden tokens. It is designed to be used in conjunction with the [Asset](./Asset.md) contract.

## Roles in the Contract

1. **DEFAULT_ADMIN_ROLE**: This role has broad administrative permissions, including the ability to set the trusted forwarder.
2. **PAUSER_ROLE**: The role with permission to pause the contract.

## Public Variables

1. `REVEAL_TYPEHASH`: The typehash for the reveal function.
2. `BATCH_REVEAL_TYPEHASH`: The typehash for the batch reveal function.
3. `INSTANT_REVEAL_TYPEHASH`: The typehash for the instant reveal function.
4. `trustedForwarder`: The address of the trusted forwarder.

## Public and External Functions

### initialize

```solidity
function initialize(
        string memory _name,
        string memory _version,
        address _assetContract,
        address _authValidator,
        address _forwarder,
        address _defaultAdmin
    ) public initializer
```

Initializes the contract with the specified parameters at the time of deployment.

Parameters:

- `_name` - The name of the contract.
- `_version` - The version of the contract.
- `_assetContract` - The address of the Asset contract.
- `_authValidator` - The address of the AuthValidator contract.
- `_forwarder` - The address of the trusted forwarder.
- `_defaultAdmin` - The address that will be granted the DEFAULT_ADMIN_ROLE.

### revealBurn

```solidity
function revealBurn(uint256 tokenId, uint256 amount) external
```

Burns an unrevealed tokens and emits an event with details needed by the backend to generate the revealed version of the token.

Parameters:

- `tokenId` - The ID of the token to burn.
- `amount` - The amount of the token to burn.

### revealBurnBatch

```solidity
 function revealBatchBurn(uint256[] calldata tokenIds, uint256[] calldata amounts) external
```

Burns a batch of unrevealed tokens and emits an event with details needed by the backend to generate the revealed version of the tokens.

Parameters:

- `tokenIds` - The IDs of the tokens to burn.
- `amounts` - The amounts of the tokens to burn.

### revealMint

```solidity
function revealMint(
        bytes memory signature,
        uint256 prevTokenId,
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        bytes32[] calldata revealHashes
    ) external
```

Uses a signature to validate the mint data and the randomly generated metadata for the revealed token.

Parameters:

- `signature` - The signature used to validate the mint data.
- `prevTokenId` - The ID of the token that hides the assets to be revealed.
- `amounts` - The amounts of each new token to mint.
- `metadataHashes` - The hashes of the metadata for each new token.
- `revealHashes` - The reveal hashes used for revealing this particular `prevTokenId`.

### revealBatchMint

```solidity
function revealBatchMint(
        bytes calldata signature,
        uint256[] calldata prevTokenIds,
        uint256[][] calldata amounts,
        string[][] calldata metadataHashes,
        bytes32[][] calldata revealHashes
    ) external
```

Uses a signature to validate the mint data and the randomly generated metadata for the revealed tokens.

Parameters:

- `signature` - The signature used to validate the mint data.
- `prevTokenIds` - The IDs of the tokens that hide the assets to be revealed.
- `amounts` - The amounts of each new token to mint for each `prevTokenId`.
- `metadataHashes` - The hashes of the metadata for each new token for each `prevTokenId`.
- `revealHashes` - The reveal hashes used for revealing each particular `prevTokenId`.

### burnAndReveal

```solidity
function burnAndReveal(
        bytes memory signature,
        uint256 prevTokenId,
        uint256 burnAmount,
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        bytes32[] calldata revealHashes
    ) external
```

Burns and reveales a token in a single transaction, only usable for tokens that allow users to choose their revealed abilities.

Parameters:

- `signature` - The signature used to validate the mint data.
- `prevTokenId` - The ID of the token that hides the assets to be revealed.
- `burnAmount` - The amount of the token to burn.
- `amounts` - The amounts of each new token to mint.
- `metadataHashes` - The hashes of the metadata for each new token.
- `revealHashes` - The reveal hashes used for revealing this particular `prevTokenId`.

### revealHashUsed

```solidity
function revealHashUsed(bytes32 revealHash) external view returns (bool)
```

Checks whether a reveal hash has been used before.

Parameters:

- `revealHash` - The reveal hash to check.

### getAssetContract

```solidity
function getAssetContract() external view returns (address)
```

Returns the address of the Asset contract.

### getAuthValidator

```solidity
function getAuthValidator() external view returns (address)
```

Returns the address of the AuthValidator contract.

### setTrustedForwarder

```solidity
function setTrustedForwarder(address _forwarder) external onlyRole(DEFAULT_ADMIN_ROLE)
```

Sets the trusted forwarder.

Parameters:

- `_forwarder` - The address of the new trusted forwarder.

## Internal Functions

### \_revealAsset

```solidity
function _revealAsset(
        uint256 prevTokenId,
        string[] calldata metadataHashes,
        uint256[] calldata amounts,
        bytes32[] calldata revealHashes
    ) internal returns (uint256[] memory)
```

Generates new tokenIds for the revealed assets and mints them to the end user.

Parameters:

- `prevTokenId` - The ID of the token that hides the assets to be revealed.
- `metadataHashes` - The hashes of the metadata for each new token.
- `amounts` - The amounts of each new token to mint.
- `revealHashes` - The reveal hashes used for revealing this particular `prevTokenId`.

### \_burnAsset

```solidity
function _burnAsset(uint256 tokenId, uint256 amount) internal
```

Verifies the burn request and burns the specified amount of the token.

Parameters:

- `tokenId` - The ID of the token to burn.
- `amount` - The amount of the token to burn.

### \_burnAssetBatch

```solidity
function _burnAssetBatch(uint256[] calldata tokenIds, uint256[] calldata amounts) internal
```

Verifies the burn request and burns the specified amounts of the tokens.

Parameters:

- `tokenIds` - The IDs of the tokens to burn.
- `amounts` - The amounts of the tokens to burn.

### \_verifyBurnData

```solidity
function _verifyBurnData(uint256 tokenId, uint256 amount) internal pure
```

Validates that the token has not been revealed yet and that the amount is greater than 0.

Parameters:

- `tokenId` - The ID of the token to burn.
- `amount` - The amount of the token to burn.

### \_hashInstantReveal

```solidity
function _hashInstantReveal(
        address recipient,
        uint256 prevTokenId,
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        bytes32[] calldata revealHashes
    ) internal view returns (bytes32 digest)
```

Hashes the data for an instant reveal creating digest for EIP712 signature.

Parameters:

- `recipient` - The address that will receive the newly minted tokens.
- `prevTokenId` - The ID of the token that hides the assets to be revealed.
- `amounts` - The amounts of each new token to mint.
- `metadataHashes` - The hashes of the metadata for each new token.
- `revealHashes` - The reveal hashes used for revealing this particular `prevTokenId`.

### \_hashReveal

```solidity
function _hashReveal(
        uint256 prevTokenId,
        uint256[] calldata amounts,
        string[] calldata metadataHashes,
        bytes32[] calldata revealHashes
    ) internal view returns (bytes32 digest)
```

Hashes the data for a reveal creating digest for EIP712 signature.

Parameters:

- `prevTokenId` - The ID of the token that hides the assets to be revealed.
- `amounts` - The amounts of each new token to mint.
- `metadataHashes` - The hashes of the metadata for each new token.
- `revealHashes` - The reveal hashes used for revealing this particular `prevTokenId`.

### \_hashBatchReveal

```solidity
function _hashBatchReveal(
        uint256[] calldata prevTokenIds,
        uint256[][] calldata amounts,
        string[][] calldata metadataHashes,
        bytes32[][] calldata revealHashes
    ) internal view returns (bytes32 digest)
```

Hashes the data for a batch reveal creating digest for EIP712 signature.

Parameters:

- `prevTokenIds` - The IDs of the tokens that hide the assets to be revealed.
- `amounts` - The amounts of each new token to mint for each `prevTokenId`.
- `metadataHashes` - The hashes of the metadata for each new token for each `prevTokenId`.
- `revealHashes` - The reveal hashes used for revealing each particular `prevTokenId`.

### \_encodeHashes

```solidity
function _encodeHashes(string[] memory metadataHashes) internal pure returns (bytes32)
```

Encodes the metadata hashes into a single bytes32 value.

Parameters:

- `metadataHashes` - The hashes of the metadata for each new token.

### \_encodeBatchHashes

```solidity
function _encodeBatchHashes(string[][] memory metadataHashes) internal pure returns (bytes32)
```

Encodes the metadata hashes into a single bytes32 value.

Parameters:

- `metadataHashes` - The hashes of the metadata for each new token for each `prevTokenId`.

### \_encodeBatchRevealHashes

```solidity
function _encodeBatchRevealHashes(bytes32[][] memory revealHashes) internal pure returns (bytes32)
```

Encodes the reveal hashes into a single bytes32 value.

Parameters:

- `revealHashes` - The reveal hashes used for revealing each particular `prevTokenId`.

### \_encodeBatchAmounts

```solidity
function _encodeBatchAmounts(uint256[][] memory amounts) internal pure returns (bytes32)
```

Encodes the amounts into a single bytes32 value.

Parameters:

- `amounts` - The amounts of each new token to mint for each `prevTokenId`.

### getRevealedTokenIds

```solidity
function getRevealedTokenIds(
        string[] calldata metadataHashes,
        uint256 prevTokenId
    ) internal returns (uint256[] memory)
```

Depending on whether the asset has been previously revealed to a given metadata hash, this function will either generate a new token ID or return the existing one.

Parameters:

- `metadataHashes` - The hashes of the metadata for each new token.
- `prevTokenId` - The ID of the token that hides the assets to be revealed.
