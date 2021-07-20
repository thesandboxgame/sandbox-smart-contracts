# Giveaway Smart Contract

## Overview

Smart Contract for Giveaway

#### 1. Single Giveaway
Similarly to the Land presales, we have an off-chain merkle tree, (or a list of proofs)
This time the key is not the land id but the user’s ethereum address.

Once a user claim its tokens, it cannot claim again

On the frontend, we can show the list of assets it is entitled to. Once the user click claim, the frontend can fetch from the backend the proof and any extra parameter to perform the tx call.

#### 2. Muptiple Giveaway

Similar to the Land presales and the Asset giveaway, we have an off-chain merkle tree (or a list of proofs). The key is the user’s Ethereum address. This is a reusable contract, so multiple off-chain merkle trees can be used. Once a user claims their tokens relating to a particular merkle tree, it cannot claim them again.

On the frontend, we can show the list of tokens the user is entitled to, for each merkle tree. Once the user clicks ‘claim’, the frontend can fetch from the backend the relevant proof(s) and any extra parameter to perform the tx call.

# Features

### Single Giveaway

#### 1. Set Merkle Tree

Only admin can set merkle tree only one time. Admin is determined while deploying the contract.

#### 2. Claim Assets

Claim assets with receiver address, token ids, token amounts, proof and salt.
Once proof and salt are verified, claim works.

### Multiple Giveaway

#### 1. Add New Giveaway

Only admin can add merkle roots and expiry times. Admin is determined while deploying the contract.

#### 2. Get Claimed Status

To check the merkle trees for a particular user.

#### 3. Claim MultipleTokens From Multiple MerkleTree

Submit multiple Claims with multiple proofs and multiple merkle root hashes
For multiple tokens from multiple giveaways (i.e. a Claim array) - see below for Claim object

#### 4. Claim Multiple Tokens

Submit one Claim with a proof and a merkle root hash
For multiple tokens from 1 giveaway (i.e. a single Claim) - see below for Claim object

-A Claim is made up of multiple ERC1155, ERC721 and ERC20 tokens as shown below. The salt param is optional.

## References

1. ERC Token Standards : [https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token)

2. Merkle Tree : [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/)