---
breaks: false

description: SignedERC20Giveaway contract
---

# SignedERC20Giveaway

## Introduction

The signed giveaway contract is used as a hot wallet. The company deposits [SAND](../sand/sand-token.md) and then gives
the users signed messages that let them claim part of the deposited SAND as rewards/incentives.

## Model

### Roles

The contract support the following roles:

- DEFAULT_ADMIN_ROLE: Can assign add/remove signers to the signer role, can pause the contract operation and can revoke
  claims.
- SIGNER_ROLE: Addresses in this role are authorized to sign claim messages.

### Properties

- The contract is Upgradeable.
- The contract is generic and can work with any [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible token.
- Each claim must have a unique claimId, claims can only be used once.
- The operation of the contract can be paused by an administrator.
- The administrator can revoke some specific claimId, so they cannot be claimed anymore.

| Feature           | Link                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract          | [SignedERC20Giveaway.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/claims/signedGiveaway/SignedERC20Giveaway.sol) |
| EIP721 signatures | [EIP721](https://eips.ethereum.org/EIPS/eip-712)                                                                                                            |
| ERC20             | [ERC20](https://eips.ethereum.org/EIPS/eip-20)                                                                                                              |
| ERC2771 (Meta-Tx) | [Custom Sandbox contract](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/common/BaseWithStorage/ERC2771Handler.sol)     |
| Upgradeable       | [Openzeppelin upgradeable](https://docs.openzeppelin.com/upgrades-plugins)                                                                                  |
| Access Control    | [Openzeppelin Access control](https://docs.openzeppelin.com/contracts/4.x/access-control)                                                                   |
| Pausable          | [Openzeppelin Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)                                                                  |

### Claim Message

```plantuml

entity Signature {
    uint8 v,
    bytes32 r,
    bytes32 s,
}

entity ClaimMessage {
    Signature signature,
    address signer,
    uint256 claimId,
    address token,
    address to,
    uint256 amount
}

ClaimMessage::signature *-- Signature
```

### Class diagram

```plantuml
title class diagram
class SignedERC20Giveaway {
    claim()
    revokeClaims()
    pause()
    upause()
}
Initializable <|-- SignedERC20Giveaway
ContextUpgradeable <|-- SignedERC20Giveaway
AccessControlUpgradeable <|-- SignedERC20Giveaway
EIP712Upgradeable <|-- SignedERC20Giveaway
ERC2771Handler <|-- SignedERC20Giveaway
PausableUpgradeable <|-- SignedERC20Giveaway
```

## Processes

```plantuml
actor User
participant Backend
entity SignedERC20Giveaway
entity SandContract

User -> Backend: User decide to do a claim, it asks the backend for an authorization message
Backend -> User: Discount the claim and give a signed authorization message
User -> SignedERC20Giveaway: Send a transaction that includes the claim message
SignedERC20Giveaway -> SandContract: Transfer the Sand.
SandContract -> User: get the Sand.

```
