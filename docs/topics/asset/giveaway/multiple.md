# Asset Multiple Giveaway Smart Contract

## Introduction

Asset Multiple Giveaway permits to distribute [asset](https://sandboxgame.gitbook.io/the-sandbox/assets/what-are-assets) rewards to users.
Users can [earn the assets](https://sandboxgame.gitbook.io/the-sandbox/other/earning-sand-and-nfts#earning-assets) in many ways like discord hunt, unicly contest and so on.
And they can claim the assets from this contract with require params. You can find more information below.

## Process

Admin locks multiple assets with a [merkle roots](https://solidity-by-example.org/app/merkle-tree/) and user can claim the asset with matching params.

The key is the user’s Ethereum address. This is a reusable contract, so multiple off-chain merkle trees can be used. Once a user claimed their tokens relating to a particular merkle tree, it cannot be claimed them again.

On the frontend, we can show the list of tokens the user is entitled to, for each merkle tree. Once the user claims the asset, the frontend can fetch from the backend the relevant proof(s) and any extra parameter to perform the tx call.

```plantuml
title sequence diagram

actor User
actor Admin
entity Backend
entity "Multiple Asset Giveaway"
entity ClaimERC1155ERC721ERC20
entity ERC20
entity ERC721
entity ERC1155

== Generating Merkle Root ==
Admin -> Backend : Generate Merkle Root
Backend -> Admin: Return Merkle Root and Other extra params

== Locking the asset ==
Admin -> "Multiple Asset Giveaway": Deploy
Admin -> "Multiple Asset Giveaway": Add New Giveaway (merkle root, expiry time)

== Claim the asset ==
User -> "Multiple Asset Giveaway": Claim Multiple Tokens From Mutiple Merkle Tree (rootHashes, claim struct array, proofs)
"Multiple Asset Giveaway" -> ClaimERC1155ERC721ERC20: Claim ERC1155, ERC721, ERC20 Tokens (merkle root, claim, proof)
ClaimERC1155ERC721ERC20 -> ERC20: Transfer the Tokens (from, to, amount)
ClaimERC1155ERC721ERC20 -> ERC721: Transfer the Tokens (from, to, id)
ClaimERC1155ERC721ERC20 -> ERC1155: Transfer the Tokens (from, to, id, amount)

== Get Claim Status ==
User -> "Multiple Asset Giveaway": Get Claim Status (user, rootHashes)
"Multiple Asset Giveaway" -> User: Return Claim Status (status array)
```

## Model

### 1. Add New Giveaway

Only admin can add merkle roots and expiry date. Admin is determined while deploying the contract.

### 2. Get Claimed Status

Check the merkle trees for a particular user.

### 3. Claim MultipleTokens From Multiple MerkleTree

Submit multiple Claims with multiple proofs and multiple merkle root hashes.
For multiple tokens from multiple giveaways (i.e. a Claim array) - see below for Claim object

### 4. Claim Multiple Tokens

Submit one Claim with a proof and a merkle root hash.
For multiple tokens from 1 giveaway (i.e. a single Claim) - see below for Claim object

-A Claim is made up of multiple ERC1155, ERC721 and ERC20 tokens as shown below. The salt param is optional.

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

class ERC1155 {

}

class ERC721 {

}

class ERC20 {

}

ClaimERC1155ERC721ERC20 --|> MultiGiveaway
ClaimERC1155ERC721ERC20 o-- ERC1155
ClaimERC1155ERC721ERC20 o-- ERC721
ClaimERC1155ERC721ERC20 o-- ERC20
```

## Feature of the contract

|              Feature | Link                                   |
| --------------------:|:-------------------------------------- |
|            `ERC-20`  | [https://eips.ethereum.org/EIPS/eip-20](https://eips.ethereum.org/EIPS/eip-20) |
|            `ERC-721`| [https://eips.ethereum.org/EIPS/eip-721](https://eips.ethereum.org/EIPS/eip-721) |
|            `ERC-1155`| [https://eips.ethereum.org/EIPS/eip-1155](https://eips.ethereum.org/EIPS/eip-1155) |
|        `Merkle Tree` | [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/) |
|          `WithAdmin` | Access Control to the functions  |

## References

1. ERC Token Standards : [https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token)

2. Merkle Tree : [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/)