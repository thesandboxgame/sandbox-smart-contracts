# Overview

New avatar and related deployment contracts aim to ease the development and deployment of new Sandbox collections. 
This is done by optimizing logistic operations, even if some performance costs increases appear.

The entire system consists of an on-chain beacon proxy factory that will create collection proxies mapped to collection implementations.
Leveraging the Beacon Pattern into a Factory achieves the intended role of creating an instant upgrade mechanism for all beacon proxies while also supporting custom implementations for collections that require extra work.

System will be launched on Polygon.

# Contract Summaries

## CollectionProxy
 
A Beacon Proxy extension that supports having an admin (owner equivalent) that can change the beacon to which this proxy points to. 
Initial admin is set to the contract deployer

As there are several functions added directly in the proxy, any contract behind it (implementation) must be aware that functions with the following sighash will not be reached, as they will hit the proxy and not be delegate-called to the implementation

```
Sighash   |   Function Signature
=========================================
f8ab7198  =>  changeBeacon(address,bytes)
aac96d4b  =>  changeCollectionProxyAdmin(address)
59659e90  =>  beacon()
3e47158c  =>  proxyAdmin()
```

## CollectionFactory

Contract purpose is to allow for easy deployment of new collections and easy upgrade of existing ones.
The factory can launch (or be added to) a beacon to which collections may point to
Each collection is represented by a `CollectionProxy` that points to a beacon
Collections (proxies) can have the beacon they are pointing to changed either by the factory owner or by the collection owner.

As this contract is not intended to be upgradable, to support the case of any new factory being needed, methods for adding and removing beacons and collections were made. Their intended purpose is to provide a means to migrate to a new Factory if needed and/or remove any defective/somehow compromised collection if that situation arise.

Ownership will be transferred to a multi-sig. 

## CollectionAccessControl

This contract represents the access control functionality for avatar collections. We wanted an access control functionality that:
- has owner
- 2 step owner transfer
- allows roles
- only owner can add users to roles
- transferring owner does not break the above invariants

Some functionality was taken directly from `Ownable2StepUpgradeable`:
- exactly as they were: __pendingOwner_ variable, _OwnershipTransferStarted_ event and functions: _pendingOwner_, _transferOwnership_, __transferOwnership_
 - slightly modified: `acceptOwnership`: to also the transfer of `ADMIN_ROLE` before changing ownership

We could not inherit `Ownable2StepUpgradeable` directly because `Ownable2StepUpgradeable.acceptOwnership()` is [not declared virtual](https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/v4.8.3/contracts/access/Ownable2StepUpgradeable.sol#L59) (as of release version 4.8.3 [although it is planed](https://github.com/OpenZeppelin/openzeppelin-contracts/pull/3960) for it to be added in the future). Using it as it is, would of broken the invariant that the owner must remain the only one with the `ADMIN_ROLE` in case of an ownership transfer.

Basically the contract is a hybrid between AccessRoles and Ownership.

There are 3 roles implemented that will be given to trusted parties/multisig where appropriate:
- `ADMIN`: 
  - is admin over all other roles (can add remove address from them) and is given only to the owner of contract
  - is also transferred in the 2 step ownership transfer routine
  - cannot add more `ADMIN`s (implicit cannot be removed) (in this way, it is not similar to the `DEFAULT_ADMIN_ROLE` role)
- `CONFIGURATOR`
  - logistic helper for when operating on collection reveal operations and mint phase setups
  - can call key functions such as setting up a minting wave (minting is done in waves, which overlap over phases/steps e.g. allowlist/marketing)
  - can also call token metadata configuration specific functions
- `TRANSFORMER`
  - logistic helper for when personalizing specific tokens
  - used for cases where, either by a user interaction in-game or by doing a specific set of actions, a _personalization_ (transformation) is
  done on the token. Personalizations are stored as bitmaps (precalculated and just uploaded on-chain) and are checked off-chain to determine the customizations that are to be seen in-game.
  - note, personalizations can also be done by direct user action in some cases (not only `TRANSFORMER` role accounts)  

## ERC721BurnMemoryEnumerableUpgradeable

An experimental extension of `ERC721EnumerableUpgradable` that focuses on storing, on-chain, the following information:
- who burned what tokens?
- who is the burner of this token?
- did user burn any tokens?
- how many tokens did user burn?

In-game realtime responsiveness to on-chain events can suffer a few minutes lag depending on the system load, event indexing, collecting, internal storage and processing. In order to streamline these checks, this solution allows for an off-chain API to simply check (after user has done whatever burn was required) on demand and instant if the burn was actually done.

## AvatarCollection

ERC721 contract variation for future Avatar collections. Is expected to be initialize via `CollectionFactory` or other similar factories.

From a development point of view, this is an extension over the old [GenericRaffle.sol](../raffle/GenericRaffle.sol) contract

Some features:
- upgradable
- ownable (2 step transfer) and multi-role support for simplifying logistics
- OpenSea royalty compliant
- ERC4906 compliant
- supports ERC2771 for services like Biconomy
- supports "burn memory": keeping track of who burned what token for faster in-game gating checks
- minting is only supported via ERC20 token contracts that support `approveAndCall` as mint price is in non-native tokens

It uses the `CollectionAccessControl` component to set which configuration functions can be called by what roles.

Minting, reveal and personalization, when done by user, are all gated by a signature that is generated off-chain by a trusted signing address. On chain, this signature is verified and saved to also counter signature reuse attacks.

As already mentioned, minting is also only allowed through a custom ERC20 token (in our case the `SAND` contract) which allows for the `approveAndCall` function. This is done strictly to improve UI UX, as non-web3 savvy users would have only 1 transaction to approve (the approve and call) instead of 2 (approve then call minting).

We also plan on using services similar to Biconomy, as such the use of `_msgSender` (`ERC2771HandlerUpgradeable`) is not randomly present.

We initially planed to use a state system for the minting phases, but ultimately found that as the contract is now, such logic would not bring any relevant benefit.

There are 3 minting phases:
- `marketing` - where tokens are minted freely by authorized addresses to be used by the team for marketing purposes
- `allowlist` - where allowlisted addresses can mint
- `public` - classic public mint

Allowlisting/marketing gating is done off-chain via the signature mechanism. If an address is not known to be allowlisted (in our internal database) the system will not generate a valid signature to be passed to the on-chain mint, thus minting will not be possible.

Note, each phase can occur more then once, this is intended. Phases are on-chain composed of by token price (amount in `allowedToExecute` ERC20 contract tokens), max # of mints per wallet and max # of mints per wave and off-chain by how we allow the public to mint. 

# Scope

File|blank|comment|code
--------|--------|--------|--------
SUM:|576|1183|2224
-------------------------------------------------------------------------------

| File | Type | Blank Lines | Comment Lines | SLOC | Short description |
|:-|:-|:-|:-|:-|:-:|
| [packages/core/src/solc_0.8.15/common/IERC4906.sol](../common/IERC4906.sol) | Interface | 3 | 8 | 5 | IERC4906 Interface | 
| [packages/core/src/solc_0.8.15/common/IERC5313.sol](../common/IERC5313.sol) | Interface | 3 | 13 | 4 | IERC5313 Interface |
| [packages/core/src/solc_0.8.15/avatar/AvatarCollection.sol](AvatarCollection.sol) | Contract | 109 | 395 | 488 | The new Avatar Collection contract. Will be used as the default implementation in the beacon proxy pattern | 
| [packages/core/src/solc_0.8.15/avatar/ERC721BurnMemoryEnumerableUpgradeable.sol](C721BurnMemoryEnumerableUpgradeable.sol) | Contract | 13 | 50 | 27 | ERC721EnumerableUpgradeable extension that supports storing information about *who burned what token* to be used more easily off-chain then replying only on Events |
| [packages/core/src/solc_0.8.15/avatar/CollectionAccessControl.sol](CollectionAccessControl.sol) | Abstract | 28 | 121 | 60 | Hybrid Owner + Role access control management for collections |
| [packages/core/src/solc_0.8.15/proxy/CollectionFactory.sol](../proxy/CollectionFactory.sol) | Contract | 62 | 212 | 174 | Deployer factory for collection proxies and beacon contracts, main deployment code |
| [packages/core/src/solc_0.8.15/proxy/CollectionProxy.sol](../proxy/CollectionProxy.sol) | Contract | 9 | 66 | 22 | BeaconProxy extension that supports changing beacon by an admin |
| Totals | - | 227 | 865 | 780 | -  |


# Known and Acknowledged Issues

The following situations, conditions or issues are known and have been accepted as they are. While feedback can be provided in this direction, the output will most like be the same.

### Centralization risks 

At each point if an account is compromised this can lead to unwanted situations. To partially mitigate these we will use multi-sigs (where useful).

If other roles besides the owner is compromised on the Avatar contract, the owner can change them. Collection owner will be a multi-sig.

The Factory can change the implementation of a collection, but this is not something that can be avoided as that is the point of a proxy pattern, a privileged address must be able to do that.

### Known signature issues

There are several possible issues with the signature system. For example, the schema does not support signature expiration or revocation.  

_A malicious party could withhold signatures and then submit them at an inopportune time_. For that instance, withholding signature has no benefit to malicious party as it would simply not allow him to mint. If the minting is finished, then again not useful as the mint would fail. 

Signers are locked into what they have signed is not an issue. Only 1 address, the `signAddress` generates these signatures and provides them as prof of allowlisting (similar to how Merkle allowlisting works). Without submitting the signature on-chain users do not lose anything nor there is any internal accounting done, that is only noted after actual usage.

Also, signatures cannot be reused between collections as they contain collection specific inputs (the address).

### Mint Caller Is Also the Payment Currency

To reinstate, we will only support minting through custom `ERC20` tokens that allow for `approveAndCall` functionality. It is most likely that `SAND` will be the only token contract ever used.

### Insufficient Pseudorandomness

In the Avatar collection there is a `_getRandomToken` function. A determined attacker can calculate in advance the result and determine what tokenID he will mint. This does not provide them with any advantage as we shuffle the metadata before reveal, off-chain. We will not use Chainlink APIs here.

### Registry Enforcement May Not Match Opensea

We reserve the right to opt out of enforcing Opensea Registry blocking if need be.

### Clone-and-Own

There are parts of code taken from OpenZeppelin contracts (master branch). These, at the time of writing, were not in the newest release (v4.8.3). As such we copied them and eagerly await to remove them once they are available in stable versions.

This includes code from `Ownable2StepUpgradeable` (as already mentioned) and the `IERC4906` and `IERC5313` files. 
