# Asset Single Giveaway Smart Contract

## Introduction

Asset Single Giveaway permits to distribute [asset](https://sandboxgame.gitbook.io/the-sandbox/assets/what-are-assets) rewards to users.
Users can [earn the assets](https://sandboxgame.gitbook.io/the-sandbox/other/earning-sand-and-nfts#earning-assets) in many ways like discord hunt, unicly contest and so on.
And they can claim the assets from this contract with require params. You can find more information below.

## Process

Admin locks assets with a [merkle root](https://solidity-by-example.org/app/merkle-tree/) and users can claim their assets with matching params.

This time the key is not the land id but the user’s ethereum address.

Once a user claimed its tokens, it cannot be claimed again.

On the frontend, we can show the list of assets the user is entitled to. Once the user claims the asset, the frontend can fetch from the backend the merkle proof and any extra parameter needed to perform the tx call.

```plantuml
title sequence diagram

actor User
actor Admin
entity Backend
entity "Single Asset Giveaway"
entity ClaimERC1155
entity ERC1155

== Generating Merkle Root ==
Admin -> Backend : Generate Merkle Root
Backend -> Admin: Return Merkle Root and Other extra params

== Locking the asset ==
Admin -> "Single Asset Giveaway": Deploy (merkle root, expiry time)
Admin -> "Single Asset Giveaway": Set Merkle Root (merkle root)

== Claim the asset ==
User -> "Single Asset Giveaway": Claim Asset (to, asset ids, asset values, proof, salt)
"Single Asset Giveaway" -> ClaimERC1155: Claim ERC1155 (to, asset ids, asset values, proof, salt)
ClaimERC1155 -> ERC1155: Tranfer the Tokens(from, to, asset ids, asset values)
```

## Model

### 1. Set Merkle Tree

Only admin can set a merkle tree, only once. Admin is determined while deploying the contract.

### 2. Claim Assets

Claim assets with receiver address, token ids, token amounts, proof and salt.
Once proof and salt are verified, claim works.

```plantuml
title class diagram
class AssetGiveaway {
  __Variables__
  #_expiryTime: uint256
  +claimed: mapping(address => bool)
  __Functions__
  +constructor(address asset,address admin,bytes32 merkleRoot,address assetsHolder,uint256 expiryTime)
  +setMerkleRoot(bytes32 merkleRoot)
  +claimAssets(address to,uint256[] calldata assetIds,uint256[] calldata assetValues, bytes32[] calldata proof,bytes32 salt)
}
class ClaimERC1155  {
  __Variable__
  #_merkleRoot: bytes32
  #_asset: IERC1155
  #_assetsHolder: address
  __Fuctions__
  +constructor(IERC1155 asset, address assetsHolder)
  #_claimERC1155(address to,uint256[] calldata assetIds,uint256[] calldata assetValues,bytes32[] calldata proof,bytes32 salt)
  #_checkValidity(address to,uint256[] memory assetIds,uint256[] memory assetValues,bytes32[] memory proof,bytes32 salt)
  #_generateClaimHash(address to,uint256[] memory assetIds,uint256[] memory assetValues,bytes32 salt)
  #_verify(bytes32[] memory proof, bytes32 leaf)
  #_sendAssets(address to,uint256[] memory assetIds,uint256[] memory assetValues)
}

class ERC1155 {
}

ClaimERC1155 --|> AssetGiveaway
ClaimERC1155 o-- ERC1155
```

## Feature of the contract

|              Feature | Link                                   |
| --------------------:|:-------------------------------------- |
|            `ERC-1155`| [https://eips.ethereum.org/EIPS/eip-1155](https://eips.ethereum.org/EIPS/eip-1155) |
|        `Merkle Tree` | [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/) |
|          `WithAdmin` | Access Control to the functions  |

## References

1. ERC Token Standards : [https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token)

2. Merkle Tree : [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/)