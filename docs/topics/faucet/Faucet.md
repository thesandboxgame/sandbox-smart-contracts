---
description: Faucet
---

# [Faucet]((https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/faucet/Faucet.sol))

## Introduction

The purpose of this contract is to create faucet on ERC-20 token.
This contract makes it possible to distribute sand or any ERC20 token to any user who requests it.

## Model

This contract is dealing with sand (or any ERC20 token).  
[ERC20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) is the classic standard to represent fungible token.  

## Process

### Step 1

Sand admin or beneficiary transfer some sand from an address on faucet deployer address.

### Step 2

Faucet deployer need to authorize any transfer from his account to any account.
We build the digest message that was signed with the owner private key.  

The digest message is built in a standardized way starting with \x19 (EIP-712 implements EIP-191):  
It was first implemented by [Geth](https://github.com/ethereum/go-ethereum/pull/2940)  
```
"\x19Ethereum message to be signed" + length(message) + message  
```
In order to  have a fixed length message we hash it:  
```
"\x19Ethereum message to be signed" + keccak256(message)  
```
Standard EIP-191 also recommanded to use byte version to :  
- x00: Data with “intended validator.” In the case of a contract, this can be the address of the contract.  
- 0x01: Structured data, as defined in EIP-712.  
- 0x45: Regular signed messages.  


The structure of a hashed message must allow one thing: avoid domain and data structure collision.  
We need to be sure that our signed message will only me compatible with a specific domain smart contract with specific data format at a specific address.  
So in the message to sign we will have to include a DOMAIN_SEPARATOR that indicates the smart contract domain.  
In our case it is given by:
```
EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,address verifyingContract)")  
```
and then:
```
DOMAIN_SEPARATOR = keccak256(EIP712DOMAIN_TYPEHASH + keccak256("The Sandbox") + keccak256("1") + address(this))  
```
The smart contract address is given by:  
```
address(this) 
```
Then come the TYPE_HASH that describes expected structure data:  
```
FAUCET_TYPEHASH = keccak256("Faucet(address owner,uint256 amountTransferLimit,uint256 nonce,uint256 deadline)")  
```
It is basically the signature of the contract method.  
Then we concatenate the transaction data itself : ie owner, amountTransferLimit, nonce, deadline  

### Step 4

In elliptic cryptographie ECDSA (Elliptic Curve Digital Signature Algorithm)  
message signatures are made with two integers: r and s (32 bytes).  
[Ethereum](https://medium.com/mycrypto/the-magic-of-digital-signatures-on-ethereum-98fe184dc9c7) has added an additional recovery identifier variable called v.
So the signature computed is made of (v, r, s).  

[ecrecover](https://soliditydeveloper.com/ecrecover) is a function that allow us to [recover address](https://crypto.stackexchange.com/questions/18105/how-does-recovering-the-public-key-from-an-ecdsa-signature-work) ( derived from a public key ) associated to the private key that signed a message.  
We must have both signature (v, r, s) and the original message that was signed with private key (in our case the message is digest).  

v can either be 27 or 28.  
On elliptic curve multiple points can be computed from (r, s) alone.  
This would result in multiple public key computed from signed message.  
This is why we must have recovery identifier to select the right point and then the right address.  

### Step 4

Once we recovered the address from the signature and digest, we must check that it is the owner address and exit overwise.  

### Step 5

We now have the proof that the owner gave his agreement for a transfer on any address (with given amount limit).  
So we transmit this approval for erc20 contract. 

### Step 6

Anyone can then ask for an amount Sand (or ERC20 Token) through faucet receive method.

### Step 7

Faucet contract check that the asked amount is less that maximum amount authorized for a request.
If it is not the case the operation is reverted.

### Step 8

Faucet contract check that the time delta between each request for each user is much less than a parameter named period.
This period parameter is given as an argument of the constructor. If it is not the case the operation is reverted.

### Step 9

Faucet contract call transferFrom method of Sand (Erc20) contract with faucet deployer address, receiver address, and amount.
Amount is the minimun between balanceOf(deployer) and requested amount.

## Class diagram

```plantuml
@startuml
EIP712 <|-- TheSandbox712
TheSandbox712 <|-- Faucet
IERC20 <|-- Sand
Faucet "many" *-- "1" IERC20 : contains

class EIP712 {
}

class TheSandbox712 {
  + bytes32 DOMAIN_SEPARATOR
}

class Faucet {
  - IERC20 _sand
  + void approve(uint256 approvedAmount, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
  + void receive(address _receiver, uint256 amount)
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

```plantuml
@startuml
  actor "IERC20 beneficiary"
  actor "Faucet deployer"
  actor User
  participant Faucet
  participant Reject
  participant IERC20

  "IERC20 beneficiary" -> "IERC20" : transfer IERC20 token from ierc20 beneficiary address to faucet deployer address
  "Faucet deployer" -> "Faucet" : call approve Faucet method's with approved amount, deadline and approval message signature
  "Faucet" -> "Reject" : deadline is over
  "Faucet" -> "Faucet" : generate approval message
  "Faucet" -> "Faucet" : recover address from message and signature
  "Faucet" -> "Reject" : address is not owner's address
  "Faucet" -> "IERC20" : approve transfer from owner to any address for the amount
  "User" -> "Faucet" : call receive with asked amount
  "Faucet" -> "Reject" : the previous demand was too recent
  "Faucet" -> "Reject" : the asked amount demand was too recent
  "Faucet" -> "IERC20" : transfer funds from faucet deployer address to user address
@enduml
```
