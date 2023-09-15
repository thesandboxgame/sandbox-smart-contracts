# Audience

Documentation is oriented internal developers and external developer contributors.

# Features

The `ERC1155Faucet` smart contract is designed to facilitate the distribution of ERC1155 tokens. This contract allows faucet owners to configure and manage their faucets, set claim periods, and establish claim limits for specific tokens.

## Contract Structure

### Events

1. `Faucet(address indexed faucet, bool enabled)`: Emitted when a faucet is enabled or disabled.
2. `Period(address indexed faucet, uint256 period)`: Emitted when the claim period for a faucet is set or updated.
3. `Limit(address indexed faucet, uint256 tokenId, uint256 limit)`: Emitted when the claim limit for a specific token in a faucet is set or updated.
4. `Claimed(address indexed faucet, address indexed receiver, uint256 tokenId, uint256 amount)`: Emitted when a user successfully claims ERC1155 tokens from a faucet.
5. `Withdrawn(address indexed faucet, address indexed receiver, uint256[] tokenIds, uint256[] amounts)`: Emitted when tokens are withdrawn from a faucet to a receiver's address.

### State Variables

- `_faucets`: A mapping to track enabled/disabled status for each faucet.
- `_periods`: A mapping to store the claim period (in seconds) for each faucet.
- `_limitsByTokenId`: A mapping to set and store claim limits for specific tokens within each faucet.
- `_lastTimestamps`: A mapping to track the last timestamp when a user claimed tokens from a faucet.
- `erc1155Token`: Address of the ERC1155 token contract.

## Functions

1. `addFaucet(address faucet, uint256 period, uint256 tokenId, uint256 limit)`: Add a new faucet with a period and limit for a specific token.
2. `removeFaucet(address faucet)`: Remove an existing faucet.
3. `setPeriod(address faucet, uint256 period)`: Set the claim period for a faucet.
4. `getPeriod(address faucet)`: Get the claim period for a faucet.
5. `setLimit(address faucet, uint256 tokenId, uint256 limit)`: Set the claim limit for a specific token in a faucet.
6. `getLimit(address faucet, uint256 tokenId)`: Get the claim limit for a specific token in a faucet.
7. `getBalance(address faucet, uint256 tokenId)`: Get the balance of a specific token in the faucet contract.
8. `canClaim(address faucet, address walletAddress)`: Check if a user can claim tokens from a faucet.
9. `withdraw(address faucet, address receiver, uint256[] tokenIds, uint256[] amounts)`: Withdraw tokens from a faucet to a receiver's address.
10. `claimBatch(address[] faucets, uint256[] tokenIds, uint256[] amounts)`: Claim multiple ERC1155 tokens from different faucets in a single call.
11. `claim(address faucet, uint256 tokenId, uint256 amount)`: Claim ERC1155 tokens from a faucet.

## Usage

- Faucet owners can add, configure, and manage their faucets using the `addFaucet`, `setPeriod`, and `setLimit` functions.
- Users can claim ERC1155 tokens from faucets using the `claim` function, subject to claim periods and limits.
- Multiple tokens from different faucets can be claimed in a single call using the `claimBatch` function.
- Faucet owners can withdraw tokens from their faucets to receivers' addresses using the `withdraw` function.

Please make sure to customize and adapt the contract and its documentation according to your specific use case.
