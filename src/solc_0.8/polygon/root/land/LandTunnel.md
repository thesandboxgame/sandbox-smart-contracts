# Audience

The intended audience for .md documentation is auditors, internal developers and external developer contributors.

# Features

This is the implementation of the
matic [fx-pos](https://wiki.polygon.technology/docs/develop/l1-l2-communication/fx-portal/) tunnel for
the [LAND](../../../../solc_0.5/Land.md) contract. This contract must be run on the Ethereum network (L1).

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

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### Paused event

```solidity
event Paused(address account);
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

### SEND_MESSAGE_EVENT_SIG (0x0e387de6)

```solidity
function SEND_MESSAGE_EVENT_SIG() external view returns (bytes32);
```

### batchTransferQuadToL2 (0xc4d168d6)

```solidity
function batchTransferQuadToL2(
  address to,
  uint256[] sizes,
  uint256[] xs,
  uint256[] ys,
  bytes data
) external;
```

### checkpointManager (0xc0857ba0)

```solidity
function checkpointManager() external view returns (address);
```

### fxChildTunnel (0x972c4928)

```solidity
function fxChildTunnel() external view returns (address);
```

### fxRoot (0xde9b771f)

```solidity
function fxRoot() external view returns (address);
```

### getTrustedForwarder (0xce1b815f)

```solidity
function getTrustedForwarder() external view returns (address trustedForwarder);
```

### isTrustedForwarder (0x572b6c05)

```solidity
function isTrustedForwarder(address forwarder) external view returns (bool);
```

### onERC721BatchReceived (0x4b808c46)

```solidity
function onERC721BatchReceived(address, address, uint256[], bytes) external view returns (bytes4);
```

### onERC721Received (0x150b7a02)

```solidity
function onERC721Received(address, address, uint256, bytes) external view returns (bytes4);
```

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

### processedExits (0x607f2d42)

```solidity
function processedExits(bytes32) external view returns (bool);
```

### receiveMessage (0xf953cec7)

```solidity
function receiveMessage(bytes inputData) external;
```

receive message from L2 to L1, validated by proof

This function verifies if the transaction actually happened on child chain

Parameters:

| Name      | Type  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :-------- | :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inputData | bytes | RLP encoded data of the reference tx containing following list of fields  0 - headerNumber - Checkpoint header block number containing the reference tx  1 - blockProof - Proof that the block header (in the child chain) is a leaf in the submitted merkle root  2 - blockNumber - Block number containing the reference tx on child chain  3 - blockTime - Reference tx block time  4 - txRoot - Transactions root of block  5 - receiptRoot - Receipts root of block  6 - receipt - Receipt of the reference transaction  7 - receiptProof - Merkle proof of the reference receipt  8 - branchMask - 32 bits denoting the path of receipt in merkle tree  9 - receiptLogIndex - Log Index to read from the receipt |

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external;
```

Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by
the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any
functionality that is only available to the owner.

### rootToken (0x1f2d0065)

```solidity
function rootToken() external view returns (address);
```

### setFxChildTunnel (0xaea4e49e)

```solidity
function setFxChildTunnel(address _fxChildTunnel) external;
```

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
