# Audience

The intended audience for this documentation is auditors, internal developers and external developer contributors.

# Features

The `NFTCollection` contract is used to represent Avatar collections inside TheSandbox. This contract may be initialized
via `CollectionFactory` or other similar factories

Some features:

- Upgradable
- Ownable (2 step transfer)
- OpenSea royalty compliant
- ERC2981 compliant
- ERC4906 compliant
- ERC165 compliant
- supports ERC2771 for meta transactions
- minting is supported via an ERC20 token contract that supports approveAndCall as mint price is in non-native tokens
- custom batch operations for minting and transfer

## Roles

The contract has one owner that can configure the contract and set up the minting waves.

## Minting Waves

There are two ways of minting tokens:

1. The owner can mint in batch a set of tokens directly to any desired wallet.
2. The backend gives a signed message to the user. Using this authorization a user can mint certain amount of tokens to
   his wallet paying a price in Sand or any other configured ERC20 token.

Minting is done in waves, a wave set the price of the tokens and some limits on the amount of tokens that can be minted.
Waves are configured by the owner of the contract. After setting an initial wave the owner can set a new wave at any
time. Usually the previous wave is cancelled each time a new wave is set, but, the owner can choose to leave a wave open
so two waves can run in parallel (to use this new functionality the user must claim using `waveMint` method).

### Minting Limits

There is `maxSupply` that limits the total amount of tokens that can be minted in the collection, also, each wave sets
the following parameters:

- waveMaxTokensOverall: The total amount of tokens that can be minted in the current wave.
- waveMaxTokensPerWallet: The amount of tokens that each wallet can mint in the current wave.
- waveSingleTokenPrice: The price in Sand (or another ERC20) that must be paid to mint a token.
- maxTokensPerWallet: The maximum amount of tokens that can be minted per wallet across all waves.

## Structs info

### NFTCollectionStorage

```solidity
struct NFTCollectionStorage {
    uint256 maxSupply;
    uint256 maxTokensPerWallet;
    address mintTreasury;
    string baseTokenURI;
    INFTCollection.WaveData[] waveData;
    IERC20 allowedToExecuteMint;
    mapping(uint256 => uint256) personalizationTraits;
    mapping(address => uint256) mintedCount;
    uint256 totalSupply;
}
```

storage-location: erc7201:thesandbox.storage.avatar.nft-collection.NFTCollection

## Functions info

### constructor

```solidity
constructor()
```

oz-upgrades-unsafe-allow: constructor

### initialize (0xc5a2824e)

```solidity
function initialize(
    INFTCollection.InitializationParams calldata params
) external virtual initializer
```

external entry point initialization function in accordance with the upgradable pattern

Parameters:

| Name   | Type                                       | Description                                                                         |
| :----- | :----------------------------------------- | :---------------------------------------------------------------------------------- |
| params | struct INFTCollection.InitializationParams | arguments taken during initialization, for details see: struct InitializationParams |

### setupWave (0x1992c3f3)

```solidity
function setupWave(
    uint256 _waveMaxTokensOverall,
    uint256 _waveMaxTokensPerWallet,
    uint256 _waveSingleTokenPrice
) external onlyOwner
```

function to setup a new wave. A wave is defined as a combination of allowed number tokens to be minted in total, per
wallet and minting price

Parameters:

| Name                    | Type    | Description                                                                                    |
| :---------------------- | :------ | :--------------------------------------------------------------------------------------------- |
| _waveMaxTokensOverall   | uint256 | the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)     |
| _waveMaxTokensPerWallet | uint256 | max tokens to buy, per wallet in a given wave                                                  |
| _waveSingleTokenPrice   | uint256 | the price to mint a token in a given wave, in wei denoted by the allowedToExecuteMint contract |

### mint (0x731133e9)

```solidity
function mint(
    address wallet,
    uint256 amount,
    uint256 signatureId,
    bytes calldata signature
) external whenNotPaused nonReentrant
```

token minting function on the last wave. Price is set by wave and is paid in tokens denoted by the allowedToExecuteMint
contract

this method is backward compatible with the previous contract, so, it uses last configured wave

Parameters:

| Name        | Type    | Description              |
| :---------- | :------ | :----------------------- |
| wallet      | address | minting wallet           |
| amount      | uint256 | number of token to mint  |
| signatureId | uint256 | signing signature ID     |
| signature   | bytes   | signing signature value  |

### waveMint (0x26b3af64)

```solidity
function waveMint(
    address wallet,
    uint256 amount,
    uint256 waveIndex,
    uint256 signatureId,
    bytes calldata signature
) external whenNotPaused nonReentrant
```

token minting function on a certain wave. Price is set by wave and is paid in tokens denoted by the allowedToExecuteMint
contract

Parameters:

| Name        | Type    | Description                         |
| :---------- | :------ | :---------------------------------- |
| wallet      | address | minting wallet                      |
| amount      | uint256 | number of token to mint             |
| waveIndex   | uint256 | the index of the wave used to mint  |
| signatureId | uint256 | signing signature ID                |
| signature   | bytes   | signing signature value             |

### cancelWave (0x49c55c5e)

```solidity
function cancelWave(uint256 waveIndex) external onlyOwner
```

function used to cancel a wave

Parameters:

| Name      | Type    | Description                          |
| :-------- | :------ | :----------------------------------- |
| waveIndex | uint256 | the index of the wave to be canceled |

### batchMint (0x0f0a3e6d)

```solidity
function batchMint(
    uint256 waveIndex,
    INFTCollection.BatchMintingData[] calldata wallets
) external whenNotPaused onlyOwner
```

batch minting function, used by owner to airdrop directly to users.

this methods takes a list of destination wallets and can only be used by the owner of the contract

Parameters:

| Name      | Type                                     | Description                             |
| :-------- | :--------------------------------------- | :-------------------------------------- |
| waveIndex | uint256                                  | the index of the wave used to mint      |
| wallets   | struct INFTCollection.BatchMintingData[] | list of destination wallets and amounts |

### reveal (0xa90fe861)

```solidity
function reveal(
    uint256 tokenId,
    uint256 signatureId,
    bytes calldata signature
) external whenNotPaused
```

helper function to emit the {MetadataUpdate} event in order for marketplaces to, on demand, refresh metadata, for the
provided token ID. Off-chain, gaming mechanics are done and this function is ultimately called to signal the end of a
reveal.

will revert if owner of token is not caller or if signature is not valid

Parameters:

| Name        | Type    | Description                                                    |
| :---------- | :------ | :------------------------------------------------------------- |
| tokenId     | uint256 | the ID belonging to the NFT token for which to emit the event  |
| signatureId | uint256 | validation signature ID                                        |
| signature   | bytes   | validation signature                                           |

### personalize (0x1c00ff5b)

```solidity
function personalize(
    uint256 tokenId,
    uint256 personalizationMask,
    uint256 signatureId,
    bytes calldata signature
) external whenNotPaused
```

personalize token traits according to the provided personalization bit-mask

after checks, it is reduced to personalizationTraits[_tokenId] = _personalizationMask

Parameters:

| Name                | Type    | Description                                         |
| :------------------ | :------ | :-------------------------------------------------- |
| tokenId             | uint256 | what token to personalize                           |
| personalizationMask | uint256 | a mask where each bit has a custom meaning in-game  |
| signatureId         | uint256 | the ID of the provided signature                    |
| signature           | bytes   | signing signature                                   |

### operatorPersonalize (0xa6e3ec26)

```solidity
function operatorPersonalize(
    uint256 tokenId,
    uint256 personalizationMask
) external onlyOwner
```

personalize token traits but can be called by owner or special roles address Used to change the traits of a token based
on an in-game action

reverts if token does not exist or if not authorized

Parameters:

| Name                | Type    | Description                                        |
| :------------------ | :------ | :------------------------------------------------- |
| tokenId             | uint256 | what token to personalize                          |
| personalizationMask | uint256 | a mask where each bit has a custom meaning in-game |

### burn (0x42966c68)

```solidity
function burn(uint256 tokenId) external whenNotPaused
```

Burns `tokenId`. The caller must own `tokenId` or be an approved operator.

See {ERC721BurnMemoryEnumerableUpgradeable.burn}.

Parameters:

| Name    | Type    | Description               |
| :------ | :------ | :------------------------ |
| tokenId | uint256 | the token id to be burned |

### enableBurning (0x7581a8e6)

```solidity
function enableBurning() external onlyOwner
```

enables burning of tokens

reverts if burning already enabled.

### disableBurning (0x98603cca)

```solidity
function disableBurning() external onlyOwner
```

disables burning of tokens

reverts if burning already disabled.

### pause (0x8456cb59)

```solidity
function pause() external onlyOwner
```

pauses the contract

reverts if not owner of the collection or if not un-paused

### unpause (0x3f4ba83a)

```solidity
function unpause() external onlyOwner
```

unpauses the contract

reverts if not owner of the collection or if not paused

### setTreasury (0xf0f44260)

```solidity
function setTreasury(address treasury) external onlyOwner
```

update the treasury address

Parameters:

| Name     | Type    | Description                      |
| :------- | :------ | :------------------------------- |
| treasury | address | new treasury address to be saved |

### setSignAddress (0x15137045)

```solidity
function setSignAddress(address _signAddress) external onlyOwner
```

updates the sign address.

Parameters:

| Name         | Type    | Description                  |
| :----------- | :------ | :--------------------------- |
| _signAddress | address | new signer address to be set |

### setMaxSupply (0x6f8b44b0)

```solidity
function setMaxSupply(uint256 _maxSupply) external onlyOwner
```

updates the sign address.

Parameters:

| Name       | Type    | Description                                 |
| :--------- | :------ | :------------------------------------------ |
| _maxSupply | uint256 | maximum amount of tokens that can be minted |

### setMaxTokensPerWallet (0xaac5d69f)

```solidity
function setMaxTokensPerWallet(uint256 _maxTokensPerWallet) external onlyOwner
```

Set the maximum number of tokens that can be minted per wallet across all waves

Parameters:

| Name                | Type    | Description                   |
| :------------------ | :------ | :---------------------------- |
| _maxTokensPerWallet | uint256 | new maximum tokens per wallet |

### setAllowedExecuteMint (0x82bc7877)

```solidity
function setAllowedExecuteMint(IERC20Metadata minterToken) external onlyOwner
```

updates which address is allowed to execute the mint function.

also resets default mint price

Parameters:

| Name        | Type                    | Description                                                   |
| :---------- | :---------------------- | :------------------------------------------------------------ |
| minterToken | contract IERC20Metadata | the address that will be allowed to execute the mint function |

### setBaseURI (0x55f804b3)

```solidity
function setBaseURI(string calldata baseURI) external onlyOwner
```

updates the base token URI for the contract

Parameters:

| Name    | Type   | Description                                        |
| :------ | :----- | :------------------------------------------------- |
| baseURI | string | an URI that will be used as the base for token URI |

### setOperatorRegistry (0x9d28fb86)

```solidity
function setOperatorRegistry(address registry) external virtual onlyOwner
```

sets filter registry address deployed in test

Parameters:

| Name     | Type    | Description                 |
| :------- | :------ | :-------------------------- |
| registry | address | the address of the registry |

### setTrustedForwarder (0xda742228)

```solidity
function setTrustedForwarder(address forwarder) external virtual onlyOwner
```

set the trusted forwarder

address(0) disables the forwarder

Parameters:

| Name      | Type    | Description                        |
| :-------- | :------ | :--------------------------------- |
| forwarder | address | the new trusted forwarder address  |

### register (0xab01b469)

```solidity
function register(
    address subscriptionOrRegistrantToCopy,
    bool subscribe
) external onlyOwner
```

This function is used to register Land contract on the Operator Filterer Registry of Opensea.

subscriptionOrRegistrantToCopy == address(0), just register

Parameters:

| Name                           | Type    | Description                                                       |
| :----------------------------- | :------ | :---------------------------------------------------------------- |
| subscriptionOrRegistrantToCopy | address | registration address of the list to subscribe.                    |
| subscribe                      | bool    | bool to signify subscription 'true' or to copy the list 'false'.  |

### safeBatchTransferFrom (0x28cfbd46)

```solidity
function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] calldata ids,
    bytes calldata data
) external virtual whenNotPaused onlyAllowedOperator(from)
```

Transfer many tokens between 2 addresses, while ensuring the receiving contract has a receiver method.

Parameters:

| Name | Type      | Description                  |
| :--- | :-------- | :--------------------------- |
| from | address   | The sender of the token.     |
| to   | address   | The recipient of the token.  |
| ids  | uint256[] | The ids of the tokens.       |
| data | bytes     | Additional data.             |

### batchTransferFrom (0xf3993d11)

```solidity
function batchTransferFrom(
    address from,
    address to,
    uint256[] calldata ids
) external virtual whenNotPaused onlyAllowedOperator(from)
```

Transfer many tokens between 2 addresses.

Parameters:

| Name | Type      | Description                  |
| :--- | :-------- | :--------------------------- |
| from | address   | The sender of the token.     |
| to   | address   | The recipient of the token.  |
| ids  | uint256[] | The ids of the tokens.       |

### setDefaultRoyalty (0x04634d8d)

```solidity
function setDefaultRoyalty(
    address receiver,
    uint96 feeNumerator
) external onlyOwner
```

Sets the royalty information that all ids in this contract will default to.

Parameters:

| Name         | Type    | Description                                         |
| :----------- | :------ | :-------------------------------------------------- |
| receiver     | address | the receiver of the royalties                       |
| feeNumerator | uint96  | percentage of the royalties in feeDenominator units |

### resetDefaultRoyalty (0xee437dae)

```solidity
function resetDefaultRoyalty() external onlyOwner
```

Removes default royalty information.

### setTokenRoyalty (0x5944c753)

```solidity
function setTokenRoyalty(
    uint256 tokenId,
    address receiver,
    uint96 feeNumerator
) external onlyOwner
```

Sets the royalty information for a specific token id, overriding the global default.

Parameters:

| Name         | Type    | Description                                         |
| :----------- | :------ | :-------------------------------------------------- |
| tokenId      | uint256 | the NFT tokenId that will has his royalties set     |
| receiver     | address | the receiver of the royalties                       |
| feeNumerator | uint96  | percentage of the royalties in feeDenominator units |

### resetTokenRoyalty (0x8a616bc0)

```solidity
function resetTokenRoyalty(uint256 tokenId) external onlyOwner
```

Resets royalty information for the token id back to the global default.

Parameters:

| Name    | Type    | Description                                       |
| :------ | :------ | :------------------------------------------------ |
| tokenId | uint256 | the NFT tokenId that will has his royalties reset |

### setApprovalForAll (0xa22cb465)

```solidity
function setApprovalForAll(
    address operator,
    bool approved
) public override whenNotPaused onlyAllowedOperatorApproval(operator)
```

Set the approval for an operator to manage all the tokens of the sender

See OpenZeppelin {IERC721-setApprovalForAll}

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| operator | address | The address receiving the approval  |
| approved | bool    | The determination of the approval   |

### approve (0x095ea7b3)

```solidity
function approve(
    address operator,
    uint256 tokenId
) public override whenNotPaused onlyAllowedOperatorApproval(operator)
```

Approve an operator to spend tokens on the sender behalf

See OpenZeppelin {IERC721-approve}

Parameters:

| Name     | Type    | Description                         |
| :------- | :------ | :---------------------------------- |
| operator | address | The address receiving the approval  |
| tokenId  | uint256 | The id of the token                 |

### transferFrom (0x23b872dd)

```solidity
function transferFrom(
    address from,
    address to,
    uint256 tokenId
) public override whenNotPaused onlyAllowedOperator(from)
```

Transfer a token between 2 addresses

See OpenZeppelin {IERC721-transferFrom}

Parameters:

| Name    | Type    | Description                 |
| :------ | :------ | :-------------------------- |
| from    | address | The sender of the token     |
| to      | address | The recipient of the token  |
| tokenId | uint256 | The id of the token         |

### safeTransferFrom (0xb88d4fde)

```solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
) public override whenNotPaused onlyAllowedOperator(from)
```

Transfer a token between 2 addresses letting the receiver knows of the transfer

See OpenZeppelin {IERC721-safeTransferFrom}

Parameters:

| Name    | Type    | Description                 |
| :------ | :------ | :-------------------------- |
| from    | address | The sender of the token     |
| to      | address | The recipient of the token  |
| tokenId | uint256 | The id of the token         |
| data    | bytes   | Additional data             |

### personalizationOf (0x97944ba2)

```solidity
function personalizationOf(uint256 tokenId) external view returns (uint256)
```

get the personalization of the indicated tokenID

Parameters:

| Name    | Type    | Description            |
| :------ | :------ | :--------------------- |
| tokenId | uint256 | the token ID to check  |

Return values:

| Name | Type    | Description                         |
| :--- | :------ | :---------------------------------- |
| [0]  | uint256 | the personalization data as uint256 |

### mintedCount (0xfddcb5ea)

```solidity
function mintedCount(address wallet) external view returns (uint256)
```

get the number of tokens minted by an address

Parameters:

| Name   | Type    | Description     |
| :----- | :------ | :-------------- |
| wallet | address | minting wallet  |

Return values:

| Name | Type    | Description                               |
| :--- | :------ | :---------------------------------------- |
| [0]  | uint256 | the number of tokens minted by an address |

### isMintDenied (0xa0f9b839)

```solidity
function isMintDenied(
    uint256 waveIndex,
    address wallet,
    uint256 amount
) external view returns (INFTCollection.MintDenialReason)
```

check if the indicated wallet can mint the indicated amount

Parameters:

| Name      | Type    | Description                            |
| :-------- | :------ | :------------------------------------- |
| wallet    | address | wallet to be checked if it can mint    |
| amount    | uint256 | amount to be checked if can be minted  |
| waveIndex | uint256 | the index of the wave used to mint     |

Return values:

| Name | Type                                 | Description                                                                  |
| :--- | :----------------------------------- | :--------------------------------------------------------------------------- |
| [0]  | enum INFTCollection.MintDenialReason | zero if minting is allowed or a number that represents the reason for denial |

### feeDenominator (0x180b0d7e)

```solidity
function feeDenominator() external pure virtual returns (uint96)
```

The denominator with which to interpret the fee set in {_setTokenRoyalty} and {_setDefaultRoyalty} as a fraction of the
sale price. Defaults to 10000 so fees are expressed in basis points, but may be customized by an override.

Return values:

| Name | Type   | Description         |
| :--- | :----- | :------------------ |
| [0]  | uint96 | the fee denominator |

### chain (0xc763e5a1)

```solidity
function chain() external view returns (uint256)
```

helper automation function

Return values:

| Name | Type    | Description                        |
| :--- | :------ | :--------------------------------- |
| [0]  | uint256 | current chainID for the blockchain |

### maxSupply (0xd5abeb01)

```solidity
function maxSupply() external view returns (uint256)
```

return maximum amount of tokens that can be minted

Return values:

| Name | Type    | Description    |
| :--- | :------ | :------------- |
| [0]  | uint256 | the max supply |

### mintTreasury (0xe3e35062)

```solidity
function mintTreasury() external view returns (address)
```

return treasury address where the payment for minting are sent

Return values:

| Name | Type    | Description                     |
| :--- | :------ | :------------------------------ |
| [0]  | address | the address of the min treasury |

### baseTokenURI (0xd547cfb7)

```solidity
function baseTokenURI() external view returns (string memory)
```

return standard base token URL for ERC721 metadata

Return values:

| Name | Type   | Description        |
| :--- | :----- | :----------------- |
| [0]  | string | the base token uri |

### waveMaxTokensOverall (0x5375e898)

```solidity
function waveMaxTokensOverall(
    uint256 waveIndex
) external view returns (uint256)
```

return max tokens to buy per wave, cumulating all addresses

Parameters:

| Name      | Type    | Description                         |
| :-------- | :------ | :---------------------------------- |
| waveIndex | uint256 | the index of the wave used to mint  |

Return values:

| Name | Type    | Description                    |
| :--- | :------ | :----------------------------- |
| [0]  | uint256 | the max tokens to buy per wave |

### waveMaxTokensPerWallet (0x006cddce)

```solidity
function waveMaxTokensPerWallet(
    uint256 waveIndex
) external view returns (uint256)
```

return max tokens to buy, per wallet in a given wave

Parameters:

| Name      | Type    | Description                         |
| :-------- | :------ | :---------------------------------- |
| waveIndex | uint256 | the index of the wave used to mint  |

Return values:

| Name | Type    | Description                      |
| :--- | :------ | :------------------------------- |
| [0]  | uint256 | the max tokens to buy per wallet |

### waveSingleTokenPrice (0x179573d3)

```solidity
function waveSingleTokenPrice(
    uint256 waveIndex
) external view returns (uint256)
```

return price of one token mint (in the token denoted by the allowedToExecuteMint contract)

Parameters:

| Name      | Type    | Description                         |
| :-------- | :------ | :---------------------------------- |
| waveIndex | uint256 | the index of the wave used to mint  |

Return values:

| Name | Type    | Description                 |
| :--- | :------ | :-------------------------- |
| [0]  | uint256 | the price of one token mint |

### waveTotalMinted (0x3ee462c2)

```solidity
function waveTotalMinted(uint256 waveIndex) external view returns (uint256)
```

return number of total minted tokens in the current running wave

Parameters:

| Name      | Type    | Description                         |
| :-------- | :------ | :---------------------------------- |
| waveIndex | uint256 | the index of the wave used to mint  |

Return values:

| Name | Type    | Description                                         |
| :--- | :------ | :-------------------------------------------------- |
| [0]  | uint256 | the total minted tokens in the current running wave |

### waveOwnerToClaimedCounts (0x49c95a31)

```solidity
function waveOwnerToClaimedCounts(
    uint256 waveIndex,
    address owner
) external view returns (uint256)
```

return mapping of [owner -> wave index -> minted count]

Parameters:

| Name      | Type    | Description                                |
| :-------- | :------ | :----------------------------------------- |
| waveIndex | uint256 | the index of the wave used to mint         |
| owner     | address | the owner for which the count is returned  |

Return values:

| Name | Type    | Description                                   |
| :--- | :------ | :-------------------------------------------- |
| [0]  | uint256 | the claimed counts for an waveIndex and owner |

### waveCount (0xd2669199)

```solidity
function waveCount() external view returns (uint256)
```

the total amount of waves configured till now

Return values:

| Name | Type    | Description    |
| :--- | :------ | :------------- |
| [0]  | uint256 | the wave count |

### allowedToExecuteMint (0xac3149e3)

```solidity
function allowedToExecuteMint() external view returns (IERC20)
```

return ERC20 contract through which the minting will be done (approveAndCall)

Return values:

| Name | Type            | Description                                                   |
| :--- | :-------------- | :------------------------------------------------------------ |
| [0]  | contract IERC20 | the address of the token that is allowed to do a call to mint |

### maxTokensPerWallet (0x469132ce)

```solidity
function maxTokensPerWallet() external view returns (uint256)
```

Get the maximum number of tokens that can be minted per wallet across all waves

Return values:

| Name | Type    | Description                                                                 |
| :--- | :------ | :-------------------------------------------------------------------------- |
| [0]  | uint256 | the maximum number of tokens that can be minted per wallet across all waves |

### totalSupply (0x18160ddd)

```solidity
function totalSupply() external view returns (uint256)
```

return the total amount of tokens minted till now

Return values:

| Name | Type    | Description                                |
| :--- | :------ | :----------------------------------------- |
| [0]  | uint256 | the total amount of tokens minted till now |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(
    bytes4 interfaceId
) public view virtual override returns (bool)
```

See {IERC165-supportsInterface}.