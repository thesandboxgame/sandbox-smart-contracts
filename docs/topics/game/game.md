---
description: Game
---

# Game

## Introduction

A [GAME]() is a non-fungible ERC-721 token that can be placed on a specific [LAND](../land/land.md) shape. The game will be created in the GameMaker and the creator is able to add [ASSETs](../asset/asset.md) to it to populate its game world.

Learn more about GAME in The Sandbox Metaverse in this [article]().

### Class diagram

```plantuml

class ERC721BaseToken {
    {field} + _numNFTPerAddress: mapping (address => uint256)
    {field} + _owners: mapping (uint256 => uint256)
    {field} + _operatorsForAll: mapping (address => mapping(address => bool))
    {field} + _operators: mapping (uint256 => address)

    + balanceOf(owner)
    + ownerOf(id)
    + approveFor(sender, operator, id)
    + approve(operator, id)
    + getApproved(id)
    + transferFrom(from, to, id)
    + safeTransferFrom(from, to, id)
    + batchTransferFrom(from, to, ids, data)
    + safeBatchTransferFrom(from, to, ids, data)
    + supportsInterface(id)
    + setApprovalForAllFor(sender,operator,approved)
    + setApprovalForAll(operator, approved)
    + isApprovedForAll(owner, operator)
    + burn(id)
    + burnFrom(from, id)


}

class ImmutableERC721 {
    {field} + CREATOR_OFFSET_MULTIPLIER: uint256
    {field} + SUBID_MULTIPLIER: uint256
    {field} + CHAIN_INDEX_OFFSET_MULTIPLIER: uint256
    {field} + STORAGE_ID_MASK: uint256
    {field} + VERSION_MASK: uint256
    {field} + CHAIN_INDEX_MASK: uint256
    {field} + base32Alphabet: uint256
    {field} + _chainIndex: uint8
    + getChainIndex(id)
    + getStorageId(tokenId)
}

interface IGameToken{
    + createGame(from,to,creation,editor,subId)
    + burn(gameId)
    + burnFrom(from,gameId)
    + recoverAssets(from,to,gameId,assetIds)
    + burnAndRecover(from,to,gameId,assetIds)
    + updateGame(from,gameId,update)
    + getAssetBalances(gameId,assetIds)
    + setGameEditor(gameCreator,editor,isEditor)
    + isGameEditor(gameOwner,editor)
    + creatorOf(id)
    + transferCreatorship(sender,original,to)
    + name()
    + symbol()
    + tokenURI()
    + onERC1155Received(operator,from,id,value,data)
    + onERC1155BatchReceived(operator,from,ids,values,data)
}

class GameBaseToken{
    {field} + IAssetToken internal _asset
    {field} + mapping(uint256 => mapping(uint256 => uint256)) private _gameAssets
    {field} + mapping(address => address) private _creatorship
    {field} + mapping(uint256 => bytes32) private _metaData
    {field} + mapping(address => mapping(address => bool)) private _gameEditors
    {field} + address metaTransactionContract
    {field} + address admin
    + name(...)
    + symbol(...)
    + tokenURI(...)
    + supportsInterface(...)
}
ERC721BaseToken <|-- ImmutableERC721
ImmutableERC721 <|-- GameBaseToken
IGameToken <|-- GameBaseToken
GameBaseToken <|-- ChildGameTokenV1
```

### Token id pattern

ERC721 tokens always have a unique ID, in the case of GAME, the unique ID is known as `gameId` and is comprised of the concatenation of `creator,subId,chainIndex,version`. the `gameId` is used as an external id, while the `strgId` is used as an internal id. `strgId` is defined as `gameId & STORAGE_ID_MASK` where `STORAGE_ID_MASK` = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000. In practice, `strgId` is a substring of the `gameId` that does not include the version field. The reason for having both ids is to solve a potential front-running issue that might occur on 3rd party decentralized exchanges when a GAME seller might trick the buyer to buy a downgraded game by pushing a transaction that downgrades the GAME (removing assets from a game for example) before the actual `swap` transaction on the decentralized exchange. Updating a game will result in a change of the external id (`gameId`).

## Processes

Creating a game and updating an existing game are restricted only for the `GameMinter` contract. This contract focuses on validating
the necessary access control checks and charging the fees in SAND. Users that wish to create or update a game should interact with the
`GameMinter` contract.

### Creating a game

Users can call `GameMinter.createGame` (which in turn will call `GameBaseToken.createGame`) to create a game and (optionally) add assets to it.

### Updating a game

A game owner can call `GameMinter.updateGame` (which in turn will call `GameBaseToken.updateGame`) to add/remove assets from a game, which will cause the `version` field of the `gameId` to be incremented by 1, and thus also the `gameId` for this specific game will be changed. Adding assets means transferring these from the `from` address to the game contract address. Removing assets means transferring these from the game contract to the `from` address.

### Burn a game and recover the deposited assets

A game owner can burn his game token to recover the underlying assets that were attached to it. Recovering an asset means transferring the asset back to the game owner from the game contract.

### Transfer creatorship

When a game is created, the original creator of the game is stored in the first 20 bytes of the `gameId`.
The creatorship of a specific game can be transferred to another account by calling `transferCreatorship`.
This function can be called either by the current creator or by a super-operator nominated by him. The current creator of a game can be queried using a call to `creatorOf(uint256 id)`.
