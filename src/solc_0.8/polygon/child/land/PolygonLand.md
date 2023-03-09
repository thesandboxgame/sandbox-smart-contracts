# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

This is the implementation of the polygon (L2) layer version of the  [LAND](../../../../solc_0.5/Land.md) contract. The
contract has same functionalities of the L1 land contract.

# Methods

## Events info

### AdminChanged event

```solidity
event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
```

### Approval event

```solidity
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
```

### ApprovalForAll event

```solidity
event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
```

### Minter event

```solidity
event Minter(address minter, bool enabled);
```

### SuperOperator event

```solidity
event SuperOperator(address indexed superOperator, bool indexed enabled);
```

### Transfer event

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

## Functions info

### approve (0x095ea7b3)

```solidity
function approve(address operator, uint256 id) external;
```

Approve an operator to spend tokens on the senders behalf.

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| operator | address | The address receiving the approval. |
| id       | uint256 | The id of the token.                |

### approveFor (0x2b991746)

```solidity
function approveFor(address sender, address operator, uint256 id) external;
```

Approve an operator to spend tokens on the sender behalf.

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| sender   | address | The address giving the approval.    |
| operator | address | The address receiving the approval. |
| id       | uint256 | The id of the token.                |

### balanceOf (0x70a08231)

```solidity
function balanceOf(address owner) external view returns (uint256);
```

Get the number of tokens owned by an address.

Parameters:

| Name  | Type    | Description              |
| :---- | :------ | :----------------------- |
| owner | address | The address to look for. |

Return values:

| Name | Type    | Description                                |
| :--- | :------ | :----------------------------------------- |
| _0   | uint256 | The number of tokens owned by the address. |

### batchTransferFrom (0x15ddc535)

```solidity
function batchTransferFrom(address from, address to, uint256[] ids, bytes data) external;
```

### batchTransferQuad (0xeaa5e067)

```solidity
function batchTransferQuad(
  address from,
  address to,
  uint256[] sizes,
  uint256[] xs,
  uint256[] ys,
  bytes data
) external;
```

transfer multiple quad (aligned to a quad tree with size 3, 6, 12 or 24 only)

Parameters:

| Name  | Type      | Description                                  |
| :---- | :-------- | :------------------------------------------- |
| from  | address   | current owner of the quad                    |
| to    | address   | destination                                  |
| sizes | uint256[] | list of sizes for each quad                  |
| xs    | uint256[] | list of top left x coordinates for each quad |
| ys    | uint256[] | list of top left y coordinates for each quad |
| data  | bytes     | additional data                              |

### burn (0x42966c68)

```solidity
function burn(uint256 id) external;
```

Burns token `id`.

Parameters:

| Name | Type    | Description                    |
| :--- | :------ | :----------------------------- |
| id   | uint256 | The token which will be burnt. |

### burnFrom (0x79cc6790)

```solidity
function burnFrom(address from, uint256 id) external;
```

Burn token`id` from `from`.

Parameters:

| Name | Type    | Description                         |
| :--- | :------ | :---------------------------------- |
| from | address | address whose token is to be burnt. |
| id   | uint256 | The token which will be burnt.      |

### changeAdmin (0x8f283970)

```solidity
function changeAdmin(address newAdmin) external;
```

Change the administrator to be `newAdmin`.

Parameters:

| Name     | Type    | Description                           |
| :------- | :------ | :------------------------------------ |
| newAdmin | address | The address of the new administrator. |

### exists (0x55064d85)

```solidity
function exists(uint256 size, uint256 x, uint256 y) external view returns (bool);
```

checks if Land has been minted or not

Parameters:

| Name | Type    | Description              |
| :--- | :------ | :----------------------- |
| size | uint256 | size of the              |
| x    | uint256 | x coordinate of the quad |
| y    | uint256 | y coordinate of the quad |

Return values:

| Name | Type | Description                             |
| :--- | :--- | :-------------------------------------- |
| _0   | bool | bool for if Land has been minted or not |

### getAdmin (0x6e9960c3)

```solidity
function getAdmin() external view returns (address);
```

Get the current administrator of this contract.

Return values:

| Name | Type    | Description                                 |
| :--- | :------ | :------------------------------------------ |
| _0   | address | The current administrator of this contract. |

### getApproved (0x081812fc)

```solidity
function getApproved(uint256 id) external view returns (address);
```

Get the approved operator for a specific token.

Parameters:

| Name | Type    | Description          |
| :--- | :------ | :------------------- |
| id   | uint256 | The id of the token. |

Return values:

| Name | Type    | Description                  |
| :--- | :------ | :--------------------------- |
| _0   | address | The address of the operator. |

### getTrustedForwarder (0xce1b815f)

```solidity
function getTrustedForwarder() external view returns (address trustedForwarder);
```

### getX (0x8e5cb5f6)

```solidity
function getX(uint256 id) external pure returns (uint256);
```

x coordinate of Land token

Parameters:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| id   | uint256 | tokenId     |

Return values:

| Name | Type    | Description       |
| :--- | :------ | :---------------- |
| _0   | uint256 | the x coordinates |

### getY (0x845a4697)

```solidity
function getY(uint256 id) external pure returns (uint256);
```

y coordinate of Land token

Parameters:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| id   | uint256 | tokenId     |

Return values:

| Name | Type    | Description       |
| :--- | :------ | :---------------- |
| _0   | uint256 | the y coordinates |

### height (0x0ef26743)

```solidity
function height() external pure returns (uint256);
```

total height of the map

Return values:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| _0   | uint256 | height      |

### initialize (0xc4d66de8)

```solidity
function initialize(address trustedForwarder) external;
```

### isApprovedForAll (0xe985e9c5)

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool isOperator);
```

Check if the sender approved the operator.

Parameters:

| Name     | Type    | Description                  |
| :------- | :------ | :--------------------------- |
| owner    | address | The address of the owner.    |
| operator | address | The address of the operator. |

Return values:

| Name       | Type | Description                 |
| :--------- | :--- | :-------------------------- |
| isOperator | bool | The status of the approval. |

### isMinter (0xaa271e1a)

```solidity
function isMinter(address who) external view returns (bool);
```

check whether address `who` is given minter rights.

Parameters:

| Name | Type    | Description           |
| :--- | :------ | :-------------------- |
| who  | address | The address to query. |

Return values:

| Name | Type | Description                            |
| :--- | :--- | :------------------------------------- |
| _0   | bool | whether the address has minter rights. |

### isSuperOperator (0x654b748a)

```solidity
function isSuperOperator(address who) external view returns (bool);
```

check whether address `who` is given superOperator rights.

Parameters:

| Name | Type    | Description           |
| :--- | :------ | :-------------------- |
| who  | address | The address to query. |

Return values:

| Name | Type | Description                                   |
| :--- | :--- | :-------------------------------------------- |
| _0   | bool | whether the address has superOperator rights. |

### isTrustedForwarder (0x572b6c05)

```solidity
function isTrustedForwarder(address forwarder) external view returns (bool);
```

### mintAndTransferQuad (0x4e6a0f44)

```solidity
function mintAndTransferQuad(address to, uint256 size, uint256 x, uint256 y, bytes data) external;
```

Checks if a parent quad has child quads already minted. Then mints the rest child quads and transfers the parent quad.
Should only be called by the tunnel.

Parameters:

| Name | Type    | Description                               |
| :--- | :------ | :---------------------------------------- |
| to   | address | The recipient of the new quad             |
| size | uint256 | The size of the new quad                  |
| x    | uint256 | The top left x coordinate of the new quad |
| y    | uint256 | The top left y coordinate of the new quad |
| data | bytes   | extra data to pass to the transfer        |

### mintQuad (0x6e1e3bbf)

```solidity
function mintQuad(address user, uint256 size, uint256 x, uint256 y, bytes data) external;
```

Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)

Parameters:

| Name | Type    | Description                               |
| :--- | :------ | :---------------------------------------- |
| user | address | The recipient of the new quad             |
| size | uint256 | The size of the new quad                  |
| x    | uint256 | The top left x coordinate of the new quad |
| y    | uint256 | The top left y coordinate of the new quad |
| data | bytes   | extra data to pass to the transfer        |

### name (0x06fdde03)

```solidity
function name() external pure returns (string);
```

Return the name of the token contract

Return values:

| Name | Type   | Description                    |
| :--- | :----- | :----------------------------- |
| _0   | string | The name of the token contract |

### ownerOf (0x6352211e)

```solidity
function ownerOf(uint256 id) external view returns (address owner);
```

Get the owner of a token.

Parameters:

| Name | Type    | Description          |
| :--- | :------ | :------------------- |
| id   | uint256 | The id of the token. |

Return values:

| Name  | Type    | Description                     |
| :---- | :------ | :------------------------------ |
| owner | address | The address of the token owner. |

### safeBatchTransferFrom (0x28cfbd46)

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data) external;
```

Transfer many tokens between 2 addresses, while ensuring the receiving contract has a receiver method.

Parameters:

| Name | Type      | Description                 |
| :--- | :-------- | :-------------------------- |
| from | address   | The sender of the token.    |
| to   | address   | The recipient of the token. |
| ids  | uint256[] | The ids of the tokens.      |
| data | bytes     | Additional data.            |

### safeTransferFrom (0x42842e0e)

```solidity
function safeTransferFrom(address from, address to, uint256 id) external;
```

Transfer a token between 2 addresses letting the receiver know of the transfer.

Parameters:

| Name | Type    | Description                 |
| :--- | :------ | :-------------------------- |
| from | address | The send of the token.      |
| to   | address | The recipient of the token. |
| id   | uint256 | The id of the token.        |

### safeTransferFrom (0xb88d4fde)

```solidity
function safeTransferFrom(address from, address to, uint256 id, bytes data) external;
```

Transfer a token between 2 addresses letting the receiver knows of the transfer.

Parameters:

| Name | Type    | Description                 |
| :--- | :------ | :-------------------------- |
| from | address | The sender of the token.    |
| to   | address | The recipient of the token. |
| id   | uint256 | The id of the token.        |
| data | bytes   | Additional data.            |

### setApprovalForAll (0xa22cb465)

```solidity
function setApprovalForAll(address operator, bool approved) external;
```

Set the approval for an operator to manage all the tokens of the sender.

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| operator | address | The address receiving the approval. |
| approved | bool    | The determination of the approval.  |

### setApprovalForAllFor (0xeeb5a5d1)

```solidity
function setApprovalForAllFor(address sender, address operator, bool approved) external;
```

Set the approval for an operator to manage all the tokens of the sender.

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| sender   | address | The address giving the approval.    |
| operator | address | The address receiving the approval. |
| approved | bool    | The determination of the approval.  |

### setMinter (0xcf456ae7)

```solidity
function setMinter(address minter, bool enabled) external;
```

Enable or disable the ability of `minter` to transfer tokens of all (minter rights).

Parameters:

| Name    | Type    | Description                                      |
| :------ | :------ | :----------------------------------------------- |
| minter  | address | address that will be given/removed minter right. |
| enabled | bool    | set whether the minter is enabled or disabled.   |

### setSuperOperator (0xac9fe421)

```solidity
function setSuperOperator(address superOperator, bool enabled) external;
```

Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

Parameters:

| Name          | Type    | Description                                             |
| :------------ | :------ | :------------------------------------------------------ |
| superOperator | address | address that will be given/removed superOperator right. |
| enabled       | bool    | set whether the superOperator is enabled or disabled.   |

### setTrustedForwarder (0xda742228)

```solidity
function setTrustedForwarder(address trustedForwarder) external;
```

Change the address of the trusted forwarder for meta-TX

Parameters:

| Name             | Type    | Description              |
| :--------------- | :------ | :----------------------- |
| trustedForwarder | address | The new trustedForwarder |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(bytes4 id) external pure returns (bool);
```

Check if the contract supports an interface 0x01ffc9a7 is ERC-165 0x80ac58cd is ERC-721 0x5b5e139f is ERC-721 metadata

Parameters:

| Name | Type   | Description             |
| :--- | :----- | :---------------------- |
| id   | bytes4 | The id of the interface |

Return values:

| Name | Type | Description                        |
| :--- | :--- | :--------------------------------- |
| _0   | bool | True if the interface is supported |

### symbol (0x95d89b41)

```solidity
function symbol() external pure returns (string);
```

Return the symbol of the token contract

Return values:

| Name | Type   | Description                      |
| :--- | :----- | :------------------------------- |
| _0   | string | The symbol of the token contract |

### tokenURI (0xc87b56dd)

```solidity
function tokenURI(uint256 id) external view returns (string);
```

Return the URI of a specific token

Parameters:

| Name | Type    | Description         |
| :--- | :------ | :------------------ |
| id   | uint256 | The id of the token |

Return values:

| Name | Type   | Description          |
| :--- | :----- | :------------------- |
| _0   | string | The URI of the token |

### transferFrom (0x23b872dd)

```solidity
function transferFrom(address from, address to, uint256 id) external;
```

Transfer a token between 2 addresses.

Parameters:

| Name | Type    | Description                 |
| :--- | :------ | :-------------------------- |
| from | address | The sender of the token.    |
| to   | address | The recipient of the token. |
| id   | uint256 | The id of the token.        |

### transferQuad (0x38bb305a)

```solidity
function transferQuad(
  address from,
  address to,
  uint256 size,
  uint256 x,
  uint256 y,
  bytes data
) external;
```

transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)

Parameters:

| Name | Type    | Description                           |
| :--- | :------ | :------------------------------------ |
| from | address | current owner of the quad             |
| to   | address | destination                           |
| size | uint256 | size of the quad                      |
| x    | uint256 | The top left x coordinate of the quad |
| y    | uint256 | The top left y coordinate of the quad |
| data | bytes   | additional data                       |

### width (0x9ededf77)

```solidity
function width() external pure returns (uint256);
```

total width of the map

Return values:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| _0   | uint256 | width       |

# Links

- [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land)
