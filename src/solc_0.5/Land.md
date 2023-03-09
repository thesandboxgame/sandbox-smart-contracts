# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

A [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land) is a digital piece of real-estate in The
Sandbox's metaverse. Each LAND is a unique piece of the metaverse map. The map is a grid of 408x408 lands.

The land contract complies with the ERC-721 standard. The tokenId is used to pack the coordinates `(x,y)` of the land
inside the grid and the layerId (explained bellow) using the following formula `tokenId = ( x + y * 408 ) | layerId`.

The layerId is used to represent groups of lands called [Quads](https://en.wikipedia.org/wiki/Quadtree) we support quads
of the following sizes: 24x24, 12x12, 6x6, 3x3. A user owns a quad if he owns all the lands inside it. Using quads a
full group of lands can be transferred in one transaction. The contract also support batch transfers of quads and lands.

Land exists on ethereum (L1) and polygon (L2). There are two different contracts for each layer and also a land tunnel
based on the matic fx-portal library.

In the V1 of the land contract lands can only be minted on L1, V2 adds the possibility to mint lands on L2 too. V3
implement the OpenSea royalties blacklist.

The land contract support the following roles:

- admin: this is a unique address assigned during the initialization of the contract and can add/remove addresses from
  the other roles.
- minter: the addresses in this list can mint lands by calling the `mintQuad` method.
- super operator: the addresses in this list are approved to transfer tokens between users.
- meta transaction processor: the addresses in this can transfer lands in behalf of other users (similar to super
  operators). On the L2 contract this role is the ERC2771 meta transaction forwarder.

# Methods

## Events info

### Minter event

```solidity
event Minter(address superOperator, bool enabled);
```

### MetaTransactionProcessor event

```solidity
event MetaTransactionProcessor(address metaTransactionProcessor, bool enabled);
```

### SuperOperator event

```solidity
event SuperOperator(address superOperator, bool enabled);
```

### AdminChanged event

```solidity
event AdminChanged(address oldAdmin, address newAdmin);
```

### Transfer event

```solidity
event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);
```

### Approval event

```solidity
event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);
```

### ApprovalForAll event

```solidity
event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);
```

## Functions info

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(bytes4 id) external pure returns (bool);
```

Check if the contract supports an interface 0x01ffc9a7 is ERC-165 0x80ac58cd is ERC-721 0x5b5e139f is ERC-721 metadata

Parameters:

| Name | Type   | Description             |
| :--- | :----- | :---------------------- |
| id   | bytes4 | The id of the interface |

### name (0x06fdde03)

```solidity
function name() external pure returns (string);
```

Return the name of the token contract

### getApproved (0x081812fc)

```solidity
function getApproved(uint256 id) external view returns (address);
```

Get the approved operator for a specific token

Parameters:

| Name | Type    | Description         |
| :--- | :------ | :------------------ |
| id   | uint256 | The id of the token |

### approve (0x095ea7b3)

```solidity
function approve(address operator, uint256 id) external;
```

Approve an operator to spend tokens on the sender behalf

Parameters:

| Name     | Type    | Description                        |
| :------- | :------ | :--------------------------------- |
| operator | address | The address receiving the approval |
| id       | uint256 | The id of the token                |

### height (0x0ef26743)

```solidity
function height() external pure returns (uint256);
```

total height of the map

### batchTransferFrom (0x15ddc535)

```solidity
function batchTransferFrom(address from, address to, uint256[] ids, bytes data) external;
```

Transfer many tokens between 2 addresses

Parameters:

| Name | Type      | Description                |
| :--- | :-------- | :------------------------- |
| from | address   | The sender of the token    |
| to   | address   | The recipient of the token |
| ids  | uint256[] | The ids of the tokens      |
| data | bytes     | additional data            |

### transferFrom (0x23b872dd)

```solidity
function transferFrom(address from, address to, uint256 id) external;
```

Transfer a token between 2 addresses

Parameters:

| Name | Type    | Description                |
| :--- | :------ | :------------------------- |
| from | address | The sender of the token    |
| to   | address | The recipient of the token |
| id   | uint256 | The id of the token        |

### safeBatchTransferFrom (0x28cfbd46)

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data) external;
```

Transfer many tokens between 2 addresses ensuring the receiving contract has a receiver method

Parameters:

| Name | Type      | Description                |
| :--- | :-------- | :------------------------- |
| from | address   | The sender of the token    |
| to   | address   | The recipient of the token |
| ids  | uint256[] | The ids of the tokens      |
| data | bytes     | additional data            |

### approveFor (0x2b991746)

```solidity
function approveFor(address sender, address operator, uint256 id) external;
```

Approve an operator to spend tokens on the sender behalf

Parameters:

| Name     | Type    | Description                        |
| :------- | :------ | :--------------------------------- |
| sender   | address | The address giving the approval    |
| operator | address | The address receiving the approval |
| id       | uint256 | The id of the token                |

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

### safeTransferFrom (0x42842e0e)

```solidity
function safeTransferFrom(address from, address to, uint256 id) external;
```

Transfer a token between 2 addresses letting the receiver knows of the transfer

Parameters:

| Name | Type    | Description                |
| :--- | :------ | :------------------------- |
| from | address | The send of the token      |
| to   | address | The recipient of the token |
| id   | uint256 | The id of the token        |

### burn (0x42966c68)

```solidity
function burn(uint256 id) external;
```

Burns token `id`.

Parameters:

| Name | Type    | Description                |
| :--- | :------ | :------------------------- |
| id   | uint256 | token which will be burnt. |

### initialize (0x485cc955)

```solidity
function initialize(address metaTransactionContract, address admin) external;
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

### ownerOf (0x6352211e)

```solidity
function ownerOf(uint256 id) external view returns (address owner);
```

Return the owner of a Land

Parameters:

| Name | Type    | Description        |
| :--- | :------ | :----------------- |
| id   | uint256 | The id of the Land |

### isSuperOperator (0x654b748a)

```solidity
function isSuperOperator(address who) external view returns (bool);
```

check whether address `who` is given superOperator rights.

Parameters:

| Name | Type    | Description           |
| :--- | :------ | :-------------------- |
| who  | address | The address to query. |

### mintQuad (0x6e1e3bbf)

```solidity
function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes data) external;
```

Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)

Parameters:

| Name | Type    | Description                               |
| :--- | :------ | :---------------------------------------- |
| to   | address | The recipient of the new quad             |
| size | uint256 | The size of the new quad                  |
| x    | uint256 | The top left x coordinate of the new quad |
| y    | uint256 | The top left y coordinate of the new quad |
| data | bytes   | extra data to pass to the transfer        |

### getAdmin (0x6e9960c3)

```solidity
function getAdmin() external view returns (address);
```

gives the current administrator of this contract.

### balanceOf (0x70a08231)

```solidity
function balanceOf(address owner) external view returns (uint256);
```

Return the number of Land owned by an address

Parameters:

| Name  | Type    | Description             |
| :---- | :------ | :---------------------- |
| owner | address | The address to look for |

### burnFrom (0x79cc6790)

```solidity
function burnFrom(address from, uint256 id) external;
```

Burn token`id` from `from`.

Parameters:

| Name | Type    | Description                         |
| :--- | :------ | :---------------------------------- |
| from | address | address whose token is to be burnt. |
| id   | uint256 | token which will be burnt.          |

### getY (0x845a4697)

```solidity
function getY(uint256 id) external pure returns (uint256);
```

y coordinate of Land token

Parameters:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| id   | uint256 | tokenId     |

### _numNFTPerAddress (0x87826764)

```solidity
function _numNFTPerAddress(address) external view returns (uint256);
```

### setMetaTransactionProcessor (0x8a04af6a)

```solidity
function setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled) external;
```

Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

Parameters:

| Name                     | Type    | Description                                                         |
| :----------------------- | :------ | :------------------------------------------------------------------ |
| metaTransactionProcessor | address | address that will be given/removed metaTransactionProcessor rights. |
| enabled                  | bool    | set whether the metaTransactionProcessor is enabled or disabled.    |

### getX (0x8e5cb5f6)

```solidity
function getX(uint256 id) external pure returns (uint256);
```

x coordinate of Land token

Parameters:

| Name | Type    | Description |
| :--- | :------ | :---------- |
| id   | uint256 | tokenId     |

### changeAdmin (0x8f283970)

```solidity
function changeAdmin(address newAdmin) external;
```

change the administrator to be `newAdmin`.

Parameters:

| Name     | Type    | Description                       |
| :------- | :------ | :-------------------------------- |
| newAdmin | address | address of the new administrator. |

### symbol (0x95d89b41)

```solidity
function symbol() external pure returns (string);
```

Return the symbol of the token contract

### _owners (0x992924a6)

```solidity
function _owners(uint256) external view returns (uint256);
```

### _operatorsForAll (0x9d786bbc)

```solidity
function _operatorsForAll(address, address) external view returns (bool);
```

### width (0x9ededf77)

```solidity
function width() external pure returns (uint256);
```

total width of the map

### setApprovalForAll (0xa22cb465)

```solidity
function setApprovalForAll(address operator, bool approved) external;
```

Set the approval for an operator to manage all the tokens of the sender

Parameters:

| Name     | Type    | Description                        |
| :------- | :------ | :--------------------------------- |
| operator | address | The address receiving the approval |
| approved | bool    | The determination of the approval  |

### isMinter (0xaa271e1a)

```solidity
function isMinter(address who) external view returns (bool);
```

check whether address `who` is given minter rights.

Parameters:

| Name | Type    | Description           |
| :--- | :------ | :-------------------- |
| who  | address | The address to query. |

### register (0xab01b469)

```solidity
function register(address subscriptionOrRegistrantToCopy, bool subscribe) external;
```

This function is used to register Land on the Operator filterer Registry of Opensea.can only be called by admin.

used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.

Parameters:

| Name                           | Type    | Description                                                       |
| :----------------------------- | :------ | :---------------------------------------------------------------- |
| subscriptionOrRegistrantToCopy | address | registration address of the list to subscribe.                    |
| subscribe                      | bool    | bool to signify subscription "true"" or to copy the list "false". |

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

### operatorFilterRegistry (0xb0ccc31e)

```solidity
function operatorFilterRegistry() external view returns (address);
```

### safeTransferFrom (0xb88d4fde)

```solidity
function safeTransferFrom(address from, address to, uint256 id, bytes data) external;
```

Transfer a token between 2 addresses letting the receiver knows of the transfer

Parameters:

| Name | Type    | Description                |
| :--- | :------ | :------------------------- |
| from | address | The sender of the token    |
| to   | address | The recipient of the token |
| id   | uint256 | The id of the token        |
| data | bytes   | Additional data            |

### _operators (0xb9b710e9)

```solidity
function _operators(uint256) external view returns (address);
```

### tokenURI (0xc87b56dd)

```solidity
function tokenURI(uint256 id) external view returns (string);
```

Return the URI of a specific token

Parameters:

| Name | Type    | Description         |
| :--- | :------ | :------------------ |
| id   | uint256 | The id of the token |

### setMinter (0xcf456ae7)

```solidity
function setMinter(address minter, bool enabled) external;
```

Enable or disable the ability of `minter` to mint tokens

Parameters:

| Name    | Type    | Description                                      |
| :------ | :------ | :----------------------------------------------- |
| minter  | address | address that will be given/removed minter right. |
| enabled | bool    | set whether the minter is enabled or disabled.   |

### isMetaTransactionProcessor (0xdc5074af)

```solidity
function isMetaTransactionProcessor(address who) external view returns (bool);
```

check whether address `who` is given meta-transaction execution rights.

Parameters:

| Name | Type    | Description           |
| :--- | :------ | :-------------------- |
| who  | address | The address to query. |

### isApprovedForAll (0xe985e9c5)

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool isOperator);
```

Check if the sender approved the operator

Parameters:

| Name     | Type    | Description                 |
| :------- | :------ | :-------------------------- |
| owner    | address | The address of the owner    |
| operator | address | The address of the operator |

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

### setApprovalForAllFor (0xeeb5a5d1)

```solidity
function setApprovalForAllFor(address sender, address operator, bool approved) external;
```

Set the approval for an operator to manage all the tokens of the sender

Parameters:

| Name     | Type    | Description                        |
| :------- | :------ | :--------------------------------- |
| sender   | address | The address giving the approval    |
| operator | address | The address receiving the approval |
| approved | bool    | The determination of the approval  |

# Links

- [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land)
