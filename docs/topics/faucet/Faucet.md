---
description: Faucet
---

# [Faucet](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/faucet/Faucet.sol)

## Introduction

The purpose of this contract is to create faucet on ERC-20 token.
This contract makes it possible to distribute sand or any ERC20 token to any user who requests it.

## Model

This contract is dealing with sand (or any ERC20 token).  
[ERC20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) is the classic standard to represent fungible token.

## Process

### Step 1

Sand admin or beneficiary transfer some sand from an address to the faucet contract address.

### Step 2

A user ask for an amount Sand (or ERC20 Token) through Faucet send method.

### Step 3

Faucet contract check that the asked amount is less that maximum amount authorized for a request.
If it is not the case the operation is reverted.

### Step 4

Faucet contract check that the time delta between each request for each user is much less than a parameter named period.
This period parameter is given as an argument of the constructor. If it is not the case the operation is reverted.

### Step 5

Faucet contract call transferFrom method of Sand (Erc20) contract with faucet deployer address, receiver address, and amount.
Amount is the minimun between balanceOf(deployer) and requested amount.

## Class diagram

```plantuml
@startuml
IERC20 <|-- Sand
Ownable <|-- Faucet
Faucet "many" *-- "1" IERC20 : contains

class Faucet {
  - IERC20 _ierc20
  + uint256 balance()
  + uint256 getLimit()
  + void setLimit(uint256 limit)
  + uint256 getPeriod()
  + void setPeriod(uint256 period)
  + void send(uint256 amount)
  + void retrieve(address receiver);
}

class Ownable {
}

class IERC20 {
  + uint256 totalSupply()
  + uint256 balanceOf(address account)
  + bool transfer(address recipient, uint256 amount)
  + uint256 allowance(address owner, address spender)
  + bool approve(address spender, uint256 amount)
  + bool transferFrom(address sender, address recipient, uint256 amount)
}
@enduml
```

## Sequence diagram

### Send

```plantuml
@startuml
  actor "IERC20 beneficiary"
  actor User
  participant Faucet
  participant IERC20

  "IERC20 beneficiary" -> "IERC20" : transfer IERC20 token from ierc20 beneficiary address to faucet contract address
  "User" -> "Faucet" : call send with asked amount
  alt successful case
  "Faucet" -> "IERC20" : transfer funds from faucet deployer address to user address
  else the previous demand was too recent
  "Faucet" -> "User" : Reject
  else the asked amount demand was too recent
  "Faucet" -> "User" : Reject
  end
@enduml
```

### Retrieve

```plantuml
@startuml
  actor "IERC20 beneficiary"
  actor User
  participant Faucet
  participant IERC20

  "IERC20 beneficiary" -> "IERC20" : transfer IERC20 token from ierc20 beneficiary address to faucet contract address
  "User" -> "Faucet" : call retrieve with an address amount
  alt successful case
  "Faucet" -> "IERC20" : transfer funds from faucet deployer address to user address
  else Ownable: user is not the owner
  "Faucet" -> "User" : Reject
  end
@enduml
```
