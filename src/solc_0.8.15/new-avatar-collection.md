# Overview

A WIP implementation for the new Avatar Collection contract, coupled with a Collection Factory for easier deployments.

The project is still heavily under development and will be subjugated to further changes pending the upcoming audit.

# Scope

| File | Type | Lines | SLOC | Comment Lines | Line Coverage | Purpose |
|:-|:-|:-|:-|:-|:-|:-:|
| src/solc_0.8.15/common/IERC4906.sol | Interface | 17 | 5 | 8 |  - | IERC4906 Interface | 
| src/solc_0.8.15/common/IERC5313.sol | Interface | 21 | 3 | 14 |  - | IERC5313 Interface |
| src/solc_0.8.15/avatar/AvatarCollection.sol | Contract | 728 | 303 | 260 | 0% | The new Avatar Collection contract. Will be used as the default implementation in the beacon proxy pattern | 
| src/solc_0.8.15/avatar/ERC721BurnMemoryEnumerableUpgradeable.sol | Contract | 81 | 28 | 39 | 0%  | ERC721EnumerableUpgradeable extension that supports storing information about *who burned what token* to be used more easily off-chain then replying only on Events |
| src/solc_0.8.15/avatar/CollectionAccessControl.sol | Abstract | 152 | 61 | 60 | 0% | Hybrid Owner + Role access control management for collections |
| src/solc_0.8.15/avatar/CollectionStateManagement.sol | Contract | 64 | 21 | 36 | 0% | State management for collections (marketing minting, public minting, etc) |
| src/solc_0.8.15/proxy/CollectionFactory.sol | Contract | 476 | 156 | 200 | 100% | Deployer factory for collection proxies and beacon contracts, main deployment code |
| src/solc_0.8.15/proxy/CollectionProxy.sol | Contract | 82 | 24 | 49 | 100% | BeaconProxy extension that supports changing beacon by an admin |
| Totals | - | 1621 | 601 | 666 |   |   |


# Dependencies / External Imports

| Dependency / Import Path |    Count |
|:-|:-:|
|openzeppelin-contracts-upgradeable/access/AccessControlUpgradeable.sol | 2 |
|openzeppelin-contracts-upgradeable/access/Ownable2StepUpgradeable.sol | 1 |
|openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol | 2 |
|openzeppelin-contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol | 1 |
|openzeppelin-contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol | 1 |
|openzeppelin-contracts/access/Ownable2Step.sol | 1 |
|openzeppelin-contracts/proxy/beacon/BeaconProxy.sol | 1 |
|openzeppelin-contracts/proxy/beacon/UpgradeableBeacon.sol | 1 |
|openzeppelin-contracts/token/ERC20/IERC20.sol | 1 |
|openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol | 1 |
|openzeppelin-contracts/utils/Address.sol | 2 |
|openzeppelin-contracts/utils/StorageSlot.sol | 1 |
|openzeppelin-contracts/utils/cryptography/ECDSA.sol | 1 |
|openzeppelin-contracts/utils/structs/EnumerableSet.sol | 1 |
|operator-filter-registry/upgradeable/UpdatableOperatorFiltererUpgradeable.sol | 1 |


# Other

Output from [Solidity Metrics](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-metrics) on the in-scope only files can be found [here](solidity-metrics.html)
