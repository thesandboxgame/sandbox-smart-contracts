# SandboxPasses1155Upgradeable

## Overview

**SandboxPasses1155Upgradeable** is an upgradeable ERC-1155-based smart contract
that introduces:

- **AccessControl-based** permissions for admins.
- **Supply tracking** (`ERC1155SupplyUpgradeable`), providing `totalSupply` for
  each token ID.
- **Forced burns** for admin-only removal of tokens.
- **Burn-and-mint** mechanics that allow upgrading or transforming tokens by
  burning one type to mint another.
- **EIP-2981** royalty support for per-token or default royalty distribution.
- **Preminting** functionality, allowing a specific wallet to receive an initial
  supply upon token configuration.

The contract also supports **soulbound** tokens (non-transferable tokens) by
enforcing transfer restrictions for certain token IDs.

## Roles

The contract defines two main roles:

- **DEFAULT_ADMIN_ROLE**: Provided by OpenZeppelin’s `AccessControlUpgradeable`.
  Holds the ultimate authority over role grants/revocations.
- **ADMIN_ROLE**: Custom role in this contract, used for performing
  administrative tasks (e.g., forcibly burning tokens, configuring tokens,
  setting royalties).

### Role Hierarchy

- `DEFAULT_ADMIN_ROLE` can grant/revoke any role, including `ADMIN_ROLE`.
- `ADMIN_ROLE` is intended for operational tasks and does not itself have the
  power to manage roles (unless also granted `DEFAULT_ADMIN_ROLE`).

## Errors

The contract defines custom errors to provide clearer revert messages:

- **NonTransferable(uint256 tokenId)**: Attempted transfer of a soulbound
  (non-transferable) token.
- **TokenNotConfigured(uint256 tokenId)**: Attempted operation on a token ID
  that has not been configured.
- **MaxSupplyExceeded(uint256 tokenId)**: Minting would exceed the maximum
  supply of the token.
- **BurnMintNotConfigured(uint256 burnTokenId)**: No valid burn-to-mint mapping
  found for the burned token.
- **TokenAlreadyConfigured(uint256 tokenId)**: Attempt to configure a token that
  is already configured.
- **CannotDecreaseMaxSupply(uint256 tokenId, uint256 currentSupply, uint256
  requestedSupply)**: Attempt to lower max supply below the current supply.
- **MintingNotAllowed(uint256 tokenId)**: Attempt to mint a token that was
  marked for premint only.

## Storage Layout

1. **`bytes32 public constant ADMIN_ROLE`**

   - Stores the identifier for the custom `ADMIN_ROLE`.

2. **`string public baseURI`**

   - Stores the base URI for metadata. The final token URI is
     `baseURI + tokenId + ".json"`.

3. **`mapping(uint256 => TokenConfig) public tokenConfigs`**

   - Tracks configuration details for each token ID, including max supply,
     transferability, etc.

4. **`mapping(uint256 => bool) public isTransferable`**

   - Simple mapping to track transferability for each token ID.

5. **`struct TokenConfig`**
   - Contains configuration for each token ID:
     - `bool isConfigured` – Whether the token has been configured.
     - `bool transferable` – Whether the token is freely transferable.
     - `uint256 maxSupply` – The maximum mintable supply for the token.
     - `string metadata` – An optional metadata string (not strictly enforced).
     - `uint256 burnToMintId` – Token ID that can be burned to mint this token.
     - `address premintWallet` – If set, all tokens are pre-minted to this
       address, disallowing any further minting.

## Initialization

### `constructor()`

- Disables initializers to ensure the logic contract cannot be invoked directly.
- Only relevant for the proxy upgrade pattern.

### `initialize(string memory _baseURI, address _royaltyReceiver, uint96 _royaltyFeeNumerator, address _admin, address _trustedForwarder)`

Initializes all inherited contracts, sets up roles, and configures royalty
information.

**Parameters**

- `_baseURI`: Initial base URI for metadata.
- `_royaltyReceiver`: Address to receive royalty fees.
- `_royaltyFeeNumerator`: Royalty fee in basis points (e.g., 500 = 5%).
- `_admin`: The address that will be granted `DEFAULT_ADMIN_ROLE` and
  `ADMIN_ROLE`.
- `_trustedForwarder`: Forwarder address for meta-transactions.

**Details**

- Grants `DEFAULT_ADMIN_ROLE` and `ADMIN_ROLE` to `_admin`.
- Sets the default royalty info using `_setDefaultRoyalty`.
- Stores the `_baseURI` in the contract’s `baseURI` variable.

## External Functions

### `mint(address to, uint256 tokenId, uint256 amount)`

Mints a specific amount of tokens of `tokenId` to address `to`.

- **Restrictions**:
  - The token must be configured (`isConfigured == true`).
  - Token must not have a premint wallet set (`premintWallet == address(0)`),
    otherwise minting is forbidden.
  - Cannot exceed the max supply.

### `mintBatch(address to, uint256[] memory ids, uint256[] memory amounts)`

Batch mints multiple token IDs to the same address. Similar restrictions apply
as in `mint`:

- **Checks** each token configuration and ensures the operation is valid.

### `burnAndMint(address account, uint256 burnId, uint256 burnAmount, uint256 mintId, uint256 mintAmount)`

Burns `burnAmount` tokens of `burnId` from `account` and then mints `mintAmount`
tokens of `mintId` to the same address.

- Validates that both `burnId` and `mintId` are configured.
- Ensures that `burnId` is mapped to `mintId` via `burnToMintId`.
- Checks max supply constraints for the minted token.

## Admin Functions

### `adminBurn(address account, uint256 tokenId, uint256 amount)`

Allows an `ADMIN_ROLE` holder to forcibly burn tokens from any account.

- Useful for “shutdown” or “punishment” mechanics.

### `adminBatchBurn(address account, uint256[] memory ids, uint256[] memory amounts)`

Batch version of `adminBurn`.

### `configureToken(uint256 tokenId, bool transferable, uint256 maxSupply, string memory metadata, uint256 burnToMintId, address premintWallet)`

Configures a **new** token with optional preminting to a specified wallet:

- **transferable**: Whether the token can be freely transferred.
- **premintWallet**: If non-zero, the contract mints the entire `maxSupply` to
  this address and prohibits further minting.

Throws `TokenAlreadyConfigured` if the token was previously configured.

### `updateTokenConfig(uint256 tokenId, uint256 maxSupply, string memory metadata, uint256 burnToMintId)`

Updates the configuration of an **existing** token:

- If `premintWallet` is defined, and the contract tries to increase `maxSupply`,
  it automatically mints the difference to `premintWallet`.
- Prevents decreasing `maxSupply` below the current total supply.

### `setTransferable(uint256 tokenId, bool transferable)`

Updates the transferability of a given token ID. Admins can effectively “lock” a
previously transferable token or vice versa.

### `setBaseURI(string memory newBaseURI)`

Updates the base URI for metadata; triggers an event
`BaseURISet(oldURI, newURI)`.

### Royalties

#### `setDefaultRoyalty(address receiver, uint96 feeNumerator)`

Sets the default royalty info for all tokens.

#### `setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator)`

Overrides default royalty info for a specific token ID.

## Internal Mechanics

### `_update(address from, address to, uint256[] memory ids, uint256[] memory values)`

- A hook that fires on every transfer-like operation (mint, burn, transfer).
- Reverts with `NonTransferable(tokenId)` if a user tries to transfer a
  non-transferable (soulbound) token.

### `_msgSender()` and `_msgData()`

- Overriden to integrate with `ERC2771HandlerUpgradeable` for meta-transaction
  support.

## Implementation Details

- **Inheritance**:

  1. `ERC2771HandlerUpgradeable` – Provides meta-transaction support.
  2. `AccessControlUpgradeable` – Role-based permissions.
  3. `ERC1155SupplyUpgradeable` – ERC-1155 with total supply tracking.
  4. `ERC2981Upgradeable` – Royalty standard support.

- **supportsInterface(bytes4 interfaceId)**:

  - Combines the interface checks of `AccessControlUpgradeable`,
    `ERC1155Upgradeable`, and `ERC2981Upgradeable`.

- **Soulbound Logic**:
  - The contract checks `isTransferable[tokenId]` before finalizing
    non-mint/burn transfers. If `false`, the transfer reverts.

## Usage Notes

1. **Configure First**:
   - A token ID must be configured with `configureToken()` before minting
     (unless preminted).
2. **Preminting**:
   - If `premintWallet` is provided, the contract mints `maxSupply` immediately
     and disallows normal `mint()` calls for that token.
3. **Lock & Unlock**:
   - `setTransferable()` can be used to lock or unlock a token’s transferability
     at any time, subject to an admin’s discretion.
4. **Upgrades**:
   - Because this is an upgradeable contract, admin-level controls should be
     thoroughly secured to avoid malicious upgrades.

---

**License**:  
All code is released under the
[MIT License](https://opensource.org/licenses/MIT).

---
