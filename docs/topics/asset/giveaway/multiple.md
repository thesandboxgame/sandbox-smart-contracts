# Asset Multiple Giveaway Smart Contract

## Overview

Admin locks multiple asset with merkle roots and user can claim the asset with matching params.

Similar to Land presales and the Asset giveaway, we have an off-chain merkle tree. The key is the user’s Ethereum address. This is a reusable contract, so multiple off-chain merkle trees can be used. Once a user claims their tokens relating to a particular merkle tree, it cannot claim them again.

On the frontend, we can show the list of tokens the user is entitled to, for each merkle tree. Once the user clicks ‘claim’, the frontend can fetch from the backend the relevant proof(s) and any extra parameter to perform the tx call.

## Features

### 1. Add New Giveaway

Only admin can add merkle roots and expiry times. Admin is determined while deploying the contract.

### 2. Get Claimed Status

To check the merkle trees for a particular user.

### 3. Claim MultipleTokens From Multiple MerkleTree

Submit multiple Claims with multiple proofs and multiple merkle root hashes
For multiple tokens from multiple giveaways (i.e. a Claim array) - see below for Claim object

### 4. Claim Multiple Tokens

Submit one Claim with a proof and a merkle root hash
For multiple tokens from 1 giveaway (i.e. a single Claim) - see below for Claim object

-A Claim is made up of multiple ERC1155, ERC721 and ERC20 tokens as shown below. The salt param is optional.

## Diagram
```plantuml
title sequence diagram

actor User
actor Admin
entity "Multiple Asset Giveaway"
entity ClaimERC1155ERC721ERC20 

== Locking the asset ==
Admin -> "Multiple Asset Giveaway": Deploy
Admin -> "Multiple Asset Giveaway": Add New Giveaway (merkle root, expiry time)

== Claim the asset ==
User -> "Multiple Asset Giveaway": Claim Multiple Tokens From Mutiple Merkle Tree (rootHashes, claim struct array, proofs)
"Multiple Asset Giveaway" -> ClaimERC1155ERC721ERC20: Claim ERC1155, ERC721, ERC20 Tokens (merkle root, claim, proof)

== Get Claim Status ==
User -> "Multiple Asset Giveaway": Get Claim Status (user, rootHashes)
"Multiple Asset Giveaway" -> User: Return Claim Status (status array)
```

```plantuml
title class diagram
class MultiGiveaway {
  __Variables__
  +claimed mapping(address => mapping(bytes32 => bool))
  #_expiryTime mapping(bytes32 => uint256)
  __Functions__
  +constructor(address admin)
  +addNewGiveaway(bytes32 merkleRoot, uint256 expiryTime)
  +getClaimedStatus(address user, bytes32[] calldata rootHashes)
  +claimMultipleTokensFromMultipleMerkleTree(bytes32[] calldata rootHashes,Claim[] memory claims,bytes32[][] calldata proofs)
  +claimMultipleTokens(bytes32 merkleRoot,Claim memory claim,bytes32[] calldata proof)
}
class ClaimERC1155ERC721ERC20 {
  #_claimERC1155ERC721ERC20(bytes32 merkleRoot,Claim memory claim,bytes32[] calldata proof)
  -_checkValidity(bytes32 merkleRoot,Claim memory claim,bytes32[] memory proof)
  -_generateClaimHash(Claim memory claim)
  -_transferERC1155(address to,uint256[] memory ids,uint256[] memory values,address contractAddress)
  -_transferERC721(address to,uint256[] memory ids,address contractAddress)
  -_transferERC20(address to,uint256[] memory amounts,address[] memory contractAddresses)
}

ClaimERC1155ERC721ERC20 --|> MultiGiveaway
```

## References

1. ERC Token Standards : [https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token)

2. Merkle Tree : [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/)