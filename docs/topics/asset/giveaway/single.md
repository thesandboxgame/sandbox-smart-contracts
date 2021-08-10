# Asset Single Giveaway Smart Contract

## Overview

Admin locks asset with merkle root and user can claim the asset with matching params.

Similarly to Land presales, we have an off-chain merkle tree.
This time the key is not the land id but the user’s ethereum address.

Once a user claim its tokens, it cannot claim again

On the frontend, we can show the list of assets the user is entitled to. Once the user claims the asset, the frontend can fetch from the backend the merkle proof and any extra parameter needed to perform the tx call.

## Features

### 1. Set Merkle Tree

Only admin can set a merkle tree, only once. Admin is determined while deploying the contract.

### 2. Claim Assets

Claim assets with receiver address, token ids, token amounts, proof and salt.
Once proof and salt are verified, claim works.

## Diagram
```plantuml
title sequence diagram

actor User
actor Admin
entity "Single Asset Giveaway"
entity ClaimERC1155

== Locking the asset ==
Admin -> "Single Asset Giveaway": Deploy (merkle root, expiry time)
Admin -> "Single Asset Giveaway": Set Merkle Root (merkle root)

== Claim the asset ==
User -> "Single Asset Giveaway": Claim Asset (to, asset ids, asset values, proof, salt)
"Single Asset Giveaway" -> ClaimERC1155: Claim ERC1155 (to, asset ids, asset values, proof, salt)
```

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

ClaimERC1155 --|> AssetGiveaway
```

## References

1. ERC Token Standards : [https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token)

2. Merkle Tree : [https://solidity-by-example.org/app/merkle-tree/](https://solidity-by-example.org/app/merkle-tree/)