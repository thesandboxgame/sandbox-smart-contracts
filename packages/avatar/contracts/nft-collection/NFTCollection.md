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

There are two global limits that apply independent of the waves:
- `maxSupply` limits the total amount of tokens that can be minted in the collection.
- `maxTokensPerWallet` limits the total amount that each wallet can mint.

Each wave sets the following parameters:

- `waveMaxTokensOverall`: The total amount of tokens that can be minted in the current wave.
- `waveMaxTokensPerWallet`: The amount of tokens that each wallet can mint in the current wave.
- `waveSingleTokenPrice`: The price in Sand (or another ERC20) that must be paid to mint a token in this wave.
