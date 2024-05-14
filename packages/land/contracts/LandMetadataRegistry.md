# Audience

The intended audience for .md documentation is auditors, internal developers and
external developer contributors.

# Features

A [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land) is a
digital piece of real-estate in The Sandbox's metaverse. Each LAND is a unique
piece of the metaverse map which is a grid of 408x408 lands.

We want to:

- store on-chain if a LAND is premium or regular, so we can gate some features
  based on this information.
- add an extra information on-chain to "categorize" a LAND with its
  neighborhood, in order to be able to detect in which area/neighborhood this
  LAND is located.

The LandRegistry contract implements a metadata registry for the
[Land](../Land.md) and [PolygonLand](../PolygonLand.md) contracts to store the
premium and neighborhood information.

Given a land TokenId we store:

- Premiumness: a flag that indicates if a land is premium.
- Neighborhood: Lands are grouped in neighborhoods. There are 127 different
  neighborhoods.

## Roles

The land contract has a list of addresses that are the administrators and can
change the metadata for any token.

# Implementation

- Each land type (premiumness + neighborhood) takes 8 bits (1 byte)
- We pack 32 land types in a 32 byte EVM word, so we use 5202 EVM words for the
  whole map.

## Land type

- Key of the map: tokenId / 32
- Value of the map: in each 256 bits we store 32 land types
- Index inside each word: tokenId mod 32

### Land Type

Land Type is stored in a mapping: `mapping(uint256 key => uint256 value)`. Where
key is tokenId / 32 and values is the land type.

| Land Type: 8 bits                              |
| ---------------------------------------------- |
| 1 bit Premiumness + 7 bits Neighborhood number |

### EVM WORD

| Land type 1 | Land type 2 | Land type 3 | Land type 4 | Land type 5 | …   | Land type 28 | Land type 29 | Land type 30 | Land type 31 | Land type 32 |
| ----------- | ----------- | ----------- | ----------- | ----------- | --- | ------------ | ------------ | ------------ | ------------ | ------------ |

### Neighborhood Name

Neighborhood name is stored in the following mapping:
`mapping(uint256 => string) neighborhoodName` it maps from neighborhood number
(1 - 127) to name.

# Methods

### BITS_PER_LAND

```solidity
function BITS_PER_LAND() external view returns (uint256)
```

bits (8) of information stored for each land

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | bytes32 | undefined   |

### LANDS_PER_WORD

```solidity
function LANDS_PER_WORD() external view returns (uint256)
```

amount of land information that can be stored in one EVM word

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### LAND_MASK

```solidity
function LAND_MASK() external view returns (uint256)
```

used to mask the 8 bits of information stored per land

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### NEIGHBORHOOD_MASK

```solidity
function NEIGHBORHOOD_MASK() external view returns (uint256)
```

mask used to extract the neighborhood number

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### PREMIUM_MASK

```solidity
function PREMIUM_MASK() external view returns (uint256)
```

mask used to extract the premium bit

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### UNKNOWN_NEIGHBORHOOD

```solidity
function UNKNOWN_NEIGHBORHOOD() external view returns (string)
```

value returned when the neighborhood is not set yet.

#### Returns

| Name | Type   | Description |
| ---- | ------ | ----------- |
| \_0  | string | undefined   |

### batchGetMetadata

```solidity
function batchGetMetadata(uint256[] tokenIds) external view returns (struct LandMetadataRegistry.BatchSetData[])
```

return the metadata of 32 lands at once

_used to debug, extracting a lot of information that must be unpacked at once._

#### Parameters

| Name     | Type      | Description   |
| -------- | --------- | ------------- |
| tokenIds | uint256[] | the token ids |

#### Returns

| Name | Type                                | Description                               |
| ---- | ----------------------------------- | ----------------------------------------- |
| \_0  | LandMetadataRegistry.BatchSetData[] | the raw metadata for a series of tokenIds |

### batchSetMetadata

```solidity
function batchSetMetadata(LandMetadataRegistry.BatchSetData[] data) external nonpayable
```

#### Parameters

| Name | Type                                | Description |
| ---- | ----------------------------------- | ----------- |
| data | LandMetadataRegistry.BatchSetData[] | undefined   |

### getMetadata

```solidity
function getMetadata(uint256 tokenId) external view returns (bool premium, uint256 neighborhoodId, string neighborhoodName)
```

return the metadata for one land

#### Parameters

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | the token id |

#### Returns

| Name             | Type    | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| premium          | bool    | true if the land is premium                 |
| neighborhoodId   | uint256 | the number that identifies the neighborhood |
| neighborhoodName | string  | the neighborhood name                       |

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

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| \_0  | uint256 | the neighborhoodId number |

### getNeighborhoodName

```solidity
function getNeighborhoodName(uint256 tokenId) external view returns (string)
```

return the neighborhood name

#### Parameters

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | the token id |

#### Returns

| Name | Type   | Description           |
| ---- | ------ | --------------------- |
| \_0  | string | the neighborhood name |

### getNeighborhoodNameForId

```solidity
function getNeighborhoodNameForId(uint256 neighborhoodId) external view returns (string)
```

return the neighborhood name using neighborhood id as the key

#### Parameters

| Name           | Type    | Description                                 |
| -------------- | ------- | ------------------------------------------- |
| neighborhoodId | uint256 | the number that identifies the neighborhood |

#### Returns

| Name | Type   | Description           |
| ---- | ------ | --------------------- |
| \_0  | string | the neighborhood name |

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```

_Returns the admin role that controls `role`. See {grantRole} and {revokeRole}.
To change a role&#39;s admin, use {\_ setRoleAdmin}._

#### Parameters

| Name | Type    | Description |
| ---- | ------- | ----------- |
| role | bytes32 | undefined   |

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | bytes32 | undefined   |

### getRoleMember

```solidity
function getRoleMember(bytes32 role, uint256 index) external view returns (address)
```

_Returns one of the accounts that have `role`. `index` must be a value between 0
and {getRoleMemberCount}, non-inclusive. Role bearers are not sorted in any
particular way, and their ordering may change at any point. WARNING: When using
{getRoleMember} and {getRoleMemberCount}, make sure you perform all queries on
the same block. See the following
https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum
post] for more information._

#### Parameters

| Name  | Type    | Description |
| ----- | ------- | ----------- |
| role  | bytes32 | undefined   |
| index | uint256 | undefined   |

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### getRoleMemberCount

```solidity
function getRoleMemberCount(bytes32 role) external view returns (uint256)
```

_Returns the number of accounts that have `role`. Can be used together with
{getRoleMember} to enumerate all bearers of a role._

#### Parameters

| Name | Type    | Description |
| ---- | ------- | ----------- |
| role | bytes32 | undefined   |

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```

_Grants `role` to `account`. If `account` had not been already granted `role`,
emits a {RoleGranted} event. Requirements: - the caller must have `role`&#39;s
admin role. May emit a {RoleGranted} event._

#### Parameters

| Name    | Type    | Description |
| ------- | ------- | ----------- |
| role    | bytes32 | undefined   |
| account | address | undefined   |

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

_Returns `true` if `account` has been granted `role`._

#### Parameters

| Name    | Type    | Description |
| ------- | ------- | ----------- |
| role    | bytes32 | undefined   |
| account | address | undefined   |

#### Returns

| Name | Type | Description |
| ---- | ---- | ----------- |
| \_0  | bool | undefined   |

### initialize

```solidity
function initialize(address admin_) external nonpayable
```

initializer method, called during deployment

#### Parameters

| Name    | Type    | Description                                          |
| ------- | ------- | ---------------------------------------------------- |
| admin\_ | address | address that have admin access and can assign roles. |

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

| Name | Type | Description                 |
| ---- | ---- | --------------------------- |
| \_0  | bool | true if the land is premium |

### renounceRole

```solidity
function renounceRole(bytes32 role, address callerConfirmation) external nonpayable
```

_Revokes `role` from the calling account. Roles are often managed via
{grantRole} and {revokeRole}: this function&#39;s purpose is to provide a
mechanism for accounts to lose their privileges if they are compromised (such as
when a trusted device is misplaced). If the calling account had been revoked
`role`, emits a {RoleRevoked} event. Requirements: - the caller must be
`callerConfirmation`. May emit a {RoleRevoked} event._

#### Parameters

| Name               | Type    | Description |
| ------------------ | ------- | ----------- |
| role               | bytes32 | undefined   |
| callerConfirmation | address | undefined   |

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```

_Revokes `role` from `account`. If `account` had been granted `role`, emits a
{RoleRevoked} event. Requirements: - the caller must have `role`&#39;s admin
role. May emit a {RoleRevoked} event._

#### Parameters

| Name    | Type    | Description |
| ------- | ------- | ----------- |
| role    | bytes32 | undefined   |
| account | address | undefined   |

### setMetadata

```solidity
function setMetadata(uint256 tokenId, bool premium, uint256 newNeighborhoodId) external nonpayable
```

set the premiumness for one land

#### Parameters

| Name              | Type    | Description                                 |
| ----------------- | ------- | ------------------------------------------- |
| tokenId           | uint256 | the token id                                |
| premium           | bool    | true if the land is premium                 |
| newNeighborhoodId | uint256 | the number that identifies the neighborhood |

### setNeighborhoodId

```solidity
function setNeighborhoodId(uint256 tokenId, uint256 newNeighborhoodId) external nonpayable
```

set the neighborhood for one land

#### Parameters

| Name              | Type    | Description                                 |
| ----------------- | ------- | ------------------------------------------- |
| tokenId           | uint256 | the token id                                |
| newNeighborhoodId | uint256 | the number that identifies the neighborhood |

### setNeighborhoodName

```solidity
function setNeighborhoodName(uint256 neighborhoodId, string name) external nonpayable
```

set neighborhood name

#### Parameters

| Name           | Type    | Description                                 |
| -------------- | ------- | ------------------------------------------- |
| neighborhoodId | uint256 | the number that identifies the neighborhood |
| name           | string  | human readable name                         |

### setPremium

```solidity
function setPremium(uint256 tokenId, bool premium) external nonpayable
```

set the premiumness for one land

#### Parameters

| Name    | Type    | Description                 |
| ------- | ------- | --------------------------- |
| tokenId | uint256 | the token id                |
| premium | bool    | true if the land is premium |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

_See {IERC165-supportsInterface}._

#### Parameters

| Name        | Type   | Description |
| ----------- | ------ | ----------- |
| interfaceId | bytes4 | undefined   |

#### Returns

| Name | Type | Description |
| ---- | ---- | ----------- |
| \_0  | bool | undefined   |

## Events

### BatchMetadataSet

```solidity
event BatchMetadataSet(address indexed operator, LandMetadataRegistry.BatchSetData[] data)
```

This event is emitted when the metadata is set in batch

#### Parameters

| Name               | Type                                | Description                   |
| ------------------ | ----------------------------------- | ----------------------------- |
| operator `indexed` | address                             | the sender of the transaction |
| data               | LandMetadataRegistry.BatchSetData[] | token id and metadata         |

### Initialized

```solidity
event Initialized(uint64 version)
```

_Triggered when the contract has been initialized or reinitialized._

#### Parameters

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| version | uint64 | undefined   |

### MetadataSet

```solidity
event MetadataSet(address indexed operator, uint256 indexed tokenId, uint256 oldNeighborhoodId, bool wasPremium, uint256 newNeighborhoodId, bool isPremium)
```

This event is emitted when the metadata is set for a single land

#### Parameters

| Name               | Type    | Description                                                    |
| ------------------ | ------- | -------------------------------------------------------------- |
| operator `indexed` | address | the sender of the transaction                                  |
| tokenId `indexed`  | uint256 | the token id                                                   |
| oldNeighborhoodId  | uint256 | the number that identifies the neighborhood before changing it |
| wasPremium         | bool    | true if land was premium                                       |
| newNeighborhoodId  | uint256 | the number that identifies the neighborhood                    |
| isPremium          | bool    | true if land is premium                                        |

### NeighborhoodNameSet

```solidity
event NeighborhoodNameSet(address indexed operator, uint256 indexed neighborhoodId, string name)
```

This event is emitted when the neighborhood name is set

#### Parameters

| Name                     | Type    | Description                                 |
| ------------------------ | ------- | ------------------------------------------- |
| operator `indexed`       | address | the sender of the transaction               |
| neighborhoodId `indexed` | uint256 | the number that identifies the neighborhood |
| name                     | string  | human readable name                         |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```

_Emitted when `newAdminRole` is set as `role`&#39;s admin role, replacing
`previousAdminRole` `DEFAULT_ADMIN_ROLE` is the starting admin for all roles,
despite {RoleAdminChanged} not being emitted signaling this._

#### Parameters

| Name                        | Type    | Description |
| --------------------------- | ------- | ----------- |
| role `indexed`              | bytes32 | undefined   |
| previousAdminRole `indexed` | bytes32 | undefined   |
| newAdminRole `indexed`      | bytes32 | undefined   |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```

_Emitted when `account` is granted `role`. `sender` is the account that
originated the contract call, an admin role bearer except when using
{AccessControl-\_setupRole}._

#### Parameters

| Name              | Type    | Description |
| ----------------- | ------- | ----------- |
| role `indexed`    | bytes32 | undefined   |
| account `indexed` | address | undefined   |
| sender `indexed`  | address | undefined   |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```

_Emitted when `account` is revoked `role`. `sender` is the account that
originated the contract call: - if using `revokeRole`, it is the admin role
bearer - if using `renounceRole`, it is the role bearer (i.e. `account`)_

#### Parameters

| Name              | Type    | Description |
| ----------------- | ------- | ----------- |
| role `indexed`    | bytes32 | undefined   |
| account `indexed` | address | undefined   |
| sender `indexed`  | address | undefined   |

## Errors

### AccessControlBadConfirmation

```solidity
error AccessControlBadConfirmation()
```

_The caller of a function is not the expected one. NOTE: Don&#39;t confuse with
{AccessControlUnauthorizedAccount}._

### AccessControlUnauthorizedAccount

```solidity
error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)
```

_The `account` is missing a role._

#### Parameters

| Name       | Type    | Description |
| ---------- | ------- | ----------- |
| account    | address | undefined   |
| neededRole | bytes32 | undefined   |

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

### InvalidBaseTokenId

```solidity
error InvalidBaseTokenId(uint256 tokenId)
```

the base token id used for a batch operation is wrong

#### Parameters

| Name    | Type    | Description         |
| ------- | ------- | ------------------- |
| tokenId | uint256 | the id of the token |

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

### InvalidNeighborhoodId

```solidity
error InvalidNeighborhoodId(uint256 neighborhoodId)
```

the neighborhoodId is invalid

#### Parameters

| Name           | Type    | Description                |
| -------------- | ------- | -------------------------- |
| neighborhoodId | uint256 | the invalid neighborhoodId |

### NotInitializing

```solidity
error NotInitializing()
```

_The contract is not initializing._

### OnlyAdmin

```solidity
error OnlyAdmin()
```

only admin can call this function
