# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

## Features:

This contract is designed to allow the distribution of ERC1155 tokens from multiple faucets on testnet. Each faucet can have its own distribution settings, and only the owner can manage these faucets.

- Ability to add, enable, disable, and remove faucets.
- Customize each faucet with a distribution limit and waiting period.
- Withdraw tokens from the faucet.
- Claim tokens from the faucet.

## Structs info

### FaucetInfo

```solidity
struct FaucetInfo {
	bool isFaucet;
	bool isEnabled;
	uint256 period;
	uint256 limit;
	uint256[] tokenIds;
	mapping(uint256 => bool) tokenIdExists;
	mapping(uint256 => mapping(address => uint256)) lastTimestamps;
}
```


## Events info

### FaucetAdded

```solidity
event FaucetAdded(address indexed faucet, uint256 period, uint256 limit, uint256[] tokenIds)
```


### TokenAdded

```solidity
event TokenAdded(address indexed faucet, uint256 tokenId)
```


### FaucetStatusChanged

```solidity
event FaucetStatusChanged(address indexed faucet, bool enabled)
```


### PeriodUpdated

```solidity
event PeriodUpdated(address indexed faucet, uint256 period)
```


### LimitUpdated

```solidity
event LimitUpdated(address indexed faucet, uint256 limit)
```


### Claimed

```solidity
event Claimed(address indexed faucet, address indexed receiver, uint256 tokenId, uint256 amount)
```


### Withdrawn

```solidity
event Withdrawn(address indexed faucet, address indexed receiver, uint256[] tokenIds, uint256[] amounts)
```


## Modifiers info

### exists

```solidity
modifier exists(address faucet)
```


## Functions info

### constructor

```solidity
constructor(address owner) Ownable()
```


### getPeriod (0x6da2147b)

```solidity
function getPeriod(
    address faucet
) external view exists(faucet) returns (uint256)
```

Gets the period of a given faucet.


Parameters:

| Name   | Type    | Description                 |
| :----- | :------ | :-------------------------- |
| faucet | address | The address of the faucet.  |


Return values:

| Name | Type    | Description                                  |
| :--- | :------ | :------------------------------------------- |
| [0]  | uint256 | The waiting period between claims for users. |

### setPeriod (0x72540261)

```solidity
function setPeriod(
    address faucet,
    uint256 newPeriod
) external onlyOwner exists(faucet)
```

Sets the period of a given faucet.


Parameters:

| Name      | Type    | Description                                      |
| :-------- | :------ | :----------------------------------------------- |
| faucet    | address | The address of the faucet.                       |
| newPeriod | uint256 | The new waiting period between claims for users. |

### getLimit (0x1ce28e72)

```solidity
function getLimit(
    address faucet
) external view exists(faucet) returns (uint256)
```

Gets the limit of a given faucet.


Parameters:

| Name   | Type    | Description                 |
| :----- | :------ | :-------------------------- |
| faucet | address | The address of the faucet.  |


Return values:

| Name | Type    | Description                                            |
| :--- | :------ | :----------------------------------------------------- |
| [0]  | uint256 | The maximum amount of tokens a user can claim at once. |

### setLimit (0x36db43b5)

```solidity
function setLimit(
    address faucet,
    uint256 newLimit
) external onlyOwner exists(faucet)
```

Sets the limit of a given faucet.


Parameters:

| Name     | Type    | Description                                                |
| :------- | :------ | :--------------------------------------------------------- |
| faucet   | address | The address of the faucet.                                 |
| newLimit | uint256 | The new maximum amount of tokens a user can claim at once. |

### addFaucet (0xe2337fa8)

```solidity
function addFaucet(
    address faucet,
    uint256 period,
    uint256 limit,
    uint256[] memory tokenIds
) public onlyOwner
```

Add a new faucet to the system.


Parameters:

| Name     | Type      | Description                                                      |
| :------- | :-------- | :--------------------------------------------------------------- |
| faucet   | address   | The address of the ERC1155 token contract to be used as faucet.  |
| period   | uint256   | The waiting period between claims for users.                     |
| limit    | uint256   | The maximum amount of tokens a user can claim at once.           |
| tokenIds | uint256[] | List of token IDs that this faucet will distribute.              |

### removeFaucet (0x07229f14)

```solidity
function removeFaucet(
    address faucet
) external onlyOwner exists(faucet) nonReentrant
```

Removes a faucet and transfers any remaining tokens back to the owner.


Parameters:

| Name   | Type    | Description                          |
| :----- | :------ | :----------------------------------- |
| faucet | address | Address of the faucet to be removed. |

### enableFaucet (0xe4596dc4)

```solidity
function enableFaucet(address faucet) external onlyOwner exists(faucet)
```

Enable a faucet, allowing users to make claims.


Parameters:

| Name   | Type    | Description                          |
| :----- | :------ | :----------------------------------- |
| faucet | address | Address of the faucet to be enabled. |

### disableFaucet (0x87a8af4e)

```solidity
function disableFaucet(address faucet) external onlyOwner exists(faucet)
```

Disable a faucet, stopping users from making claims.


Parameters:

| Name   | Type    | Description                           |
| :----- | :------ | :------------------------------------ |
| faucet | address | Address of the faucet to be disabled. |

### removeTokens (0xecae5383)

```solidity
function removeTokens(
    address faucet,
    uint256[] memory tokenIds
) external onlyOwner exists(faucet) nonReentrant
```

Remove specific tokens from a faucet.


Parameters:

| Name     | Type      | Description                  |
| :------- | :-------- | :--------------------------- |
| faucet   | address   | Address of the faucet.       |
| tokenIds | uint256[] | List of token IDs to remove. |

### claim (0x2bc43fd9)

```solidity
function claim(
    address faucet,
    uint256 tokenId,
    uint256 amount
) external exists(faucet) nonReentrant
```

Claim tokens from a faucet.


Parameters:

| Name    | Type    | Description                           |
| :------ | :------ | :------------------------------------ |
| faucet  | address | Address of the faucet to claim from.  |
| tokenId | uint256 | ID of the token to be claimed.        |
| amount  | uint256 | Amount of tokens to be claimed.       |

### withdraw (0x893bd7c8)

```solidity
function withdraw(
    address faucet,
    address receiver,
    uint256[] memory tokenIds
) external onlyOwner exists(faucet) nonReentrant
```

Function to withdraw the total balance of tokens from the contract to a specified address.


Parameters:

| Name     | Type      | Description                                                                                                                    |
| :------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------- |
| faucet   | address   | - The address of the ERC1155 contract (faucet) containing the tokens to be withdrawn.                                          |
| receiver | address   | - The address to which the tokens will be sent.                                                                                |
| tokenIds | uint256[] | - An array of token IDs to be withdrawn.  Emits a {Withdrawn} event.  Requirements: - The `tokenIds` must exist in the faucet. |

### claimBatch (0xe59e53c2)

```solidity
function claimBatch(
    address faucet,
    uint256[] memory tokenIds,
    uint256[] memory amounts
) external nonReentrant
```

Function to claim multiple tokens from a single faucet.


Parameters:

| Name     | Type      | Description                                                                                                                                                                                                                                           |
| :------- | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| faucet   | address   | - The address of the ERC1155 contract (faucet) to claim from.                                                                                                                                                                                         |
| tokenIds | uint256[] | - An array of token IDs to be claimed from the faucet.                                                                                                                                                                                                |
| amounts  | uint256[] | - An array of amounts of tokens to be claimed for respective token IDs.  Emits multiple {Claimed} events for each claim.  Requirements: - The lengths of `tokenIds` and `amounts` arrays should be the same. - Each tokenId must exist in the faucet. |
