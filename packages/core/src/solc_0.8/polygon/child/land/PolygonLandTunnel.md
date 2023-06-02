# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

This is the implementation of the polygon (L2) layer
matic [fx-pos](https://wiki.polygon.technology/docs/develop/l1-l2-communication/fx-portal/) tunnel for
the [LAND](../../../../solc_0.5/Land.md) contract. This contract must be run on the Matic Polygon network (L2)

The matic pos library works by emitting an event on L2 that later is used by the user to send a transaction on L1. To
avoid reaching the block gas limit on L1 we check the amount of quads and estimate the gas needed on L1 when the tunnel
is called on L2. There is a map of estimated gas used per quad size and two limits: maxAllowedQuads and maxGasLimitOnL1.
Both are checked on L2 before accepting a call to bridge a batch of quads to L1.

The tunnel can be used to move Land and Quads (group of lands, see the Land contract docs) from L1 to L2 and the other
way around as many times as desired.

The tunnel is Ownable and Pausable; it has an owner address that can pause the operation of the tunnel, also it supports
an ERC2771 meta-transaction forwarder that can be set by the owner address.

# Methods

## Events info

### Deposit event

```solidity
event Deposit(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);
```

### MessageSent event

```solidity
event MessageSent(bytes message);
```

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### Paused event

```solidity
event Paused(address account);
```

### SetGasLimit event

```solidity
event SetGasLimit(uint8 size, uint32 limit);
```

### SetMaxAllowedQuads event

```solidity
event SetMaxAllowedQuads(uint256 maxQuads);
```

### SetMaxGasLimit event

```solidity
event SetMaxGasLimit(uint32 maxGasLimit);
```

### Unpaused event

```solidity
event Unpaused(address account);
```

### Withdraw event

```solidity
event Withdraw(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);
```

## Functions info

### batchTransferQuadToL1 (0x3f360a40)

```solidity
function batchTransferQuadToL1(
  address to,
  uint256[] sizes,
  uint256[] xs,
  uint256[] ys,
  bytes data
) external;
```

send a batch of quads to L1

Parameters:

| Name  | Type      | Description                                           |
| :---- | :-------- | :---------------------------------------------------- |
| to    | address   | address of the receiver on L1                         |
| sizes | uint256[] | sizes of quad                                         |
| xs    | uint256[] | x coordinates of quads                                |
| ys    | uint256[] | y coordinates of quads                                |
| data  | bytes     | data send to the receiver onERC721BatchReceived on L1 |

### childToken (0xac0007de)

```solidity
function childToken() external view returns (address);
```

### fxChild (0x450d11f0)

```solidity
function fxChild() external view returns (address);
```

### fxRootTunnel (0x7f1e9cb0)

```solidity
function fxRootTunnel() external view returns (address);
```

### gasLimits (0x21f599f2)

```solidity
function gasLimits(uint8) external view returns (uint32);
```

### getTrustedForwarder (0xce1b815f)

```solidity
function getTrustedForwarder() external view returns (address trustedForwarder);
```

### initialize (0xc7fd6625)

```solidity
function initialize(
  address _fxChild,
  address _childToken,
  address _trustedForwarder,
  uint32 _maxGasLimit,
  uint256 _maxAllowedQuads,
  uint32[5] limits
) external;
```

initialize the contract

Parameters:

| Name              | Type      | Description                                             |
| :---------------- | :-------- | :------------------------------------------------------ |
| _fxChild          | address   | fx child tunnel contract address                        |
| _trustedForwarder | address   | address of an ERC2771 meta transaction sender contract  |
| _maxGasLimit      | uint32    | maximum accepted gas limit                              |
| _maxAllowedQuads  | uint256   | maximum number of quads accepted                        |
| limits            | uint32[5] | the estimated gas that the L1 tx will use per quad size |

### isTrustedForwarder (0x572b6c05)

```solidity
function isTrustedForwarder(address forwarder) external view returns (bool);
```

### maxAllowedQuads (0x0f758c05)

```solidity
function maxAllowedQuads() external view returns (uint256);
```

### maxGasLimitOnL1 (0xee89d41c)

```solidity
function maxGasLimitOnL1() external view returns (uint32);
```

### onERC721BatchReceived (0x4b808c46)

```solidity
function onERC721BatchReceived(
  address operator,
  address,
  uint256[],
  bytes
) external view returns (bytes4);
```

called on ERC721 batch trasnfer to this contract

Parameters:

| Name     | Type    | Description                                 |
| :------- | :------ | :------------------------------------------ |
| operator | address | address of the one sending the ERC721 Token |

Return values:

| Name | Type   | Description                             |
| :--- | :----- | :-------------------------------------- |
| _0   | bytes4 | onERC721BatchReceived function selector |

### onERC721Received (0x150b7a02)

```solidity
function onERC721Received(
  address operator,
  address,
  uint256,
  bytes
) external view returns (bytes4);
```

called on ERC721 trasnfer to this contract

Parameters:

| Name     | Type    | Description                                 |
| :------- | :------ | :------------------------------------------ |
| operator | address | address of the one sending the ERC721 Token |

Return values:

| Name | Type   | Description                        |
| :--- | :----- | :--------------------------------- |
| _0   | bytes4 | onERC721Received function selector |

### owner (0x8da5cb5b)

```solidity
function owner() external view returns (address);
```

Returns the address of the current owner.

### pause (0x8456cb59)

```solidity
function pause() external;
```

Pauses all token transfers across bridge

### paused (0x5c975abb)

```solidity
function paused() external view returns (bool);
```

Returns true if the contract is paused, and false otherwise.

### processMessageFromRoot (0x9a7c4b71)

```solidity
function processMessageFromRoot(uint256 stateId, address rootMessageSender, bytes data) external;
```

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external;
```

Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by
the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any
functionality that is only available to the owner.

### setFxRootTunnel (0x88837094)

```solidity
function setFxRootTunnel(address _fxRootTunnel) external;
```

### setLimit (0x21642b18)

```solidity
function setLimit(uint8 size, uint32 limit) external;
```

set the estimate of gas that the L1 transaction will use per quad size

Parameters:

| Name  | Type   | Description                               |
| :---- | :----- | :---------------------------------------- |
| size  | uint8  | the size of the quad                      |
| limit | uint32 | the estimated gas that the L1 tx will use |

### setMaxAllowedQuads (0xfcd7de63)

```solidity
function setMaxAllowedQuads(uint256 _maxAllowedQuads) external;
```

set the limit of quads we can send in one tx to L1

Parameters:

| Name             | Type    | Description                      |
| :--------------- | :------ | :------------------------------- |
| _maxAllowedQuads | uint256 | maximum number of quads accepted |

### setMaxLimitOnL1 (0x1e00b31a)

```solidity
function setMaxLimitOnL1(uint32 _maxGasLimit) external;
```

set the limit of estimated gas we accept when sending a batch of quads to L1

Parameters:

| Name         | Type   | Description                |
| :----------- | :----- | :------------------------- |
| _maxGasLimit | uint32 | maximum accepted gas limit |

### setTrustedForwarder (0xda742228)

```solidity
function setTrustedForwarder(address trustedForwarder) external;
```

Change the address of the trusted forwarder for meta-TX

Parameters:

| Name             | Type    | Description              |
| :--------------- | :------ | :----------------------- |
| trustedForwarder | address | The new trustedForwarder |

### setupLimits (0x0e161578)

```solidity
function setupLimits(uint32[5] limits) external;
```

set the estimate of gas that the L1 transaction will use per quad size

Parameters:

| Name   | Type      | Description                                             |
| :----- | :-------- | :------------------------------------------------------ |
| limits | uint32[5] | the estimated gas that the L1 tx will use per quad size |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool);
```

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```

Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

### unpause (0x3f4ba83a)

```solidity
function unpause() external;
```

Unpauses all token transfers across bridge

# Links

- [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land)
