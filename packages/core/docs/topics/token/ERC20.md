---
breaks: false

description: Our ERC20 custom implementation

---

# [Our ERC20 Implementation](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.5/Sand/erc20/ERC20BaseToken.sol)

## Introduction

This document describes our custom base implementation of an [ERC20](https://eips.ethereum.org/EIPS/eip-20)
compatible smart contract.

It is a based (not inherited, but copied)
in the Openzeppelin
ERC20 [implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol)
with some extensions.

Reading the [ERC20](https://eips.ethereum.org/EIPS/eip-20) documentation is a pre-requisite to read this document, but
here below we explain the most important aspects:

1. ERC20 represents a fungible token, each account has an amount related to it.
2. Amounts can be transferred between accounts.
3. An account can allow a third party to control his funds (by calling the `approve` method). After approval the third
   party can call `transferFrom` to move the funds.
4. Usually the mint and burn functions are declared but not exposed. The specific behaviour for the creation and
   destruction of tokens must be implemented in an inherited contract (for example: the initial minting of tokens).

***There are different implementations of this contract for different solidity compiler versions, this document focuses
on the 0.5 version.***

# Extensions

This contract has two type of extensions:

1. Those that are implemented directly in the code and cannot be removed or changed.
2. Those that are mixins used by the inherited contracts optionally.

## Build in extensions

- The `burn` method is exposed, so a user can burn his own tokens.
- An ***admin*** account that can add and remove ***Super Operators***
- A set of addresses called ***Super Operators*** that can:
    - Transfer funds freely from any address to any destination using `transferFrom`
    - Do an approval for any user to any address by using `approveFor`
    - Burn tokens from any address using `burnFrom`
- addAllowanceIfNeeded: This shortcut method takes an amount, calculate the extra allowance needed and add it to the
  current one.
- The solidity 0.7 version adds a single ***operator*** account that can do the same as the ***Super Operators***

## Mixin Extensions

- ERC20BasicApproveExtension: This extension is an optimization to improve user experience. Instead of sending two
  transactions to approve and then call some smart contract the user calls `approveAndCall` or `paidCall` the difference
  between those to is that one set the amount to approve and the other only change the approved amount if needed.
- ERC20ExecuteExtension: This extension add a set of ***Execution Operators*** and an ***Execution Admin*** that can add
  and remove ***Execution Operators***. The execution operators can call other contracts on behalf of the Sand Token
  smart contract doing approvals before the call and transferring funds to charge for the gas used.
- ERC677Extension: This add the `transferAndCall` method that calls the callback `onTokenTransfer` in the destination
  address.

# Model

## Solidity 0.5

```plantuml
abstract Admin
abstract SuperOperators
abstract ERC20BaseToken
abstract ERC20BasicApproveExtension
abstract ERC20ExecuteExtension
class Sand

"Admin" <|-- "SuperOperators"
"SuperOperators" <|-- "ERC20BaseToken"
"ERC20BaseToken" <|-- "Sand"
"ERC20BasicApproveExtension" <|-- "Sand"
"ERC20ExecuteExtension" <|-- "Sand"
```

## Solidity 0.7 / 0.8

```plantuml
abstract WithAdmin
abstract WithSuperOperators
abstract ERC20BaseToken
abstract ERC20BasicApproveExtension
abstract ERC20ExecuteExtension
abstract ERC20Token
abstract SandBaseToken
abstract ERC677Extension

"SandBaseToken" <|-- "PolygonSand"

"ERC20BaseToken" <|-- "SandBaseToken"
"ERC20ExecuteExtension" <|-- "SandBaseToken"
"ERC20BasicApproveExtension"  <|-- "SandBaseToken"
 
"WithSuperOperators" <|-- "ERC20BaseToken"
"WithAdmin" <|-- "WithSuperOperators"



"ERC20BasicApproveExtension" <|-- "ERC20Token"
"ERC20BaseToken"  <|-- "ERC20Token"
"ERC677Extension" <|-- "ERC20Token"

"ERC20Token" <|-- "Catalyst" 
"ERC20Token" <|-- "Gem" 

```

## Process

Here we describe some of the specific processes that extensions add. See
the [ERC20](https://eips.ethereum.org/EIPS/eip-20) documentation for the standard operations.

### Regular ERC20 approve vs ERC20BasicApproveExtension

Regular ERC20
```plantuml
actor User
participant SandTokenSC
participant DestinationSC

"User" -> "SandTokenSC": approve(DestinationSC, someAmount)  
"User" -> "DestinationSC": execute some operation, for example deposit()
"DestinationSC" -> "SandTokenSC": calls transferFrom(user, DestinationSC)
"SandTokenSC" -> "SandTokenSC": Sand are assigned to DestinationSC
```

With ERC20BasicApproveExtension
```plantuml
actor User
participant SandTokenSC
participant DestinationSC

"User" -> "SandTokenSC": calls approveAndCall(DestinationSC, someAmount, call deposit message)  
activate SandTokenSC
"SandTokenSC" -> "SandTokenSC": call approve(DestinationSC, someAmount)
"SandTokenSC" -> "DestinationSC": call deposit()
"DestinationSC" -> "SandTokenSC": calls transferFrom(user, DestinationSC)
"SandTokenSC" -> "SandTokenSC": Sand are assigned to DestinationSC
deactivate SandTokenSC
```
