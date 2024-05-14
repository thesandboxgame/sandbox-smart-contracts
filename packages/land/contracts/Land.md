# Audience

The intended audience for .md documentation is auditors, internal developers and
external developer contributors.

The Land contract implements the following standards:

- [ERC721](https://eips.ethereum.org/EIPS/eip-721)
- [ERC2771](https://eips.ethereum.org/EIPS/eip-2771)

check the standards for an explanation of concepts like tokenId, approval,
minting, transfer, meta-transaction, etc.

# Features

A [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land) is a
digital piece of real-estate in The Sandbox's metaverse. Each LAND is a unique
piece of the metaverse map which is a grid of 408x408 lands.

Instead of using sequential tokenIds the tokenId value is used to store the
following information:

- the coordinates `(x,y)` of the land inside the map.
- the `layerId` that related to the size of [quads](#quads) (explained bellow).

Land exists on ethereum (L1) and polygon (L2). There is a Land contract for each
network and also a land tunnel based on the matic fx-portal library that can be
used to transfer lands back and forth between the two networks.

In the V1 of the contract lands can only be minted on L1, V2 adds the
possibility to mint on L2 too. V3 implement the OpenSea royalties blacklist.

## Roles

The land contract support the following roles:

- admin: a unique address that is the owner of the contract and can manage the
  other roles.
- minters: a list of addresses that can mint lands.
- super operators: a list of addresses that are automatically approved to
  transfer tokens between users.
- meta transaction processor: an address that can transfer lands in behalf of
  other users and used to implement meta-transactions. On the L2 contract this
  role is the ERC2771 meta transaction forwarder.

# Quads

Quads are a way to groups lands. A quad of lands can be minted and transferred
in one step. The concept is related to a
[QuadTree](https://en.wikipedia.org/wiki/Quadtree) but it has it own specific
implementation in the Land contract.

The full map of `408x408` lands is divided in a grid of `17x17` quads that has a
size of `24x24` each. Each `24x24` quad is divided in four `12x12` quads, each
`12x12` quad is divided in four `6x6` quads, each `6x6` quad is divided in four
`3x3` quads and each `3x3` quad is divided in nine `1x1` quads (or just lands).
This way we have a QuadTree. Each node is a **_quad_** and has one
**_parent-quad_** and some **_child-quads_** that he includes.

![](images/TheGreatQuad.png)

A quad is recognized by its top left coordinate, top right coordinate and its
size. Quads are part of a grid, so, the coordinates of the quad must be a
multiple of the quad size. For example: the coordinate `(6,0)` is valid for a
`3x3` quad and a `6x6` quad, but the coordinate `(3,0)` is only valid for a
`3x3` quad.

**_A quad of size `1x1` is just a land, and we will refer interchangeably to it
as quad or land._**

## TokenId

The ERC721 tokenId is used to store the coordinates and size of quads. Instead
of storing directly the size of the quad a layerId is used to represent it. The
formula for the quad information used is: `tokenId = ( x + y * 408 ) | layerId`.
Where

- `x,y` are the coordinates of the quad in the map and must be multiple of quad
  size.
- layerId depends on the size is one of:
  - `LAYER_1x1` =
    `0x0000000000000000000000000000000000000000000000000000000000000000`
  - `LAYER_3x3` =
    `0x0100000000000000000000000000000000000000000000000000000000000000`
  - `LAYER_6x6` =
    `0x0200000000000000000000000000000000000000000000000000000000000000`
  - `LAYER_12x12` =
    `0x0300000000000000000000000000000000000000000000000000000000000000`
  - `LAYER_24x24` =
    `0x0400000000000000000000000000000000000000000000000000000000000000`

Each land (a specific `x,y` coordinate) is included in five quads one for each
layerId and each one of those quads has its own tokenId. For example: the land
`(0x123,0)` has the token id `0x123` and it is also included in the `3x3` quad
that has the tokenId `0x0100...0123`, etc.

**_Using the tokenId of a quad a lot of lands can be minted or transferred in
one transaction._**

## Ownership

The land contract uses a mapping called `_owners` that keep track of the
ownership of quads and lands, it maps the `tokenId` to the address of the owner,
also the same mapping is used to store two flags. Here is the description of the
`_owners` mapping value:

- Bit 0-159 are used for the owner address
- Bit 160 is set when a land is burned, at the same time the owner address is
  set to zero.
- Bit 255 is used for the flag `operatorEnabled`. This flag is used to enable
  operators for a specific tokenId and is set during a call to approve. This
  flag is cleared automatically on transfer.

To decide if a user is the owner of a quad there are a few things to take into
account:

1. When a user owns only part of the quad then the quad doesn't really belong to
   anybody, it belongs "to nobody".
2. We must represent quads that are not minted yet, they have "no owner".
3. Each land belongs to five quads (one for each layer) the contract choose
   which entry to set and which one to use to decide the right ownership of a
   land.

The contract keeps the consistency between the owners of quads, parent-quads and
child-quads by using the following rules:

- The **_address zero_** is used to represent both "nobody" and "no owner" which
  will be use interchangeably form now on.
- To be the owner of a quad the user must meet two conditions:
  - All the child-quads must be owned by him or must have "no owner".
  - If any of the child-quads belongs to "no owner" then the user must be the
    owner of the quad or some parent-quad. NOTE: if the user is the owner of all
    child-quads then automatically is the owner of the quad.
- When a user transfers a quad instead of setting the address of the user on all
  the child-quads the child-quads are set to "no owner" and the parent-quads are
  left untouched. This leave some parent-quads out of sync (some child can have
  a different owner). Even if this sounds wrong there is no way to abuse the
  situation because the owner of the parent-quad is not the owner of the
  child-quads anymore.
- When a user gets a new quad, and it fills a parent-quad the parent quad is
  left untouched and the user just owns the different pieces. If the user wants
  to unify the parent-quad he must do an extra transaction to transfer the
  parent-quad to himself.
- To mint a quad:
  - All child-quads must have "no owner".
  - All parent-quads must have "no owner".
  - Only one entry in the `_owners[tokenId]` mapping that corresponds to the
    tokenId of the quad is set to the address of the new owner. **_Only one
    storage slot is changed when minting._**

### Example

Let's imagine we're minting a 6x6 quad for user A, in the coordinates 0, 0.
We'll mint a single token, with a quad id equal to `LAYER_6x6`. There won't be
36 tokens minted, just one, with an id that allows us to access all its internal
quads.

![](images/quadIMG1.png)

User A can transfer his 6x6 quad to user B if he wants to, calling the
`transferQuad` function.

![](images/quadIMG2.png)

The quad can also be separated in `3x3` ones and each `3x3` can be separated
into `1x1` ones. The next image shows what would happen if a `3x3` quad is
transferred to user B. At this point user A lost the ownership of the `6x6`
quad.

![](images/quadIMG3.png)

The same happen to the `3x3` quad when a `1x1` quad is transferred.

![](images/quadIMG4.png)

Now, if we try to transfer the `3x3` quad from which we took one of the lands,
we will get the error "not owner".

![](images/quadIMG5.png)

If the user A wants to send the rest of these lands of the `3x3` quad, he must
send them one by one.

![](images/quadIMG6.png)

## Methods

### UNKNOWN_NEIGHBORHOOD

```solidity
function UNKNOWN_NEIGHBORHOOD() external view returns (string)
```

value returned when the neighborhood is not set yet.

#### Returns

| Name | Type   | Description |
| ---- | ------ | ----------- |
| \_0  | string | undefined   |

### approve

```solidity
function approve(address operator, uint256 tokenId) external nonpayable
```

Approve an operator to spend tokens on the sender behalf

#### Parameters

| Name     | Type    | Description                        |
| -------- | ------- | ---------------------------------- |
| operator | address | The address receiving the approval |
| tokenId  | uint256 | The id of the token                |

### approveFor

```solidity
function approveFor(address sender, address operator, uint256 tokenId) external nonpayable
```

Approve an operator to spend tokens on the sender behalf

#### Parameters

| Name     | Type    | Description                        |
| -------- | ------- | ---------------------------------- |
| sender   | address | The address giving the approval    |
| operator | address | The address receiving the approval |
| tokenId  | uint256 | The id of the token                |

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```

Get the number of tokens owned by an address.

#### Parameters

| Name  | Type    | Description              |
| ----- | ------- | ------------------------ |
| owner | address | The address to look for. |

#### Returns

| Name | Type    | Description                                |
| ---- | ------- | ------------------------------------------ |
| \_0  | uint256 | The number of tokens owned by the address. |

### batchTransferFrom

```solidity
function batchTransferFrom(address from, address to, uint256[] ids, bytes data) external nonpayable
```

Transfer many tokens between 2 addresses.

#### Parameters

| Name | Type      | Description                 |
| ---- | --------- | --------------------------- |
| from | address   | The sender of the token.    |
| to   | address   | The recipient of the token. |
| ids  | uint256[] | The ids of the tokens.      |
| data | bytes     | Additional data.            |

### batchTransferQuad

```solidity
function batchTransferQuad(address from, address to, uint256[] sizes, uint256[] xs, uint256[] ys, bytes data) external nonpayable
```

transfer multiple quad (aligned to a quad tree with size 3, 6, 12 or 24 only)

#### Parameters

| Name  | Type      | Description                                     |
| ----- | --------- | ----------------------------------------------- |
| from  | address   | current owner of the quad                       |
| to    | address   | destination                                     |
| sizes | uint256[] | list of sizes for each quad                     |
| xs    | uint256[] | list of bottom left x coordinates for each quad |
| ys    | uint256[] | list of bottom left y coordinates for each quad |
| data  | bytes     | additional data                                 |

### changeAdmin

```solidity
function changeAdmin(address newAdmin) external nonpayable
```

Change the admin of the contract

_Change the administrator to be `newAdmin`._

#### Parameters

| Name     | Type    | Description                           |
| -------- | ------- | ------------------------------------- |
| newAdmin | address | The address of the new administrator. |

### exists

```solidity
function exists(uint256 size, uint256 x, uint256 y) external view returns (bool)
```

checks if Land has been minted or not

#### Parameters

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| size | uint256 | The size of the quad                     |
| x    | uint256 | The bottom left x coordinate of the quad |
| y    | uint256 | The bottom left y coordinate of the quad |

#### Returns

| Name | Type | Description                             |
| ---- | ---- | --------------------------------------- |
| \_0  | bool | bool for if Land has been minted or not |

### getAdmin

```solidity
function getAdmin() external view returns (address)
```

Get the current admin

_Get the current administrator of this contract._

#### Returns

| Name | Type    | Description                                 |
| ---- | ------- | ------------------------------------------- |
| \_0  | address | The current administrator of this contract. |

### getApproved

```solidity
function getApproved(uint256 tokenId) external view returns (address)
```

Get the approved operator for a specific token.

#### Parameters

| Name    | Type    | Description          |
| ------- | ------- | -------------------- |
| tokenId | uint256 | The id of the token. |

#### Returns

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| \_0  | address | The address of the operator. |

### getMetadata

```solidity
function getMetadata(uint256 tokenId) external view returns (bool, uint256, string)
```

return the metadata for one land

#### Parameters

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | the token id |

#### Returns

| Name | Type    | Description                                                |
| ---- | ------- | ---------------------------------------------------------- |
| \_0  | bool    | premium true if the land is premium                        |
| \_1  | uint256 | neighborhoodId the number that identifies the neighborhood |
| \_2  | string  | neighborhoodName the neighborhood name                     |

### getMetadataRegistry

```solidity
function getMetadataRegistry() external view returns (contract ILandMetadataRegistry)
```

Get the address of the Metadata Registry

#### Returns

| Name | Type                           | Description                          |
| ---- | ------------------------------ | ------------------------------------ |
| \_0  | contract ILandMetadataRegistry | The address of the Metadata Registry |

### getNeighborhoodId

```solidity
function getNeighborhoodId(uint256 tokenId) external view returns (uint256)
```

return the id that identifies the neighborhood

#### Parameters

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | the token id |

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### getOwnerData

```solidity
function getOwnerData(uint256 tokenId) external view returns (uint256)
```

Return the internal owner data of a Land

_for debugging purposes_

#### Parameters

| Name    | Type    | Description        |
| ------- | ------- | ------------------ |
| tokenId | uint256 | The id of the Land |

#### Returns

| Name | Type    | Description                                            |
| ---- | ------- | ------------------------------------------------------ |
| \_0  | uint256 | the owner data (address + burn flag + operatorEnabled) |

### getRoyaltyManager

```solidity
function getRoyaltyManager() external view returns (contract IRoyaltyManager)
```

returns the royalty manager

#### Returns

| Name | Type                     | Description                              |
| ---- | ------------------------ | ---------------------------------------- |
| \_0  | contract IRoyaltyManager | the address of royalty manager contract. |

### getX

```solidity
function getX(uint256 tokenId) external pure returns (uint256)
```

x coordinate of Land token

#### Parameters

| Name    | Type    | Description    |
| ------- | ------- | -------------- |
| tokenId | uint256 | the id of land |

#### Returns

| Name | Type    | Description       |
| ---- | ------- | ----------------- |
| \_0  | uint256 | the x coordinates |

### getY

```solidity
function getY(uint256 tokenId) external pure returns (uint256)
```

y coordinate of Land token

#### Parameters

| Name    | Type    | Description    |
| ------- | ------- | -------------- |
| tokenId | uint256 | the id of land |

#### Returns

| Name | Type    | Description       |
| ---- | ------- | ----------------- |
| \_0  | uint256 | the y coordinates |

### height

```solidity
function height() external pure returns (uint256)
```

total height of the map

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | height      |

### initialize

```solidity
function initialize(address admin) external nonpayable
```

Initializes the contract with the meta-transaction contract, admin &amp;
royalty-manager

#### Parameters

| Name  | Type    | Description           |
| ----- | ------- | --------------------- |
| admin | address | Admin of the contract |

### isApprovedForAll

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool)
```

Check if the sender approved the operator.

#### Parameters

| Name     | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| owner    | address | The address of the owner.    |
| operator | address | The address of the operator. |

#### Returns

| Name | Type | Description                            |
| ---- | ---- | -------------------------------------- |
| \_0  | bool | isOperator The status of the approval. |

### isMinter

```solidity
function isMinter(address who) external view returns (bool)
```

check whether address `who` is given minter rights.

#### Parameters

| Name | Type    | Description           |
| ---- | ------- | --------------------- |
| who  | address | The address to query. |

#### Returns

| Name | Type | Description                            |
| ---- | ---- | -------------------------------------- |
| \_0  | bool | whether the address has minter rights. |

### isPremium

```solidity
function isPremium(uint256 tokenId) external view returns (bool)
```

return true if a land is premium

#### Parameters

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | the token id |

#### Returns

| Name | Type | Description |
| ---- | ---- | ----------- |
| \_0  | bool | undefined   |

### isSuperOperator

```solidity
function isSuperOperator(address superOperator) external view returns (bool)
```

check if an address is a super-operator

#### Parameters

| Name          | Type    | Description                   |
| ------------- | ------- | ----------------------------- |
| superOperator | address | the operator address to check |

#### Returns

| Name | Type | Description                            |
| ---- | ---- | -------------------------------------- |
| \_0  | bool | true if an address is a super-operator |

### mintAndTransferQuad

```solidity
function mintAndTransferQuad(address to, uint256 size, uint256 x, uint256 y, bytes data) external nonpayable
```

Checks if a parent quad has child quads already minted.Then mints the rest child
quads and transfers the parent quad.Should only be called by the tunnel.

#### Parameters

| Name | Type    | Description                                  |
| ---- | ------- | -------------------------------------------- |
| to   | address | The recipient of the new quad                |
| size | uint256 | The size of the new quad                     |
| x    | uint256 | The bottom left x coordinate of the new quad |
| y    | uint256 | The bottom left y coordinate of the new quad |
| data | bytes   | extra data to pass to the transfer           |

### mintQuad

```solidity
function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes data) external nonpayable
```

Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)

#### Parameters

| Name | Type    | Description                                  |
| ---- | ------- | -------------------------------------------- |
| to   | address | The recipient of the new quad                |
| size | uint256 | The size of the new quad                     |
| x    | uint256 | The bottom left x coordinate of the new quad |
| y    | uint256 | The bottom left y coordinate of the new quad |
| data | bytes   | extra data to pass to the transfer           |

### name

```solidity
function name() external pure returns (string)
```

Return the name of the token contract

#### Returns

| Name | Type   | Description                    |
| ---- | ------ | ------------------------------ |
| \_0  | string | The name of the token contract |

### operatorFilterRegistry

```solidity
function operatorFilterRegistry() external view returns (contract IOperatorFilterRegistry)
```

return the address of the operator filter registry

#### Returns

| Name | Type                             | Description                                 |
| ---- | -------------------------------- | ------------------------------------------- |
| \_0  | contract IOperatorFilterRegistry | the address of the operator filter registry |

### owner

```solidity
function owner() external view returns (address)
```

Get the address of the owner

#### Returns

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| \_0  | address | The address of the owner. |

### ownerOf

```solidity
function ownerOf(uint256 tokenId) external view returns (address owner)
```

Get the owner of a token.

#### Parameters

| Name    | Type    | Description          |
| ------- | ------- | -------------------- |
| tokenId | uint256 | The id of the token. |

#### Returns

| Name  | Type    | Description                     |
| ----- | ------- | ------------------------------- |
| owner | address | The address of the token owner. |

### register

```solidity
function register(address subscriptionOrRegistrantToCopy, bool subscribe) external nonpayable
```

This function is used to register Land contract on the Operator Filterer
Registry of Opensea.

#### Parameters

| Name                           | Type    | Description                                                                      |
| ------------------------------ | ------- | -------------------------------------------------------------------------------- |
| subscriptionOrRegistrantToCopy | address | registration address of the list to subscribe.                                   |
| subscribe                      | bool    | bool to signify subscription &#39;true&#39; or to copy the list &#39;false&#39;. |

### royaltyInfo

```solidity
function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)
```

Returns how much royalty is owed and to whom based on ERC2981

_tokenId is one of the EIP2981 args for this function can&#39;t be removed_

#### Parameters

| Name      | Type    | Description                                           |
| --------- | ------- | ----------------------------------------------------- |
| \_0       | uint256 | undefined                                             |
| salePrice | uint256 | the price of token on which the royalty is calculated |

#### Returns

| Name          | Type    | Description             |
| ------------- | ------- | ----------------------- |
| receiver      | address | the receiver of royalty |
| royaltyAmount | uint256 | the amount of royalty   |

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data) external nonpayable
```

Transfer many tokens between 2 addresses, while ensuring the receiving contract
has a receiver method.

#### Parameters

| Name | Type      | Description                 |
| ---- | --------- | --------------------------- |
| from | address   | The sender of the token.    |
| to   | address   | The recipient of the token. |
| ids  | uint256[] | The ids of the tokens.      |
| data | bytes     | Additional data.            |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId) external nonpayable
```

Transfer a token between 2 addresses letting the receiver knows of the transfer

#### Parameters

| Name    | Type    | Description                |
| ------- | ------- | -------------------------- |
| from    | address | The sender of the token    |
| to      | address | The recipient of the token |
| tokenId | uint256 | The id of the token        |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external nonpayable
```

Transfer a token between 2 addresses letting the receiver knows of the transfer

#### Parameters

| Name    | Type    | Description                |
| ------- | ------- | -------------------------- |
| from    | address | The sender of the token    |
| to      | address | The recipient of the token |
| tokenId | uint256 | The id of the token        |
| data    | bytes   | Additional data            |

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external nonpayable
```

Set the approval for an operator to manage all the tokens of the sender

#### Parameters

| Name     | Type    | Description                        |
| -------- | ------- | ---------------------------------- |
| operator | address | The address receiving the approval |
| approved | bool    | The determination of the approval  |

### setApprovalForAllFor

```solidity
function setApprovalForAllFor(address sender, address operator, bool approved) external nonpayable
```

Set the approval for an operator to manage all the tokens of the sender

#### Parameters

| Name     | Type    | Description                        |
| -------- | ------- | ---------------------------------- |
| sender   | address | The address giving the approval    |
| operator | address | The address receiving the approval |
| approved | bool    | The determination of the approval  |

### setMetadataRegistry

```solidity
function setMetadataRegistry(address metadataRegistry) external nonpayable
```

sets address of the Metadata Registry

#### Parameters

| Name             | Type    | Description                          |
| ---------------- | ------- | ------------------------------------ |
| metadataRegistry | address | The address of the Metadata Registry |

### setMinter

```solidity
function setMinter(address minter, bool enabled) external nonpayable
```

Enable or disable the ability of `minter` to mint tokens

#### Parameters

| Name    | Type    | Description                                      |
| ------- | ------- | ------------------------------------------------ |
| minter  | address | address that will be given/removed minter right. |
| enabled | bool    | set whether the minter is enabled or disabled.   |

### setOperatorRegistry

```solidity
function setOperatorRegistry(contract IOperatorFilterRegistry registry) external nonpayable
```

sets filter registry address deployed in test

#### Parameters

| Name     | Type                             | Description                 |
| -------- | -------------------------------- | --------------------------- |
| registry | contract IOperatorFilterRegistry | the address of the registry |

### setRoyaltyManager

```solidity
function setRoyaltyManager(address royaltyManager) external nonpayable
```

set royalty manager

#### Parameters

| Name           | Type    | Description                                                  |
| -------------- | ------- | ------------------------------------------------------------ |
| royaltyManager | address | address of the manager contract for common royalty recipient |

### setSuperOperator

```solidity
function setSuperOperator(address superOperator, bool enabled) external nonpayable
```

Enable or disable the ability of `superOperator` to transfer tokens of all
(superOperator rights).

#### Parameters

| Name          | Type    | Description                                             |
| ------------- | ------- | ------------------------------------------------------- |
| superOperator | address | address that will be given/removed superOperator right. |
| enabled       | bool    | set whether the superOperator is enabled or disabled.   |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

Check if the contract supports an interface

#### Parameters

| Name        | Type   | Description             |
| ----------- | ------ | ----------------------- |
| interfaceId | bytes4 | The id of the interface |

#### Returns

| Name | Type | Description                        |
| ---- | ---- | ---------------------------------- |
| \_0  | bool | True if the interface is supported |

### symbol

```solidity
function symbol() external pure returns (string)
```

Return the symbol of the token contract

#### Returns

| Name | Type   | Description                      |
| ---- | ------ | -------------------------------- |
| \_0  | string | The symbol of the token contract |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) external view returns (string)
```

Return the URI of a specific token

#### Parameters

| Name    | Type    | Description         |
| ------- | ------- | ------------------- |
| tokenId | uint256 | The id of the token |

#### Returns

| Name | Type   | Description          |
| ---- | ------ | -------------------- |
| \_0  | string | The URI of the token |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) external nonpayable
```

Transfer a token between 2 addresses

#### Parameters

| Name    | Type    | Description                |
| ------- | ------- | -------------------------- |
| from    | address | The sender of the token    |
| to      | address | The recipient of the token |
| tokenId | uint256 | The id of the token        |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```

Set the address of the new owner of the contract

#### Parameters

| Name     | Type    | Description          |
| -------- | ------- | -------------------- |
| newOwner | address | address of new owner |

### transferQuad

```solidity
function transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes data) external nonpayable
```

transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)

#### Parameters

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| from | address | current owner of the quad                |
| to   | address | destination                              |
| size | uint256 | The size of the quad                     |
| x    | uint256 | The bottom left x coordinate of the quad |
| y    | uint256 | The bottom left y coordinate of the quad |
| data | bytes   | additional data for transfer             |

### width

```solidity
function width() external pure returns (uint256)
```

total width of the map

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | width       |

## Events

### AdminChanged

```solidity
event AdminChanged(address indexed oldAdmin, address indexed newAdmin)
```

Emits when the contract administrator is changed.

#### Parameters

| Name               | Type    | Description                                |
| ------------------ | ------- | ------------------------------------------ |
| oldAdmin `indexed` | address | The address of the previous administrator. |
| newAdmin `indexed` | address | The address of the new administrator.      |

### Approval

```solidity
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
```

_Emitted when `owner` enables `approved` to manage the `tokenId` token._

#### Parameters

| Name               | Type    | Description |
| ------------------ | ------- | ----------- |
| owner `indexed`    | address | undefined   |
| approved `indexed` | address | undefined   |
| tokenId `indexed`  | uint256 | undefined   |

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
```

_Emitted when `owner` enables or disables (`approved`) `operator` to manage all
of its assets._

#### Parameters

| Name               | Type    | Description |
| ------------------ | ------- | ----------- |
| owner `indexed`    | address | undefined   |
| operator `indexed` | address | undefined   |
| approved           | bool    | undefined   |

### ContractRegistered

```solidity
event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe)
```

emitted when the contract is registered into the registry

#### Parameters

| Name                               | Type    | Description                               |
| ---------------------------------- | ------- | ----------------------------------------- |
| subscriptionOrRegistrant `indexed` | address | address to subscribe or copy entries from |
| subscribe                          | bool    | should it subscribe                       |

### Initialized

```solidity
event Initialized(uint64 version)
```

_Triggered when the contract has been initialized or reinitialized._

#### Parameters

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| version | uint64 | undefined   |

### MetadataRegistrySet

```solidity
event MetadataRegistrySet(address indexed metadataRegistry)
```

emitted when the metadata registry is set

#### Parameters

| Name                       | Type    | Description                          |
| -------------------------- | ------- | ------------------------------------ |
| metadataRegistry `indexed` | address | the address of the metadata registry |

### Minter

```solidity
event Minter(address indexed minter, bool enabled)
```

#### Parameters

| Name             | Type    | Description |
| ---------------- | ------- | ----------- |
| minter `indexed` | address | undefined   |
| enabled          | bool    | undefined   |

### OperatorRegistrySet

```solidity
event OperatorRegistrySet(contract IOperatorFilterRegistry indexed registry)
```

emitted when a registry is set

#### Parameters

| Name               | Type                             | Description                    |
| ------------------ | -------------------------------- | ------------------------------ |
| registry `indexed` | contract IOperatorFilterRegistry | address of the registry to set |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```

emitted when the ownership of the contract is changed

#### Parameters

| Name                    | Type    | Description                   |
| ----------------------- | ------- | ----------------------------- |
| previousOwner `indexed` | address | The old address of the owner. |
| newOwner `indexed`      | address | The new address of the owner. |

### RoyaltyManagerSet

```solidity
event RoyaltyManagerSet(address indexed royaltyManager)
```

emitted when the royalty manager is set

#### Parameters

| Name                     | Type    | Description                              |
| ------------------------ | ------- | ---------------------------------------- |
| royaltyManager `indexed` | address | the address of royalty manager contract. |

### SuperOperator

```solidity
event SuperOperator(address indexed superOperator, bool indexed enabled)
```

#### Parameters

| Name                    | Type    | Description                                             |
| ----------------------- | ------- | ------------------------------------------------------- |
| superOperator `indexed` | address | address that will be given/removed superOperator right. |
| enabled `indexed`       | bool    | set whether the superOperator is enabled or disabled.   |

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
```

_Emitted when `tokenId` token is transferred from `from` to `to`._

#### Parameters

| Name              | Type    | Description |
| ----------------- | ------- | ----------- |
| from `indexed`    | address | undefined   |
| to `indexed`      | address | undefined   |
| tokenId `indexed` | uint256 | undefined   |

## Errors

### AlreadyMinted

```solidity
error AlreadyMinted(uint256 tokenId)
```

the token is already minted

#### Parameters

| Name    | Type    | Description    |
| ------- | ------- | -------------- |
| tokenId | uint256 | the id of land |

### ERC721IncorrectOwner

```solidity
error ERC721IncorrectOwner(address sender, uint256 tokenId, address owner)
```

_Indicates an error related to the ownership over a particular token. Used in
transfers._

#### Parameters

| Name    | Type    | Description                                 |
| ------- | ------- | ------------------------------------------- |
| sender  | address | Address whose tokens are being transferred. |
| tokenId | uint256 | Identifier number of a token.               |
| owner   | address | Address of the current owner of a token.    |

### ERC721InsufficientApproval

```solidity
error ERC721InsufficientApproval(address operator, uint256 tokenId)
```

_Indicates a failure with the `operator`’s approval. Used in transfers._

#### Parameters

| Name     | Type    | Description                                                                 |
| -------- | ------- | --------------------------------------------------------------------------- |
| operator | address | Address that may be allowed to operate on tokens without being their owner. |
| tokenId  | uint256 | Identifier number of a token.                                               |

### ERC721InvalidApprover

```solidity
error ERC721InvalidApprover(address approver)
```

_Indicates a failure with the `approver` of a token to be approved. Used in
approvals._

#### Parameters

| Name     | Type    | Description                               |
| -------- | ------- | ----------------------------------------- |
| approver | address | Address initiating an approval operation. |

### ERC721InvalidBatchReceiver

```solidity
error ERC721InvalidBatchReceiver(address receiver)
```

when calling onERC721BatchReceived callback the target contract rejected the
call

#### Parameters

| Name     | Type    | Description            |
| -------- | ------- | ---------------------- |
| receiver | address | the receiving contract |

### ERC721InvalidOperator

```solidity
error ERC721InvalidOperator(address operator)
```

_Indicates a failure with the `operator` to be approved. Used in approvals._

#### Parameters

| Name     | Type    | Description                                                                 |
| -------- | ------- | --------------------------------------------------------------------------- |
| operator | address | Address that may be allowed to operate on tokens without being their owner. |

### ERC721InvalidOwner

```solidity
error ERC721InvalidOwner(address owner)
```

_Indicates that an address can&#39;t be an owner. For example, `address(0)` is a
forbidden owner in EIP-20. Used in balance queries._

#### Parameters

| Name  | Type    | Description                              |
| ----- | ------- | ---------------------------------------- |
| owner | address | Address of the current owner of a token. |

### ERC721InvalidReceiver

```solidity
error ERC721InvalidReceiver(address receiver)
```

_Indicates a failure with the token `receiver`. Used in transfers._

#### Parameters

| Name     | Type    | Description                                    |
| -------- | ------- | ---------------------------------------------- |
| receiver | address | Address to which tokens are being transferred. |

### ERC721InvalidSender

```solidity
error ERC721InvalidSender(address sender)
```

_Indicates a failure with the token `sender`. Used in transfers._

#### Parameters

| Name   | Type    | Description                                 |
| ------ | ------- | ------------------------------------------- |
| sender | address | Address whose tokens are being transferred. |

### ERC721NonexistentToken

```solidity
error ERC721NonexistentToken(uint256 tokenId)
```

_Indicates a `tokenId` whose `owner` is the zero address._

#### Parameters

| Name    | Type    | Description                   |
| ------- | ------- | ----------------------------- |
| tokenId | uint256 | Identifier number of a token. |

### InvalidAddress

```solidity
error InvalidAddress()
```

an address passed as argument is invalid

### InvalidArgument

```solidity
error InvalidArgument()
```

an argument passed is invalid

### InvalidCoordinates

```solidity
error InvalidCoordinates(uint256 size, uint256 x, uint256 y)
```

the coordinates are invalid

#### Parameters

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| size | uint256 | The size of the quad                     |
| x    | uint256 | The bottom left x coordinate of the quad |
| y    | uint256 | The bottom left y coordinate of the quad |

### InvalidInitialization

```solidity
error InvalidInitialization()
```

_The contract is already initialized._

### InvalidLength

```solidity
error InvalidLength()
```

an array argument has an invalid length

### NotInitializing

```solidity
error NotInitializing()
```

_The contract is not initializing._

### NotOwner

```solidity
error NotOwner(uint256 x, uint256 y)
```

is not the owner of the quad

#### Parameters

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| x    | uint256 | The bottom left x coordinate of the quad |
| y    | uint256 | The bottom left y coordinate of the quad |

### OnlyAdmin

```solidity
error OnlyAdmin()
```

only admin can call this function

### OperatorNotAllowed

```solidity
error OperatorNotAllowed()
```

the caller is not the operator

# Links

- [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land)
