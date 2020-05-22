---
title: Smart Contract Reference

language_tabs: # must be one of https://git.io/vQNgJ
- javascript

toc_footers:
- <a href='https://github.com/thesandboxgame/sandbox-smart-contracts'>Smart Contract repository</a>

# includes:
# - errors

search: true
---

# Introduction

Welcome to the Sandbox Smart contract documentation!

# Setting Up

> You can clone and setup the repo via the following:

```
git clone https://github.com/thesandboxgame/sandbox-smart-contracts
cd sandbox-smart-contracts
yarn
```

The example shown here can be executed from a clone of this repo :
https://github.com/thesandboxgame/sandbox-smart-contracts

# Executing scripts

> this will execute the script against mainnet.

```
yarn run:mainnet
<script file>
  ```

The repo contains all address and abi information to all our deployed contract.
Our scripts uses buidler and buidler-deploy to fetch that info automatically.

# Examples

```javascript
  const { ethers } = require("@nomiclabs/buidler");
  (async () => {
    const Land = await ethers.getContract("Land");
    const contractName = await Land.callStatic.name();
    console.log({ contractName });
  })();
  ```

Scripts can fetch info like shown here, but they can also write data assuming you have put your mnemonic in the `.mnemonic` file.

# GraphQL queries

```graphql
  {
    alls(first: 5) {
      id
      numLands
      numLandsMinted
      numAssets
    }
    landTokens(first: 5) {
      id
      owner
      x
      y
    }
  }
  ```

We also have examples for graphql queries against our subgraph : https://thegraph.com/explorer/subgraph/pixowl/the-sandbox

# Land GraphQL

> Get the first 5 lands

```graphql
  {
    landTokens(first: 5) {
      id
      owner
      x
      y
    }
  }
  ```

> The above command returns JSON structured like this:

```json
  {
    "data": {
      "landTokens": [
        {
          "id": "100101",
          "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
          "x": 141,
          "y": 245
        },
        {
          "id": "100102",
          "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
          "x": 142,
          "y": 245
        },
        {
          "id": "100103",
          "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
          "x": 143,
          "y": 245
        },
        {
          "id": "100104",
          "owner": "0xb2299149cdd796ab78415e80e99269e3d23d9b89",
          "x": 144,
          "y": 245
        },
        {
          "id": "100105",
          "owner": "0xb2299149cdd796ab78415e80e99269e3d23d9b89",
          "x": 145,
          "y": 245
        }
      ]
    }
  }
  ```

> Get a Specific Land via x and y

```graphql
  {
    landTokens(where: { x: 142, y: 245 }) {
      id
      owner
      x
      y
    }
  }
  ```

> The above command returns JSON structured like this:

```json
  {
    "data": {
      "landTokens": [
        {
          "id": "100102",
          "owner": "0xb01b31f8ebdf2ba6371b9d8cdca8b9cbe06face7",
          "x": 142,
          "y": 245
        }
      ]
    }
  }
  ```

Our GraphQL API is hosted on thegrah.com


# Contracts ABI



## ERC20BaseToken


### Functions
#### name()
A descriptive name for the tokens

##### Returns
name: of the tokens
------------------------------------------


#### symbol()
An abbreviated name for the tokens

##### Returns
symbol: of the tokens
------------------------------------------


#### totalSupply()
Gets the total number of tokens in existence.

##### Returns
the: total number of tokens in existence.
------------------------------------------


#### balanceOf(address owner)
Gets the balance of `owner`.

##### Returns
The: amount owned by `owner`.
------------------------------------------


#### allowance(address owner, address spender)
gets allowance of `spender` for `owner`'s tokens.

##### Returns
remaining: the amount of token `spender` is allowed to transfer on behalf of `owner`.
------------------------------------------


#### decimals()
returns the number of decimals for that token.

##### Returns
the: number of decimals.
------------------------------------------


#### transfer(address to, uint256 amount)
Transfer `amount` tokens to `to`.

##### Returns
success: true if success.
------------------------------------------


#### transferFrom(address from, address to, uint256 amount)
Transfer `amount` tokens from `from` to `to`.

##### Returns
success: true if success.
------------------------------------------


#### burn(uint256 amount)
burn `amount` tokens.

------------------------------------------


#### burnFor(address from, uint256 amount)
burn `amount` tokens from `owner`.

------------------------------------------


#### approve(address spender, uint256 amount)
approve `spender` to transfer `amount` tokens.

##### Returns
success: true if success.
------------------------------------------


#### approveFor(address owner, address spender, uint256 amount)
approve `spender` to transfer `amount` tokens from `owner`.

##### Returns
success: true if success.
------------------------------------------


#### addAllowanceIfNeeded(address owner, address spender, uint256 amountNeeded)

------------------------------------------


#### _firstBytes32(bytes src)

------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
Approval(owner, spender, value)

Transfer(from, to, value)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## ERC721BaseToken


### Functions
#### balanceOf(address owner)
Return the number of Land owned by an address

##### Returns
The: number of Land token owned by the address
------------------------------------------


#### ownerOf(uint256 id)
Return the owner of a Land

##### Returns
owner: The address of the owner
------------------------------------------


#### approveFor(address sender, address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### approve(address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### getApproved(uint256 id)
Get the approved operator for a specific token

##### Returns
The: address of the operator
------------------------------------------


#### transferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id, bytes data)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses

------------------------------------------


#### safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses ensuring the receiving contract has a receiver method

------------------------------------------


#### supportsInterface(bytes4 id)
Check if the contract supports an interface
0x01ffc9a7 is ERC-165
0x80ac58cd is ERC-721

##### Returns
True: if the interface is supported
------------------------------------------


#### setApprovalForAllFor(address sender, address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### setApprovalForAll(address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### isApprovedForAll(address owner, address operator)
Check if the sender approved the operator

##### Returns
isOperator: The status of the approval
------------------------------------------


#### burn(uint256 id)
Burns token `id`.

------------------------------------------


#### burnFrom(address from, uint256 id)
Burn token`id` from `from`.

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)

Transfer(_from, _to, _tokenId)

Approval(_owner, _approved, _tokenId)

ApprovalForAll(_owner, _operator, _approved)








## Catalyst


### Functions
#### constructor(string name, string symbol, address admin, address minter, uint8 rarity, uint16 maxGems, uint16[] quantityRange, uint16[] valueRange)

------------------------------------------


#### getMinter()

------------------------------------------


#### setMinter(address newMinter)

------------------------------------------


#### mint(address to, uint256 amount)

------------------------------------------


#### getAttributes(struct CatalystToken.Gem[] gems)

------------------------------------------


#### getValue(uint32 gemId, uint256 slotIndex, bytes32 blockHash)
compute value given a blockHash, the blockHash need to correspon to the blockNumber associated with the gem
------------------------------------------


#### getMintData()

------------------------------------------


#### decimals()
returns the number of decimals for that token.

##### Returns
the: number of decimals.
------------------------------------------


#### name()
A descriptive name for the tokens

##### Returns
name: of the tokens
------------------------------------------


#### symbol()
An abbreviated name for the tokens

##### Returns
symbol: of the tokens
------------------------------------------


#### totalSupply()
Gets the total number of tokens in existence.

##### Returns
the: total number of tokens in existence.
------------------------------------------


#### balanceOf(address owner)
Gets the balance of `owner`.

##### Returns
The: amount owned by `owner`.
------------------------------------------


#### allowance(address owner, address spender)
gets allowance of `spender` for `owner`'s tokens.

##### Returns
remaining: the amount of token `spender` is allowed to transfer on behalf of `owner`.
------------------------------------------


#### transfer(address to, uint256 amount)
Transfer `amount` tokens to `to`.

##### Returns
success: true if success.
------------------------------------------


#### transferFrom(address from, address to, uint256 amount)
Transfer `amount` tokens from `from` to `to`.

##### Returns
success: true if success.
------------------------------------------


#### burn(uint256 amount)
burn `amount` tokens.

------------------------------------------


#### burnFor(address from, uint256 amount)
burn `amount` tokens from `owner`.

------------------------------------------


#### approve(address spender, uint256 amount)
approve `spender` to transfer `amount` tokens.

##### Returns
success: true if success.
------------------------------------------


#### approveFor(address owner, address spender, uint256 amount)
approve `spender` to transfer `amount` tokens from `owner`.

##### Returns
success: true if success.
------------------------------------------


#### addAllowanceIfNeeded(address owner, address spender, uint256 amountNeeded)

------------------------------------------


#### _firstBytes32(bytes src)

------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
Minter(newMinter)

Approval(owner, spender, value)

Transfer(from, to, value)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## CatalystToken


### Functions
#### getAttributes(struct CatalystToken.Gem[])

------------------------------------------


#### getMintData()

------------------------------------------


#### burnFor(address from, uint256 amount)

------------------------------------------


#### burn(uint256 amount)

------------------------------------------


#### transferFrom(address from, address to, uint256 value)

------------------------------------------


#### approve(address spender, uint256 value)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### transfer(address to, uint256 value)

------------------------------------------





### Events
Approval(owner, spender, value)

Transfer(from, to, value)








## ERC20Group


### Functions
#### getMinter()

------------------------------------------


#### setMinter(address newMinter)

------------------------------------------


#### mint(address to, uint256 id, uint256 amount)

------------------------------------------


#### addSubToken(contract ERC20SubToken subToken)

------------------------------------------


#### supplyOf(uint256 id)

------------------------------------------


#### balanceOf(address owner, uint256 id)

------------------------------------------


#### balanceOfBatch(address[] owners, uint256[] tokenIds)

------------------------------------------


#### singleTransferFrom(address from, address to, uint256 id, uint256 value)

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, uint256[] values)

------------------------------------------


#### setApprovalForAllFor(address sender, address operator, bool approved)

------------------------------------------


#### setApprovalForAll(address operator, bool approved)

------------------------------------------


#### isApprovedForAll(address owner, address operator)

------------------------------------------


#### burnFor(address from, uint256 id, uint256 value)

------------------------------------------


#### burn(uint256 id, uint256 value)

------------------------------------------


#### burnEachFor(address from, uint256[] ids, uint256 value)

------------------------------------------


#### constructor(address admin, address minter)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
SubToken(subToken)

ApprovalForAll(owner, operator, approved)

Minter(newMinter)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## ERC20SubToken


### Functions
#### name()
A descriptive name for the tokens

##### Returns
name: of the tokens
------------------------------------------


#### symbol()
An abbreviated name for the tokens

##### Returns
symbol: of the tokens
------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### decimals()

------------------------------------------


#### transfer(address to, uint256 amount)

------------------------------------------


#### transferFrom(address from, address to, uint256 amount)

------------------------------------------


#### approve(address spender, uint256 amount)

------------------------------------------


#### approveFor(address from, address spender, uint256 amount)

------------------------------------------


#### setSubTokenIndex(contract ERC20Group group, uint256 index)

------------------------------------------


#### emitTransferEvent(address from, address to, uint256 amount)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### _firstBytes32(bytes src)

------------------------------------------


#### constructor(string tokenName, string tokenSymbol, address admin)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)

Transfer(from, to, value)

Approval(owner, spender, value)








## ERC1155Core


### Functions
#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## CatalystMinter


### Functions
#### mint(address from, uint40 packId, bytes32 metadataHash, contract CatalystToken catalystToken, uint256[] gemIds, uint256 quantity, address to, bytes data)
mint common Asset token by paying the Sand fee

------------------------------------------


#### extractAndChangeCatalyst(address from, uint256 assetId, contract CatalystToken catalystToken, uint256[] gemIds, address to)

------------------------------------------


#### changeCatalyst(address from, uint256 assetId, contract CatalystToken catalystToken, uint256[] gemIds, address to)

------------------------------------------


#### extractAndAddGems(address from, uint256 assetId, uint256[] gemIds, address to)

------------------------------------------


#### addGems(address from, uint256 assetId, uint256[] gemIds, address to)

------------------------------------------


#### mintMultiple(address from, uint40 packId, bytes32 metadataHash, struct CatalystMinter.AssetData[] assets, address to, bytes data)

------------------------------------------


#### constructor(contract CatalystRegistry catalystRegistry, contract ERC20Extended sand, contract AssetToken asset, contract ERC20Group gems, address metaTx, address admin, contract CatalystToken[] catalysts)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
MetaTransactionProcessor(metaTransactionProcessor, enabled)

AdminChanged(oldAdmin, newAdmin)








## CatalystRegistry


### Functions
#### setCatalyst(uint256 assetId, contract CatalystToken catalystToken, uint256[] gemIds)

------------------------------------------


#### addGems(uint256 assetId, uint256[] gemIds)

------------------------------------------


#### getCatalyst(uint256 assetId)

------------------------------------------


#### getAttributes(uint256 assetId)

------------------------------------------


#### constructor(contract AssetToken asset, contract CatalystToken catalystToken, address admin)

------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
AdminChanged(oldAdmin, newAdmin)








## Estate


### Functions
#### constructor(address metaTransactionContract, address admin, contract LandToken land)

------------------------------------------


#### name()
Return the name of the token contract

##### Returns
The: name of the token contract
------------------------------------------


#### symbol()
Return the symbol of the token contract

##### Returns
The: symbol of the token contract
------------------------------------------


#### tokenURI(uint256 id)
Return the URI of a specific token

##### Returns
The: URI of the token
------------------------------------------


#### supportsInterface(bytes4 id)
Check if the contract supports an interface
0x01ffc9a7 is ERC-165
0x80ac58cd is ERC-721
0x5b5e139f is ERC-721 metadata

##### Returns
True: if the interface is supported
------------------------------------------


#### setMinter(address minter)
Set the Minter that will be the only address able to create Estate

------------------------------------------


#### getMinter()
return the current minter
------------------------------------------


#### setBreaker(address breaker)
Set the Breaker that will be the only address able to break Estate apart

------------------------------------------


#### getBreaker()
return the current breaker
------------------------------------------


#### createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y)
create an Estate from a quad (a group of land forming a square on a specific grid in the Land contract)

------------------------------------------


#### addQuad(address sender, uint256 estateId, uint256 size, uint256 x, uint256 y, uint256 junction)
add a single quad to an existing estate

------------------------------------------


#### createFromMultipleLands(address sender, address to, uint256[] ids, uint256[] junctions)
create an Estate from a set of Lands, these need to be adjacent so they form a connected whole

------------------------------------------


#### addSingleLand(address sender, uint256 estateId, uint256 id, uint256 junction)
add a single land to an existing estate

------------------------------------------


#### addMultipleLands(address sender, uint256 estateId, uint256[] ids, uint256[] junctions)
add a multiple lands to an existing estate

------------------------------------------


#### createFromMultipleQuads(address sender, address to, uint256[] sizes, uint256[] xs, uint256[] ys, uint256[] junctions)
create an Estate from a set of Quads, these need to be adjacent so they form a connected whole

------------------------------------------


#### addMultipleQuads(address sender, uint256 estateId, uint256[] sizes, uint256[] xs, uint256[] ys, uint256[] junctions)
add a multiple lands to an existing estate

------------------------------------------


#### burn(uint256 id)
burn an Estate

------------------------------------------


#### burnFrom(address from, uint256 id)
burn an Estate on behalf

------------------------------------------


#### burnAndTransferFrom(address sender, uint256 estateId, address to)
burn an Estate on behalf and transfer land

------------------------------------------


#### transferAllFromDestroyedEstate(address sender, uint256 estateId, address to)
transfer all lands from a burnt estate

------------------------------------------


#### transferFromDestroyedEstate(address sender, uint256 estateId, uint256 num, address to)
transfer a certain number of lands from a burnt estate

------------------------------------------


#### onERC721BatchReceived(address operator, address from, uint256[] ids, bytes data)

------------------------------------------


#### onERC721Received(address operator, address, uint256, bytes)

------------------------------------------


#### balanceOf(address owner)
Return the number of Land owned by an address

##### Returns
The: number of Land token owned by the address
------------------------------------------


#### ownerOf(uint256 id)
Return the owner of a Land

##### Returns
owner: The address of the owner
------------------------------------------


#### approveFor(address sender, address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### approve(address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### getApproved(uint256 id)
Get the approved operator for a specific token

##### Returns
The: address of the operator
------------------------------------------


#### transferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id, bytes data)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses

------------------------------------------


#### safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses ensuring the receiving contract has a receiver method

------------------------------------------


#### setApprovalForAllFor(address sender, address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### setApprovalForAll(address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### isApprovedForAll(address owner, address operator)
Check if the sender approved the operator

##### Returns
isOperator: The status of the approval
------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
QuadsAdded(id, list)

QuadsRemoved(id, numRemoved)

Minter(newMinter)

Breaker(newBreaker)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)

Transfer(_from, _to, _tokenId)

Approval(_owner, _approved, _tokenId)

ApprovalForAll(_owner, _operator, _approved)








## EstateBaseToken


### Functions
#### constructor(address metaTransactionContract, address admin, contract LandToken land)

------------------------------------------


#### setMinter(address minter)
Set the Minter that will be the only address able to create Estate

------------------------------------------


#### getMinter()
return the current minter
------------------------------------------


#### setBreaker(address breaker)
Set the Breaker that will be the only address able to break Estate apart

------------------------------------------


#### getBreaker()
return the current breaker
------------------------------------------


#### createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y)
create an Estate from a quad (a group of land forming a square on a specific grid in the Land contract)

------------------------------------------


#### addQuad(address sender, uint256 estateId, uint256 size, uint256 x, uint256 y, uint256 junction)
add a single quad to an existing estate

------------------------------------------


#### createFromMultipleLands(address sender, address to, uint256[] ids, uint256[] junctions)
create an Estate from a set of Lands, these need to be adjacent so they form a connected whole

------------------------------------------


#### addSingleLand(address sender, uint256 estateId, uint256 id, uint256 junction)
add a single land to an existing estate

------------------------------------------


#### addMultipleLands(address sender, uint256 estateId, uint256[] ids, uint256[] junctions)
add a multiple lands to an existing estate

------------------------------------------


#### createFromMultipleQuads(address sender, address to, uint256[] sizes, uint256[] xs, uint256[] ys, uint256[] junctions)
create an Estate from a set of Quads, these need to be adjacent so they form a connected whole

------------------------------------------


#### addMultipleQuads(address sender, uint256 estateId, uint256[] sizes, uint256[] xs, uint256[] ys, uint256[] junctions)
add a multiple lands to an existing estate

------------------------------------------


#### burn(uint256 id)
burn an Estate

------------------------------------------


#### burnFrom(address from, uint256 id)
burn an Estate on behalf

------------------------------------------


#### burnAndTransferFrom(address sender, uint256 estateId, address to)
burn an Estate on behalf and transfer land

------------------------------------------


#### transferAllFromDestroyedEstate(address sender, uint256 estateId, address to)
transfer all lands from a burnt estate

------------------------------------------


#### transferFromDestroyedEstate(address sender, uint256 estateId, uint256 num, address to)
transfer a certain number of lands from a burnt estate

------------------------------------------


#### onERC721BatchReceived(address operator, address from, uint256[] ids, bytes data)

------------------------------------------


#### onERC721Received(address operator, address, uint256, bytes)

------------------------------------------


#### supportsInterface(bytes4 id)

------------------------------------------


#### balanceOf(address owner)
Return the number of Land owned by an address

##### Returns
The: number of Land token owned by the address
------------------------------------------


#### ownerOf(uint256 id)
Return the owner of a Land

##### Returns
owner: The address of the owner
------------------------------------------


#### approveFor(address sender, address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### approve(address operator, uint256 id)
Approve an operator to spend tokens on the sender behalf

------------------------------------------


#### getApproved(uint256 id)
Get the approved operator for a specific token

##### Returns
The: address of the operator
------------------------------------------


#### transferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id, bytes data)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id)
Transfer a token between 2 addresses letting the receiver knows of the transfer

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses

------------------------------------------


#### safeBatchTransferFrom(address from, address to, uint256[] ids, bytes data)
Transfer many tokens between 2 addresses ensuring the receiving contract has a receiver method

------------------------------------------


#### setApprovalForAllFor(address sender, address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### setApprovalForAll(address operator, bool approved)
Set the approval for an operator to manage all the tokens of the sender

------------------------------------------


#### isApprovedForAll(address owner, address operator)
Check if the sender approved the operator

##### Returns
isOperator: The status of the approval
------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
QuadsAdded(id, list)

QuadsRemoved(id, numRemoved)

Minter(newMinter)

Breaker(newBreaker)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)

Transfer(_from, _to, _tokenId)

Approval(_owner, _approved, _tokenId)

ApprovalForAll(_owner, _operator, _approved)








## EstateSale
This contract mananges the sale of our lands as Estates

### Functions
#### constructor(address landAddress, address sandContractAddress, address initialMetaTx, address admin, address payable initialWalletAddress, bytes32 merkleRoot, uint256 expiryTime, address medianizerContractAddress, address daiTokenContractAddress, address initialSigningWallet, uint256 initialMaxCommissionRate, address estate)

------------------------------------------


#### setReceivingWallet(address payable newWallet)
set the wallet receiving the proceeds

------------------------------------------


#### setDAIEnabled(bool enabled)
enable/disable DAI payment for Lands

------------------------------------------


#### isDAIEnabled()
return whether DAI payments are enabled

##### Returns
whether: DAI payments are enabled
------------------------------------------


#### setETHEnabled(bool enabled)
enable/disable ETH payment for Lands

------------------------------------------


#### isETHEnabled()
return whether ETH payments are enabled

##### Returns
whether: ETH payments are enabled
------------------------------------------


#### setSANDEnabled(bool enabled)
enable/disable the specific SAND payment for Lands

------------------------------------------


#### isSANDEnabled()
return whether the specific SAND payments are enabled

##### Returns
whether: the specific SAND payments are enabled
------------------------------------------


#### buyLandWithSand(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with SAND using the merkle proof associated with it

------------------------------------------


#### buyLandWithETH(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with ETH using the merkle proof associated with it

------------------------------------------


#### buyLandWithDAI(address buyer, address to, address reserved, uint256 x, uint256 y, uint256 size, uint256 priceInSand, bytes32 salt, bytes32[] proof, bytes referral)
buy Land with DAI using the merkle proof associated with it

------------------------------------------


#### getExpiryTime()
Gets the expiry time for the current sale

##### Returns
The: expiry time, as a unix epoch
------------------------------------------


#### merkleRoot()
Gets the Merkle root associated with the current sale

##### Returns
The: Merkle root, as a bytes32 hash
------------------------------------------


#### getEtherAmountWithSAND(uint256 sandAmount)
Returns the amount of ETH for a specific amount of SAND

##### Returns
The: amount of ETH
------------------------------------------


#### updateSigningWallet(address newSigningWallet)
Update the signing wallet

------------------------------------------


#### getSigningWallet()
signing wallet authorized for referral

##### Returns
the: address of the signing wallet
------------------------------------------


#### getMaxCommisionRate()
the max commision rate

##### Returns
the: maximum commision rate that a referral can give
------------------------------------------


#### updateMaxCommissionRate(uint256 newMaxCommissionRate)
Update the maximum commission rate

------------------------------------------


#### isReferralValid(bytes signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate)
Check if a referral is valid

##### Returns
True: if the referral is valid
------------------------------------------


#### decodeReferral(bytes referral)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
LandQuadPurchased(buyer, to, topCornerId, size, price, token, amountPaid)

ReferralUsed(referrer, referee, token, amount, commission, commissionRate)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

AdminChanged(oldAdmin, newAdmin)








## LandToken


### Functions
#### mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes data)

------------------------------------------












## Gem


### Functions
#### constructor(string name, string symbol, address admin)

------------------------------------------


#### name()
A descriptive name for the tokens

##### Returns
name: of the tokens
------------------------------------------


#### symbol()
An abbreviated name for the tokens

##### Returns
symbol: of the tokens
------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### decimals()

------------------------------------------


#### transfer(address to, uint256 amount)

------------------------------------------


#### transferFrom(address from, address to, uint256 amount)

------------------------------------------


#### approve(address spender, uint256 amount)

------------------------------------------


#### approveFor(address from, address spender, uint256 amount)

------------------------------------------


#### setSubTokenIndex(contract ERC20Group group, uint256 index)

------------------------------------------


#### emitTransferEvent(address from, address to, uint256 amount)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### _firstBytes32(bytes src)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)

Transfer(from, to, value)

Approval(owner, spender, value)








## GemCore


### Functions
#### constructor(address admin, address minter)

------------------------------------------


#### getMinter()

------------------------------------------


#### setMinter(address newMinter)

------------------------------------------


#### mint(address to, uint256 id, uint256 amount)

------------------------------------------


#### addSubToken(contract ERC20SubToken subToken)

------------------------------------------


#### supplyOf(uint256 id)

------------------------------------------


#### balanceOf(address owner, uint256 id)

------------------------------------------


#### balanceOfBatch(address[] owners, uint256[] tokenIds)

------------------------------------------


#### singleTransferFrom(address from, address to, uint256 id, uint256 value)

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, uint256[] values)

------------------------------------------


#### setApprovalForAllFor(address sender, address operator, bool approved)

------------------------------------------


#### setApprovalForAll(address operator, bool approved)

------------------------------------------


#### isApprovedForAll(address owner, address operator)

------------------------------------------


#### burnFor(address from, uint256 id, uint256 value)

------------------------------------------


#### burn(uint256 id, uint256 value)

------------------------------------------


#### burnEachFor(address from, uint256[] ids, uint256 value)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
SubToken(subToken)

ApprovalForAll(owner, operator, approved)

Minter(newMinter)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## AssetToken


### Functions
#### mint(address creator, uint40 packId, bytes32 hash, uint256 supply, uint8 rarity, address owner, bytes data)

------------------------------------------


#### mintMultiple(address creator, uint40 packId, bytes32 hash, uint256[] supplies, bytes rarityPack, address owner, bytes data)

------------------------------------------


#### collectionOf(uint256 id)

------------------------------------------


#### isCollection(uint256 id)

------------------------------------------


#### collectionIndexOf(uint256 id)

------------------------------------------


#### extractERC721From(address sender, uint256 id, address to)

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 id)

------------------------------------------












## ERC20Extended


### Functions
#### burnFor(address from, uint256 amount)

------------------------------------------


#### burn(uint256 amount)

------------------------------------------


#### transferFrom(address from, address to, uint256 value)

------------------------------------------


#### approve(address spender, uint256 value)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### transfer(address to, uint256 value)

------------------------------------------





### Events
Approval(owner, spender, value)

Transfer(from, to, value)








## LandToken


### Functions
#### batchTransferQuad(address from, address to, uint256[] sizes, uint256[] xs, uint256[] ys, bytes data)

------------------------------------------


#### transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes data)

------------------------------------------


#### batchTransferFrom(address from, address to, uint256[] ids, bytes data)

------------------------------------------


#### transferFrom(address from, address to, uint256 id)

------------------------------------------












## P2PERC721Sale


### Functions
#### constructor(address sand, address admin, address feeCollector, uint256 fee, address initialMetaTx)

------------------------------------------


#### setFee(address feeCollector, uint256 fee)

------------------------------------------


#### claimSellerOffer(address buyer, address to, struct P2PERC721Sale.Auction auction, bytes signature, enum P2PERC721Sale.SignatureType signatureType, bool eip712)

------------------------------------------


#### cancelSellerOffer(uint256 id)

------------------------------------------


#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### init712()

------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
OfferClaimed(seller, buyer, offerId, tokenAddress, tokenId, pricePaid, feePaid)

OfferCancelled(seller, offerId)

FeeSetup(feeCollector, fee10000th)

MetaTransactionProcessor(metaTransactionProcessor, enabled)

AdminChanged(oldAdmin, newAdmin)








## ReferralValidator
This contract verifies if a referral is valid

### Functions
#### constructor(address initialSigningWallet, uint256 initialMaxCommissionRate)

------------------------------------------


#### updateSigningWallet(address newSigningWallet)
Update the signing wallet

------------------------------------------


#### getSigningWallet()
signing wallet authorized for referral

##### Returns
the: address of the signing wallet
------------------------------------------


#### getMaxCommisionRate()
the max commision rate

##### Returns
the: maximum commision rate that a referral can give
------------------------------------------


#### updateMaxCommissionRate(uint256 newMaxCommissionRate)
Update the maximum commission rate

------------------------------------------


#### isReferralValid(bytes signature, address referrer, address referee, uint256 expiryTime, uint256 commissionRate)
Check if a referral is valid

##### Returns
True: if the referral is valid
------------------------------------------


#### decodeReferral(bytes referral)

------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
ReferralUsed(referrer, referee, token, amount, commission, commissionRate)

AdminChanged(oldAdmin, newAdmin)








## TheSandbox712


### Functions
#### init712()

------------------------------------------












## ERC820Registry


### Functions
#### getManager(address addr)

------------------------------------------


#### setManager(address addr, address newManager)

------------------------------------------


#### getInterfaceImplementer(address addr, bytes32 iHash)

------------------------------------------


#### setInterfaceImplementer(address addr, bytes32 iHash, address implementer)

------------------------------------------












## ERC820Implementer


### Functions










## Admin


### Functions
#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
AdminChanged(oldAdmin, newAdmin)








## MetaTransactionReceiver


### Functions
#### setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled)
Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).

------------------------------------------


#### isMetaTransactionProcessor(address who)
check whether address `who` is given meta-transaction execution rights.

##### Returns
whether: the address has meta-transaction execution rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
MetaTransactionProcessor(metaTransactionProcessor, enabled)

AdminChanged(oldAdmin, newAdmin)








## Ownable


### Functions
#### constructor()

------------------------------------------


#### transferOwnership(address payable _newOwner)

------------------------------------------





### Events
OwnershipTransferred(previousOwner, newOwner)








## Pausable


### Functions
#### pause()

------------------------------------------


#### unpause()

------------------------------------------


#### constructor()

------------------------------------------


#### transferOwnership(address payable _newOwner)

------------------------------------------





### Events
Pause()

Unpause()

OwnershipTransferred(previousOwner, newOwner)








## ProxyImplementation












## ReferrableSale


### Functions
#### setDefaultReferral(uint256 _defaultReferralPercentage)

------------------------------------------


#### setCustomReferral(address _referrer, uint256 _customReferralPercentage)

------------------------------------------


#### constructor()

------------------------------------------


#### transferOwnership(address payable _newOwner)

------------------------------------------





### Events
DefaultReferralSet(percentage)

CustomReferralSet(referrer, percentage)

OwnershipTransferred(previousOwner, newOwner)








## SuperOperators


### Functions
#### setSuperOperator(address superOperator, bool enabled)
Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).

------------------------------------------


#### isSuperOperator(address who)
check whether address `who` is given superOperator rights.

##### Returns
whether: the address has superOperator rights.
------------------------------------------


#### getAdmin()
gives the current administrator of this contract.

##### Returns
the: current administrator of this contract.
------------------------------------------


#### changeAdmin(address newAdmin)
change the administrator to be `newAdmin`.

------------------------------------------





### Events
SuperOperator(superOperator, enabled)

AdminChanged(oldAdmin, newAdmin)








## Withdrawable


### Functions
#### withdrawEther(address payable _destination)

------------------------------------------


#### withdrawToken(contract ERC20 _token, address _destination)

------------------------------------------


#### constructor()

------------------------------------------


#### transferOwnership(address payable _newOwner)

------------------------------------------





### Events
OwnershipTransferred(previousOwner, newOwner)








## ERC1155


### Functions
#### safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)
Transfers `value` amount of an `id` from  `from` to `to`  (with safety call).

------------------------------------------


#### safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data)
Transfers `values` amount(s) of `ids` from the `from` address to the `to` address specified (with safety call).

------------------------------------------


#### balanceOf(address owner, uint256 id)
Get the balance of an account's tokens.

##### Returns
The: _owner's balance of the token type requested
------------------------------------------


#### balanceOfBatch(address[] owners, uint256[] ids)
Get the balance of multiple account/token pairs

##### Returns
The: _owner's balance of the token types requested (i.e. balance for each (owner, id) pair)
------------------------------------------


#### setApprovalForAll(address operator, bool approved)
Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.

------------------------------------------


#### isApprovedForAll(address owner, address operator)
Queries the approval status of an operator for a given owner.

##### Returns
True: if the operator is approved, false if not
------------------------------------------





### Events
TransferSingle(operator, from, to, id, value)

TransferBatch(operator, from, to, ids, values)

ApprovalForAll(owner, operator, approved)

URI(value, id)








## ERC1155TokenReceiver
Note: The ERC-165 identifier for this interface is 0x4e2312e0.

### Functions
#### onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes data)
Handle the receipt of a single ERC1155 token type.

------------------------------------------


#### onERC1155BatchReceived(address operator, address from, uint256[] ids, uint256[] values, bytes data)
Handle the receipt of multiple ERC1155 token types.

------------------------------------------












## ERC1271


### Functions
#### isValidSignature(bytes data, bytes signature)

##### Returns
MUST: return the bytes4 magic value 0x20c13b0b when function passes.
MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
MUST allow external calls
------------------------------------------












## ERC1271Constants












## ERC165


### Functions
#### supportsInterface(bytes4 interfaceId)
Query if a contract implements interface `interfaceId`

------------------------------------------












## ERC1654


### Functions
#### isValidSignature(bytes32 hash, bytes signature)

##### Returns
magicValue: 0x1626ba7e if valid else 0x00000000
------------------------------------------












## ERC1654Constants












## ERC20


### Functions
#### transferFrom(address from, address to, uint256 value)

------------------------------------------


#### approve(address spender, uint256 value)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### transfer(address to, uint256 value)

------------------------------------------





### Events
Approval(owner, spender, value)

Transfer(from, to, value)








## ERC20Basic


### Functions
#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### transfer(address to, uint256 value)

------------------------------------------





### Events
Transfer(from, to, value)








## ERC20Events





### Events
Transfer(from, to, value)

Approval(owner, spender, value)








## ERC20Receiver


### Functions
#### receiveApproval(address _from, uint256 _value, address _tokenAddress, bytes _data)

------------------------------------------












## ERC20WithMetadata


### Functions
#### name()

------------------------------------------


#### symbol()

------------------------------------------


#### decimals()

------------------------------------------


#### transferFrom(address from, address to, uint256 value)

------------------------------------------


#### approve(address spender, uint256 value)

------------------------------------------


#### allowance(address owner, address spender)

------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address who)

------------------------------------------


#### transfer(address to, uint256 value)

------------------------------------------





### Events
Approval(owner, spender, value)

Transfer(from, to, value)








## ERC721


### Functions
#### balanceOf(address owner)

------------------------------------------


#### ownerOf(uint256 tokenId)

------------------------------------------


#### approve(address to, uint256 tokenId)

------------------------------------------


#### getApproved(uint256 tokenId)

------------------------------------------


#### setApprovalForAll(address operator, bool approved)

------------------------------------------


#### isApprovedForAll(address owner, address operator)

------------------------------------------


#### transferFrom(address from, address to, uint256 tokenId)

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 tokenId)

------------------------------------------


#### safeTransferFrom(address from, address to, uint256 tokenId, bytes data)

------------------------------------------


#### supportsInterface(bytes4 interfaceId)
Query if a contract implements interface `interfaceId`

------------------------------------------





### Events
Transfer(_from, _to, _tokenId)

Approval(_owner, _approved, _tokenId)

ApprovalForAll(_owner, _operator, _approved)








## ERC721Events





### Events
Transfer(_from, _to, _tokenId)

Approval(_owner, _approved, _tokenId)

ApprovalForAll(_owner, _operator, _approved)








## ERC721MandatoryTokenReceiver
Note: The ERC-165 identifier for this interface is 0x5e8bf644.

### Functions
#### onERC721BatchReceived(address operator, address from, uint256[] ids, bytes data)

------------------------------------------


#### onERC721Received(address operator, address from, uint256 tokenId, bytes data)

------------------------------------------












## ERC721TokenReceiver


### Functions
#### onERC721Received(address operator, address from, uint256 tokenId, bytes data)

------------------------------------------












## ERC777Token


### Functions
#### name()

------------------------------------------


#### symbol()

------------------------------------------


#### totalSupply()

------------------------------------------


#### balanceOf(address owner)

------------------------------------------


#### granularity()

------------------------------------------


#### defaultOperators()

------------------------------------------


#### isOperatorFor(address operator, address tokenHolder)

------------------------------------------


#### authorizeOperator(address operator)

------------------------------------------


#### revokeOperator(address operator)

------------------------------------------


#### send(address to, uint256 amount, bytes data)

------------------------------------------


#### operatorSend(address from, address to, uint256 amount, bytes data, bytes operatorData)

------------------------------------------





### Events
Sent(operator, from, to, amount, data, operatorData)

Minted(operator, to, amount, operatorData)

Burned(operator, from, amount, data, operatorData)

AuthorizedOperator(operator, tokenHolder)

RevokedOperator(operator, tokenHolder)








## ERC777TokenEvents





### Events
Sent(operator, from, to, amount, data, operatorData)

Minted(operator, to, amount, operatorData)

Burned(operator, from, amount, data, operatorData)

AuthorizedOperator(operator, tokenHolder)

RevokedOperator(operator, tokenHolder)








## ERC777TokensRecipient


### Functions
#### tokensReceived(address operator, address from, address to, uint256 amount, bytes data, bytes operatorData)

------------------------------------------












## ERC777TokensSender


### Functions
#### tokensToSend(address operator, address from, address to, uint256 amount, bytes userData, bytes operatorData)

------------------------------------------












## Medianizer


### Functions
#### read()

------------------------------------------












## AddressUtils


### Functions










## BytesUtil


### Functions










## Math


### Functions










## ObjectLib


### Functions










## ObjectLib32


### Functions










## ObjectLib64


### Functions










## PriceUtil


### Functions










## SafeMath


### Functions










## SafeMathWithRequire


### Functions










## SigUtil


### Functions










## AdminUpgradeabilityProxy


### Functions
#### constructor(address payable _owner, address _implementation, bytes _data)
Contract constructor.
It sets the `msg.sender` as the proxy administrator.

------------------------------------------


#### admin()

##### Returns
The: address of the proxy admin.
------------------------------------------


#### implementation()

##### Returns
The: address of the implementation.
------------------------------------------


#### changeAdmin(address newAdmin)

------------------------------------------


#### upgradeTo(address newImplementation)

------------------------------------------


#### upgradeToAndCall(address newImplementation, bytes data)

------------------------------------------


#### fallback()

------------------------------------------


#### receive()

------------------------------------------





### Events
AdminChanged(previousAdmin, newAdmin)

Upgraded(implementation)








## ProxyAdmin


### Functions
#### constructor(contract AdminUpgradeabilityProxy _proxy, address payable _owner)

------------------------------------------


#### proxyAddress()

------------------------------------------


#### admin()

------------------------------------------


#### changeAdmin(address newAdmin)

------------------------------------------


#### upgradeTo(address implementation)

------------------------------------------


#### upgradeToAndCall(address implementation, bytes data)

------------------------------------------


#### transferOwnership(address payable _newOwner)

------------------------------------------





### Events
OwnershipTransferred(previousOwner, newOwner)








## ProxyBase


### Functions
#### fallback()

------------------------------------------


#### receive()

------------------------------------------












## UpgradeabilityProxy


### Functions
#### constructor(address _implementation, bytes _data)

------------------------------------------


#### fallback()

------------------------------------------


#### receive()

------------------------------------------





### Events
Upgraded(implementation)








## MetaTxWrapper


### Functions
#### constructor(address forwarder, address forwardTo)

------------------------------------------


#### fallback()

------------------------------------------







