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
- supports ERC2771 for services like Biconomy
- supports keeping track of who burned what token for faster in-game gating checks
- minting is supported via an ERC20 token contract that supports approveAndCall as mint price is in non-native tokens
- custom batch operations for minting and transfer

## Roles

The contract has one owner that can configure the contract and set up the minting waves.

## Minting Waves

There are two ways of minting tokens:

1. The owner can mint in batch a set of tokens directly to any desired wallet.
2. The backend gives a signed message to the user. Using this authorization a user can mint certain amount of tokens to
   his wallet paying a price in Sand or any other configured ERC20 token.

Minting is done in waves set the price of the tokens and some limits on the amount of tokens that can be minted and are
configured by the owner of the contract. After setting an initial wave the owner can set a new wave at any time, the
previous wave is cancelled each time a new wave is set.

### Minting Limits

There is `maxSupply` that limits the total amount of tokens that can be minted in the collection, also, each wave sets
the following parameters:

- waveMaxTokensOverall: The total amount of tokens that can be minted in the current wave.
- waveMaxTokensPerWallet: The amount of tokens that each wallet can mint in the current wave.
- waveSingleTokenPrice: The price in Sand (or another ERC20) that must be paid to mint a token.

## Structs info

### BatchMintingData

```solidity
struct BatchMintingData {
    address wallet;
    uint256 amount;
}
```

Structure used to mint in batch

Parameters:

| Name   | Type    | Description                                       |
| :----- | :------ | :------------------------------------------------ |
| wallet | address | destination address that will receive the tokens  |
| amount | uint256 | of tokens to mint                                 |

## Events info

### ContractInitialized

```solidity
event ContractInitialized(string indexed baseURI, string indexed name, string indexed symbol, address mintTreasury, address signAddress, address allowedToExecuteMint, uint256 maxSupply)
```

Event emitted when the contract was initialized.

emitted at proxy startup, only once

Parameters:

| Name                 | Type    | Description                                                                  |
| :------------------- | :------ | :--------------------------------------------------------------------------- |
| baseURI              | string  | an URI that will be used as the base for token URI                           |
| name                 | string  | name of the ERC721 token                                                     |
| symbol               | string  | token symbol of the ERC721 token                                             |
| mintTreasury         | address | collection treasury address (where the payments are sent)                    |
| signAddress          | address | signer address that is allowed to create mint signatures                     |
| allowedToExecuteMint | address | token address that is used for payments and that is allowed to execute mint  |
| maxSupply            | uint256 | max supply of tokens to be allowed to be minted per contract                 |

### WaveSetup

```solidity
event WaveSetup(address indexed operator, uint256 waveMaxTokens, uint256 waveMaxTokensToBuy, uint256 waveSingleTokenPrice, uint256 prevMinted, uint256 waveIndex)
```

Event emitted when a wave was set up

emitted when setupWave is called

Parameters:

| Name                 | Type    | Description                                                                                 |
| :------------------- | :------ | :------------------------------------------------------------------------------------------ |
| operator             | address | the sender of the transaction                                                               |
| waveMaxTokens        | uint256 | the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)  |
| waveMaxTokensToBuy   | uint256 | max tokens to buy, per wallet in a given wave                                               |
| waveSingleTokenPrice | uint256 | the price to mint a token in a given wave, in wei                                           |
| prevMinted           | uint256 | the amount of tokens minted in previous wave                                                |
| waveIndex            | uint256 | the current wave index                                                                      |

### AllowedExecuteMintSet

```solidity
event AllowedExecuteMintSet(address indexed operator, IERC20 indexed oldToken, IERC20 indexed newToken)
```

Event emitted when an address was set as allowed to mint

emitted when setAllowedExecuteMint is called

Parameters:

| Name     | Type            | Description                                                                |
| :------- | :-------------- | :------------------------------------------------------------------------- |
| operator | address         | the sender of the transaction                                              |
| oldToken | contract IERC20 | old address that is used for payments and that is allowed to execute mint  |
| newToken | contract IERC20 | new address that is used for payments and that is allowed to execute mint  |

### TreasurySet

```solidity
event TreasurySet(address indexed operator, address indexed oldTreasury, address indexed newTreasury)
```

Event emitted when the treasury address was saved

emitted when setTreasury is called

Parameters:

| Name        | Type    | Description                                                    |
| :---------- | :------ | :------------------------------------------------------------- |
| operator    | address | the sender of the transaction                                  |
| oldTreasury | address | old collection treasury address (where the payments are sent)  |
| newTreasury | address | new collection treasury address (where the payments are sent)  |

### BaseURISet

```solidity
event BaseURISet(address indexed operator, string oldBaseURI, string newBaseURI)
```

Event emitted when the base token URI for the contract was set or changed

emitted when setBaseURI is called

Parameters:

| Name       | Type    | Description                                                   |
| :--------- | :------ | :------------------------------------------------------------ |
| operator   | address | the sender of the transaction                                 |
| oldBaseURI | string  | old URI that will be used as the base for token metadata URI  |
| newBaseURI | string  | new URI that will be used as the base for token metadata URI  |

### SignAddressSet

```solidity
event SignAddressSet(address indexed operator, address indexed oldSignAddress, address indexed newSignAddress)
```

Event emitted when the signer address was set or changed

emitted when setSignAddress is called

Parameters:

| Name           | Type    | Description                                                   |
| :------------- | :------ | :------------------------------------------------------------ |
| operator       | address | the sender of the transaction                                 |
| oldSignAddress | address | old signer address that is allowed to create mint signatures  |
| newSignAddress | address | new signer address that is allowed to create mint signatures  |

### MaxSupplySet

```solidity
event MaxSupplySet(address indexed operator, uint256 oldMaxSupply, uint256 newMaxSupply)
```

Event emitted when the max supply is set or changed

emitted when setSignAddress is called

Parameters:

| Name         | Type    | Description                                      |
| :----------- | :------ | :----------------------------------------------- |
| operator     | address | the sender of the transaction                    |
| oldMaxSupply | uint256 | old maximum amount of tokens that can be minted  |
| newMaxSupply | uint256 | new maximum amount of tokens that can be minted  |

### Personalized

```solidity
event Personalized(address indexed operator, uint256 indexed tokenId, uint256 indexed personalizationMask)
```

Event emitted when a token personalization was made.

emitted when personalize is called

Parameters:

| Name                | Type    | Description                                                           |
| :------------------ | :------ | :-------------------------------------------------------------------- |
| operator            | address | the sender of the transaction                                         |
| tokenId             | uint256 | id of the token which had the personalization done                    |
| personalizationMask | uint256 | the exact personalization that was done, as a custom meaning bit-mask |

### DefaultRoyaltySet

```solidity
event DefaultRoyaltySet(address indexed operator, address indexed receiver, uint96 feeNumerator)
```

Event emitted when a token personalization was made.

Parameters:

| Name         | Type    | Description                                         |
| :----------- | :------ | :-------------------------------------------------- |
| operator     | address | the sender of the transaction                       |
| receiver     | address | the receiver of the royalties                       |
| feeNumerator | uint96  | percentage of the royalties in feeDenominator units |

### DefaultRoyaltyReset

```solidity
event DefaultRoyaltyReset(address indexed operator)
```

Event emitted when default royalties are reset

Parameters:

| Name     | Type    | Description                   |
| :------- | :------ | :---------------------------- |
| operator | address | the sender of the transaction |

### TokenRoyaltySet

```solidity
event TokenRoyaltySet(address indexed operator, uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator)
```

Event emitted when a token personalization was made.

Parameters:

| Name         | Type    | Description                                         |
| :----------- | :------ | :-------------------------------------------------- |
| operator     | address | the sender of the transaction                       |
| tokenId      | uint256 | the token id                                        |
| receiver     | address | the receiver of the royalties                       |
| feeNumerator | uint96  | percentage of the royalties in feeDenominator units |

### TokenRoyaltyReset

```solidity
event TokenRoyaltyReset(address indexed operator, uint256 indexed tokenId)
```

Event emitted when default royalties are reset

Parameters:

| Name     | Type    | Description                   |
| :------- | :------ | :---------------------------- |
| operator | address | the sender of the transaction |

## State variables info

### maxSupply (0xd5abeb01)

```solidity
uint256 maxSupply
```

maximum amount of tokens that can be minted

### mintTreasury (0xe3e35062)

```solidity
address mintTreasury
```

treasury address where the payment for minting are sent

### baseTokenURI (0xd547cfb7)

```solidity
string baseTokenURI
```

standard base token URL for ERC721 metadata

### waveMaxTokensOverall (0x9ea25d7a)

```solidity
uint256 waveMaxTokensOverall
```

max tokens to buy per wave, cumulating all addresses

### waveMaxTokensPerWallet (0xbe4ca0cc)

```solidity
uint256 waveMaxTokensPerWallet
```

max tokens to buy, per wallet in a given wave

### waveTotalMinted (0x3e84aa5e)

```solidity
uint256 waveTotalMinted
```

number of total minted tokens in the current running wave

### waveOwnerToClaimedCounts (0x68d4a778)

```solidity
mapping(address => mapping(uint256 => uint256)) waveOwnerToClaimedCounts
```

mapping of [owner -> wave index -> minted count]

### indexWave (0x34b35ac0)

```solidity
uint256 indexWave
```

each wave has an index to help track minting/tokens per wallet

### allowedToExecuteMint (0xac3149e3)

```solidity
contract IERC20 allowedToExecuteMint
```

ERC20 contract through which the minting will be done (approveAndCall)
When there is a price for the minting, the payment will be done using this token

### signAddress (0x0682bdbc)

```solidity
address signAddress
```

all signatures must come from this specific address, otherwise they are invalid

### totalSupply (0x18160ddd)

```solidity
uint256 totalSupply
```

total amount of tokens minted till now

## Functions info

### constructor

```solidity
constructor()
```

oz-upgrades-unsafe-allow: constructor

### initialize (0x15491c21)

```solidity
function initialize(
    address _collectionOwner,
    string memory _initialBaseURI,
    string memory _name,
    string memory _symbol,
    address payable _mintTreasury,
    address _signAddress,
    address _initialTrustedForwarder,
    address _allowedToExecuteMint,
    uint256 _maxSupply
) external virtual initializer
```

external entry point initialization function in accordance with the upgradable pattern

calls all the init functions from the base classes. Emits {ContractInitialized} event

Parameters:

| Name                     | Type            | Description                                                                  |
| :----------------------- | :-------------- | :--------------------------------------------------------------------------- |
| _collectionOwner         | address         | the address that will be set as the owner of the collection                  |
| _initialBaseURI          | string          | an URI that will be used as the base for token URI                           |
| _name                    | string          | name of the ERC721 token                                                     |
| _symbol                  | string          | token symbol of the ERC721 token                                             |
| _mintTreasury            | address payable | collection treasury address (where the payments are sent)                    |
| _signAddress             | address         | signer address that is allowed to create mint signatures                     |
| _initialTrustedForwarder | address         | trusted forwarder address                                                    |
| _allowedToExecuteMint    | address         | token address that is used for payments and that is allowed to execute mint  |
| _maxSupply               | uint256         | max supply of tokens to be allowed to be minted per contract                 |

### setupWave (0x1992c3f3)

```solidity
function setupWave(
    uint256 _waveMaxTokensOverall,
    uint256 _waveMaxTokensPerWallet,
    uint256 _waveSingleTokenPrice
) external onlyOwner
```

function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be minted in total,
per wallet and minting price

event: {WaveSetup}

Parameters:

| Name                    | Type    | Description                                                                                    |
| :---------------------- | :------ | :--------------------------------------------------------------------------------------------- |
| _waveMaxTokensOverall   | uint256 | the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)     |
| _waveMaxTokensPerWallet | uint256 | max tokens to buy, per wallet in a given wave                                                  |
| _waveSingleTokenPrice   | uint256 | the price to mint a token in a given wave, in wei denoted by the allowedToExecuteMint contract |

### mint (0x731133e9)

```solidity
function mint(
    address _wallet,
    uint256 _amount,
    uint256 _signatureId,
    bytes calldata _signature
) external whenNotPaused nonReentrant
```

token minting function. Price is set by wave and is paid in tokens denoted by the allowedToExecuteMint contract

event: {Transfer}

Parameters:

| Name         | Type    | Description              |
| :----------- | :------ | :----------------------- |
| _wallet      | address | minting wallet           |
| _amount      | uint256 | number of token to mint  |
| _signatureId | uint256 | signing signature ID     |
| _signature   | bytes   | signing signature value  |

### batchMint (0x9386e197)

```solidity
function batchMint(
    NFTCollection.BatchMintingData[] calldata wallets
) external whenNotPaused onlyOwner
```

batch minting function, used by owner to airdrop directly to users.

this methods takes a list of destination wallets and can only be used by the owner of the contract

event: {Transfer}

Parameters:

| Name    | Type                                    | Description                             |
| :------ | :-------------------------------------- | :-------------------------------------- |
| wallets | struct NFTCollection.BatchMintingData[] | list of destination wallets and amounts |

### reveal (0xa90fe861)

```solidity
function reveal(
    uint256 _tokenId,
    uint256 _signatureId,
    bytes calldata _signature
) external whenNotPaused
```

helper function to emit the {MetadataUpdate} event in order for marketplaces to, on demand, refresh metadata, for the
provided token ID. Off-chain, gaming mechanics are done and this function is ultimately called to signal the end of a
reveal.

will revert if owner of token is not caller or if signature is not valid

event: {MetadataUpdate}

Parameters:

| Name         | Type    | Description                                                    |
| :----------- | :------ | :------------------------------------------------------------- |
| _tokenId     | uint256 | the ID belonging to the NFT token for which to emit the event  |
| _signatureId | uint256 | validation signature ID                                        |
| _signature   | bytes   | validation signature                                           |

### personalize (0x671b2a31)

```solidity
function personalize(
    uint256 _signatureId,
    bytes calldata _signature,
    uint256 _tokenId,
    uint256 _personalizationMask
) external whenNotPaused
```

personalize token traits according to the provided personalization bit-mask

after checks, it is reduced to personalizationTraits[_tokenId] = _personalizationMask

event: {MetadataUpdate}

Parameters:

| Name                 | Type    | Description                                        |
| :------------------- | :------ | :------------------------------------------------- |
| _signatureId         | uint256 | the ID of the provided signature                   |
| _signature           | bytes   | signing signature                                  |
| _tokenId             | uint256 | what token to personalize                          |
| _personalizationMask | uint256 | a mask where each bit has a custom meaning in-game |

### operatorPersonalize (0xa6e3ec26)

```solidity
function operatorPersonalize(
    uint256 _tokenId,
    uint256 _personalizationMask
) external onlyOwner
```

personalize token traits but can be called by owner or special roles address Used to change the traits of a token based
on an in-game action

reverts if token does not exist or if not authorized

event: {MetadataUpdate}

Parameters:

| Name                 | Type    | Description                                        |
| :------------------- | :------ | :------------------------------------------------- |
| _tokenId             | uint256 | what token to personalize                          |
| _personalizationMask | uint256 | a mask where each bit has a custom meaning in-game |

### burn (0x42966c68)

```solidity
function burn(uint256 tokenId) external whenNotPaused
```

Burns `tokenId`. The caller must own `tokenId` or be an approved operator.

See {ERC721BurnMemoryEnumerableUpgradeable.burn}.

event: TokenBurned

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

event: TokenBurningEnabled

### disableBurning (0x98603cca)

```solidity
function disableBurning() external onlyOwner
```

disables burning of tokens

reverts if burning already disabled.

event: TokenBurningDisabled

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
function setTreasury(address _treasury) external onlyOwner
```

update the treasury address

event: {TreasurySet}

Parameters:

| Name      | Type    | Description                      |
| :-------- | :------ | :------------------------------- |
| _treasury | address | new treasury address to be saved |

### setSignAddress (0x15137045)

```solidity
function setSignAddress(address _signAddress) external onlyOwner
```

updates the sign address.

event: {SignAddressSet}

Parameters:

| Name         | Type    | Description                  |
| :----------- | :------ | :--------------------------- |
| _signAddress | address | new signer address to be set |

### setMaxSupply (0x6f8b44b0)

```solidity
function setMaxSupply(uint256 _maxSupply) external onlyOwner
```

updates the sign address.

event: {MaxSupplySet}

Parameters:

| Name       | Type    | Description                                 |
| :--------- | :------ | :------------------------------------------ |
| _maxSupply | uint256 | maximum amount of tokens that can be minted |

### setAllowedExecuteMint (0x82bc7877)

```solidity
function setAllowedExecuteMint(IERC20Metadata _minterToken) external onlyOwner
```

updates which address is allowed to execute the mint function.

also resets default mint price

event: {DefaultMintingValuesSet}

Parameters:

| Name         | Type                    | Description                                                   |
| :----------- | :---------------------- | :------------------------------------------------------------ |
| _minterToken | contract IERC20Metadata | the address that will be allowed to execute the mint function |

### setBaseURI (0x55f804b3)

```solidity
function setBaseURI(string calldata baseURI) external onlyOwner
```

updates the base token URI for the contract

event: {BaseURISet}

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
) external virtual onlyAllowedOperator(from)
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
) external virtual onlyAllowedOperator(from)
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
| tokenId      | uint256 | the tokenId for                                     |
| receiver     | address | the receiver of the royalties                       |
| feeNumerator | uint96  | percentage of the royalties in feeDenominator units |

### resetTokenRoyalty (0x8a616bc0)

```solidity
function resetTokenRoyalty(uint256 tokenId) external onlyOwner
```

Resets royalty information for the token id back to the global default.

### setApprovalForAll (0xa22cb465)

```solidity
function setApprovalForAll(
    address operator,
    bool approved
) public override onlyAllowedOperatorApproval(operator)
```

See OpenZeppelin {IERC721-setApprovalForAll}

### approve (0x095ea7b3)

```solidity
function approve(
    address operator,
    uint256 tokenId
) public override onlyAllowedOperatorApproval(operator)
```

See OpenZeppelin {IERC721-approve}

### transferFrom (0x23b872dd)

```solidity
function transferFrom(
    address from,
    address to,
    uint256 tokenId
) public override onlyAllowedOperator(from)
```

See OpenZeppelin {IERC721-transferFrom}

### safeTransferFrom (0x42842e0e)

```solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
) public override onlyAllowedOperator(from)
```

See OpenZeppelin {IERC721-safeTransferFrom}

### safeTransferFrom (0xb88d4fde)

```solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
) public override onlyAllowedOperator(from)
```

See OpenZeppelin {IERC721-safeTransferFrom}

### personalizationOf (0x97944ba2)

```solidity
function personalizationOf(uint256 _tokenId) external view returns (uint256)
```

get the personalization of the indicated tokenID

Parameters:

| Name     | Type    | Description            |
| :------- | :------ | :--------------------- |
| _tokenId | uint256 | the token ID to check  |

Return values:

| Name | Type    | Description                         |
| :--- | :------ | :---------------------------------- |
| [0]  | uint256 | the personalization data as uint256 |

### checkMintAllowed (0x283ca77c)

```solidity
function checkMintAllowed(
    address _wallet,
    uint256 _amount
) external view returns (bool)
```

check if the indicated wallet can mint the indicated amount

Parameters:

| Name    | Type    | Description                            |
| :------ | :------ | :------------------------------------- |
| _wallet | address | wallet to be checked if it can mint    |
| _amount | uint256 | amount to be checked if can be minted  |

Return values:

| Name | Type | Description        |
| :--- | :--- | :----------------- |
| [0]  | bool | if can mint or not |

### price (0x26a49e37)

```solidity
function price(uint256 _count) public view virtual returns (uint256)
```

get the price of minting the indicated number of tokens for the current wave

Parameters:

| Name   | Type    | Description                                      |
| :----- | :------ | :----------------------------------------------- |
| _count | uint256 | the number of tokens to estimate mint price for  |

Return values:

| Name | Type    | Description                     |
| :--- | :------ | :------------------------------ |
| [0]  | uint256 | price of minting all the tokens |

### feeDenominator (0x180b0d7e)

```solidity
function feeDenominator() external pure virtual returns (uint96)
```

The denominator with which to interpret the fee set in {_setTokenRoyalty} and {_setDefaultRoyalty} as a fraction of the
sale price. Defaults to 10000 so fees are expressed in basis points, but may be customized by an override.

### chain (0xc763e5a1)

```solidity
function chain() external view returns (uint256)
```

helper automation function

Return values:

| Name | Type    | Description                        |
| :--- | :------ | :--------------------------------- |
| [0]  | uint256 | current chainID for the blockchain |

### supportsInterface (0x01ffc9a7)

```solidity
function supportsInterface(
    bytes4 interfaceId
) public view virtual override returns (bool)
```

See {IERC165-supportsInterface}.
